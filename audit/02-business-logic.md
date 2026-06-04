# 02 — Business Logic Review

**Method:** Deep-read of the seven non-trivial flows powering the application. Each section gives current behavior, the bugs and race conditions actually present in the code, and a recommended change with a **change-class** tag (`AUTO-FIX-OK` = unambiguous correctness fix, `ASK-FIRST` = behavioral change that needs sign-off).

---

## 1. Authentication & Registration

### Flow

[AuthController.authenticateUser](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java#L49-L69):

1. **First check: master-key bypass** — if email equals `nourelkassyamin15@gmail.com` and password equals `nour1234`, immediately mint a JWT with `userId=1`, `name=Nour Admin`, role `ROLE_ADMIN`, and return — **no DB lookup, no password hash compare**.
2. Otherwise delegate to `AuthenticationManager` → `UserDetailsServiceImpl.loadUserByUsername` → BCrypt match.

[AuthController.registerUser](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java#L71-L129):

1. Reject duplicate email.
2. Parse role from string (case-insensitive).
3. Block role `ADMIN`.
4. Create `User`, set `isApproved = (role != HOSPITAL)`.
5. If `DONOR`, create a `Donor` row too. If `HOSPITAL`, require `hospitalId` and link it.

### Defects

| # | Severity | Defect | Evidence |
|---|----------|--------|----------|
| 1.1 | **Critical** | Hardcoded backdoor bypasses auth entirely. JWT minted for `userId=1` regardless of whether user 1 is the actual admin in the DB — could grant access to **any** user occupying ID 1, or to a non-existent user with no DB rows. | [AuthController.java:51-54](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java#L51-L54) |
| 1.2 | High | No email verification on registration; account can be activated immediately for any address. Trivial enumeration of registered emails via the "Email already in use" response. | [AuthController.java:76-79](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java#L76-L79) |
| 1.3 | High | No password complexity, length, or breach-corpus check. `@Valid` on `LoginRequest`/`RegisterRequest` is unconstrained on password. | DTOs not enforcing `@Size`/`@Pattern` |
| 1.4 | Medium | PII (email, role) logged via `System.out.println` on every registration attempt — likely indexed by any log aggregator. | [AuthController.java:74,77,113,121](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java#L74) |
| 1.5 | Medium | No rate limiting on `/login` → unlimited credential stuffing. | All controllers |
| 1.6 | Medium | `@CrossOrigin(origins = "*")` on `AuthController` overrides the global CORS allowlist for auth endpoints. | [AuthController.java:26](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java#L26) |
| 1.7 | Low | `userRepository.findById(...)` on `/me` returns the full entity including the BCrypt password hash, since `User` has no `@JsonIgnore` on `password`. (To confirm: check `User.java`.) | [AuthController.java:143](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java#L143) |

### Recommendation

- **AUTO-FIX-OK** — delete the master-key block (Phase 3 will execute).
- **AUTO-FIX-OK** — wrap registration `println`s in a logger and strip email PII (Phase 7).
- **AUTO-FIX-OK** — remove `@CrossOrigin("*")` from `AuthController` (Phase 3).
- **ASK-FIRST** — add email verification (out-of-scope for a single pass; documented as roadmap).
- **ASK-FIRST** — password policy + rate limiting.

---

## 2. Blood-request creation

### Flow

[DonationService.createRequest](../backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java#L55-L96):

1. Reject if patient already has any request in `{PENDING, ACCEPTED, IN_PROGRESS}`.
2. Validate `bagsNeeded > 0`, `hospitalId != null`.
3. Fetch hospital.
4. Build `Request` with `status=PENDING`, save.
5. Call `notifyCompatibleDonors(request)`.

`notifyCompatibleDonors`:

1. Look up compatible donor blood types (`BloodCompatibilityUtil.getCompatibleDonorTypes`).
2. Query donors by `blood_type IN (...)` AND `governorate ILIKE`.
3. For each donor: skip if `availabilityStatus != "AVAILABLE"`, skip if `lastDonationDate` within 3 months.
4. Otherwise call `createNotificationIfNotDuplicate` + WebSocket push to `/topic/notifications/{donorId}`.
5. Send the patient a "we notified N donors" notification.

### Defects

| # | Severity | Defect |
|---|----------|--------|
| 2.1 | Medium | "Only one active request per patient" is hardcoded. A real patient may have legitimate concurrent needs (multiple blood products for major surgery, ongoing chronic treatment + acute event). |
| 2.2 | Medium | No validation that `bloodType` is one of the eight valid ABO/Rh values. A typo like `"O"` (no sign) becomes a request that no donor can ever accept. |
| 2.3 | Medium | `notifyCompatibleDonors` filters by **exact governorate** — donors in adjacent governorates near a border are excluded even when geographically closer than donors deep within the same governorate. |
| 2.4 | Medium | Hospital staff are **not** notified when a request comes in. They have no in-app awareness of incoming requests for blood units they may need to prepare. |
| 2.5 | Low | If zero compatible donors exist, the patient gets "we notified 0 donors" but no escalation, no fallback (e.g. surface blood-bank inventory query). |
| 2.6 | Low | The WebSocket push is best-effort (wrapped in `try { ... } catch (Exception ignored) {}`). Real failures are silent. |
| 2.7 | Low | `quantityNeeded` defaults to `bagsNeeded` when null — duplicated field with no clear semantic difference. |

### Recommendation

- **ASK-FIRST** — allow multiple active requests per patient (could be policy decision).
- **AUTO-FIX-OK** — validate `bloodType` against an enum.
- **ASK-FIRST** — geo-radius matching (requires schema change to compute distance; current `requesterLatitude/Longitude` is captured but unused for matching).
- **AUTO-FIX-OK** — notify hospital users (`role=HOSPITAL`, `user.hospital.id == request.hospital.id`) as `REQUEST` notification.
- **ASK-FIRST** — collapse `quantityNeeded`/`bagsNeeded`.

---

## 3. Donor accepts a request — **race condition**

### Flow

[DonationService.acceptRequest](../backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java#L131-L187):

1. Load request.
2. Reject if `status ∈ {COMPLETED, CANCELLED, REJECTED}`.
3. Check `BloodCompatibilityUtil.canDonate(donor.bloodType, request.bloodType)`.
4. Load donor; reject if `lastDonationDate` within 3 months.
5. Reject if `matchedDonor` exists, is a different user, AND `status != PENDING`.
6. If junction row `(donor, request)` doesn't exist:
   - Insert `DonorRequest` (this junction has `UNIQUE(donor_id, request_id)`).
   - Set `matchedDonor`, `status=ACCEPTED`, increment `confirmedDonors`.
7. Generate/reuse QR token.
8. Set `status=IN_PROGRESS`.
9. Notify the patient.

### Defects

| # | Severity | Defect |
|---|----------|--------|
| 3.1 | **High — race condition** | Two donors calling `acceptRequest` simultaneously on the same PENDING request can both pass step 5 (the matchedDonor check requires status != PENDING). Both insert distinct `DonorRequest` rows (unique constraint is on `(donor_id, request_id)`, which differs for different donors). Both then issue `request.setMatchedDonor(...)`; whichever transaction commits last wins, but the loser's `DonorRequest` row persists, leaving the loser believing they're matched and generating a QR that will never validate. |
| 3.2 | High | `request.setStatus(IN_PROGRESS)` at line 175 happens **outside** the `if (!exists)` branch. Repeated calls by an already-matched donor will overwrite ACCEPTED with IN_PROGRESS even if no donation happened — distorts state machine. |
| 3.3 | Medium | No enforcement that the donor is `AVAILABLE`. The notifyCompatibleDonors path filters by availability, but a donor who marks themselves `BUSY` can still hit `/accept` directly via the API. |
| 3.4 | Medium | `confirmedDonors` is incremented but never decremented anywhere. If a donor cancels (no path exists for that, but if added), the counter drifts. |
| 3.5 | Medium | The 3-month wait is checked here at accept time and again in `completeDonationWithQr` (donor stats update), but **not** at request-creation time (donors get notifications even when ineligible — already filtered, see 2.x). Acceptable but worth tightening. |
| 3.6 | Low | `SecurityException` is used for business-logic rejections (e.g. "not compatible") — those should be `IllegalStateException` / `ResponseStatusException`. Spring will return 500 instead of 4xx. |

### Recommendation

- **ASK-FIRST** — fix race condition with `SELECT … FOR UPDATE` on the request row (`@Lock(LockModeType.PESSIMISTIC_WRITE)` on a custom repo method) OR add `@Version` to `Request` and retry on `OptimisticLockException`. Both are correct; pessimistic is simpler for low-throughput; optimistic is friendlier under load.
- **AUTO-FIX-OK** — move `setStatus(IN_PROGRESS)` inside the `if` block so repeated calls are idempotent.
- **AUTO-FIX-OK** — reject if `donor.availabilityStatus != "AVAILABLE"`.
- **AUTO-FIX-OK** — replace `SecurityException` with `org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT, ...)`.

---

## 4. QR generation & verification — **race condition + inventory bug + PII leak**

### Flow

[QRService.generateOrReuseSignedQrPayload](../backend-spring/src/main/java/com/example/blooddonation/service/QRService.java#L48-L90):

1. Look for an existing un-used, un-expired token for `(requestId, donorId)`.
2. If found, reuse it.
3. Otherwise mark all stale tokens as used, mint a new JWT-HS512 signed token (claims: requestId, donorId, patientId, hospitalId, timestamp; 24-hour expiry), persist a `QRVerificationToken` row.

[QRService.validateAndConsumeToken](../backend-spring/src/main/java/com/example/blooddonation/service/QRService.java#L104-L145):

1. Require `actingUser.role ∈ {HOSPITAL, ADMIN}`.
2. Parse JWT claims (validates signature + expiry).
3. Load token row by token string.
4. Reject if already used or expired-in-DB.
5. Cross-check claims against persisted row (requestId, donorId, patientId, hospitalId).
6. If HOSPITAL: hospital ID must match acting user's hospital.
7. Set `isUsed=true`, `usedAt=now`, save.

[DonationService.completeDonationWithQr](../backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java#L209-L270):

1. Consume token (above).
2. Set request status `COMPLETED`, `patientConfirmed=true`, `donorConfirmed=true`.
3. Update donor `lastDonationDate`, increment `totalDonations`.
4. Insert a `Donation` row.
5. Insert a `DonationHistory` row.
6. Notify donor and patient.

[QRVerificationController.validateToken](../backend-spring/src/main/java/com/example/blooddonation/controller/QRVerificationController.java#L82-L105) — **permitAll** (no auth at all):

- Parses the token, returns `{valid, requestId, donorId, patientId, hospitalId, timestamp, donorName, patientName}`.

[QRVerificationController.submitVerification](../backend-spring/src/main/java/com/example/blooddonation/controller/QRVerificationController.java#L107-L133):

- Validates token freshness, then **falls back to the donor as actingUser** if no auth is present (line 128-131). However `validateAndConsumeToken` would reject this because donor role isn't HOSPITAL/ADMIN — so the fallback is effectively dead code, but the intent looks like impersonation by design.

### Defects

| # | Severity | Defect |
|---|----------|--------|
| 4.1 | **Critical** | `/api/verify-donation/validate` is fully public and leaks donor name, patient name, and the resolved IDs to anyone with a token string. A QR code briefly displayed on a donor's phone (e.g., shared via screenshot) reveals the patient identity to the screenshot-taker. |
| 4.2 | **High — race condition** | Two parallel POSTs to `/submit` with the same valid token: both pass the `isUsed=false` check, both reach `completeDonationWithQr`, both increment the donor's `totalDonations`, both insert separate `Donation` and `DonationHistory` rows. There is no `SELECT … FOR UPDATE` on the token row and no DB-level constraint preventing the dual completion. |
| 4.3 | **High — inventory bug** | `completeDonationWithQr` inserts a `Donation` row but does **not** update `BloodInventory`. The manual path in `DonationController.createDonation` does increment inventory. Result: QR-verified donations (the intended primary path) silently do not stock the hospital's blood bank, while the deprecated manual path does. |
| 4.4 | Medium | The fallback "use donor as acting user" path is dead but confusing and looks like a designed impersonation hole. A reader can't tell intent. |
| 4.5 | Medium | `generateOrReuseSignedQrPayload` is `@Transactional`. If two parallel calls happen, both find no active token, both mint a new one, both save — the JWT itself is unique (different timestamps in claims and JJWT random IV behavior, though HS512 is deterministic given identical input — so timestamps make them unique). The first commit wins on stale-token marking, the second creates a duplicate active token. Not severe (both are valid for the same donor/request) but wastes rows. |
| 4.6 | Low | `parseTokenClaims` is called in `validateToken` (public endpoint) before checking auth — token-parsing exceptions could be probed. Low impact (signature errors don't reveal the key). |
| 4.7 | Low | Token includes a `timestamp` claim using `LocalDateTime.toString()` (no timezone). Inconsistent with the `iat`/`exp` (epoch UTC). Cosmetic. |
| 4.8 | Low | QR token is delivered via URL query parameter on the frontend ([dashboard.tsx:628](../src/app/pages/dashboard.tsx#L628), [verify-donation.tsx:61](../src/app/pages/verify-donation.tsx#L61)) — leaks via Referer/server logs/history. |

### Recommendation

- **AUTO-FIX-OK (Phase 3)** — require auth on `/validate`; restrict response to `{valid: boolean, expiresAt}` only.
- **ASK-FIRST** — fix race 4.2 with pessimistic lock on the token row inside `validateAndConsumeToken`.
- **AUTO-FIX-OK (Phase 3)** — fix 4.3 by adding inventory increment to `completeDonationWithQr`. This is a clear bug, not behavioral change.
- **AUTO-FIX-OK** — delete the donor-as-actingUser fallback in `submitVerification`.
- **ASK-FIRST** — moving QR token from URL to POST body (4.8) is a UX change for the donor-shows-QR flow; depends on whether the hospital scans the QR or follows the link.

---

## 5. Eligibility assessment — non-enforcing

### Flow

[EligibilityService.evaluateAndSaveAssessment](../backend-spring/src/main/java/com/example/blooddonation/service/EligibilityService.java#L34-L147):

A long else-if chain that sets `result ∈ {ELIGIBLE, TEMPORARILY_INELIGIBLE, INELIGIBLE, NEEDS_REVIEW}` based on the first matching condition, then persists the full questionnaire to `donor_health_assessments`.

### Defects

| # | Severity | Defect |
|---|----------|--------|
| 5.1 | **High** | Assessment is **informational only**. A donor declared `INELIGIBLE` (e.g. hepatitis) can immediately call `/api/requests/{id}/accept` and become matched. The system does not gate `acceptRequest` on a recent ELIGIBLE assessment. |
| 5.2 | Medium | First-match-wins via if-else: a donor with age 17 AND fever AND chronic disease sees only "age out of range" as the reason. Reasons should accumulate. |
| 5.3 | Medium | Hepatitis is hard-ineligible — but in reality some hepatitis subtypes have resolution criteria. This is policy; flagging only. |
| 5.4 | Medium | `doYouAgreeToMedicalReview` is collected but never read. Should gate `NEEDS_REVIEW` decisions. |
| 5.5 | Low | No expiry on assessment. A 5-year-old "eligible" assessment is treated identically to one taken this morning. Real blood services re-screen every donation. |
| 5.6 | Low | The assessment is anonymous if `donorId` is `null` — no link to a user. This is intentional (public eligibility check before signing up) but means malicious assessments can be created without any record. |

### Recommendation

- **ASK-FIRST** — gate `acceptRequest` on a recent (last 30 days) `ELIGIBLE` or `NEEDS_REVIEW` assessment.
- **AUTO-FIX-OK** — refactor the decision into an accumulator that returns the *worst* result and all reasons.
- **ASK-FIRST** — assessment expiry policy.

---

## 6. Cascade-delete chain (admin → user/request/hospital deletes)

### Flow

[AdminController.deleteUser](../backend-spring/src/main/java/com/example/blooddonation/controller/AdminController.java#L147-L210) issues a fixed sequence of native SQL DELETEs across 11 tables in a single transaction, then deletes the user row. Similar patterns for `deleteRequest` and `deleteHospital`.

### Defects

| # | Severity | Defect |
|---|----------|--------|
| 6.1 | **High** | The schema itself has `ON DELETE CASCADE` on most of these FKs already ([oracle-schema](../backend-spring/src/main/resources/oracle-schema)). The native DELETEs duplicate work the DB would do, and the **order** has to match the FK graph or it errors. Any new table added to the schema without updating this controller silently violates referential integrity. |
| 6.2 | High | This logic lives in a **controller**, not a service. Business logic in a `@RestController`. |
| 6.3 | High | Hard delete erases medical records — donation_history, donation_verifications, qr_verification_tokens. For a real medical app this fails any audit/compliance review (GDPR Article 17 "right to be forgotten" still requires retaining medical records, often with subject erased). |
| 6.4 | Medium | `request_audits` table is referenced (lines 191, 195) but the corresponding `RequestAudit` entity class doesn't exist — only the repository. The deletes will fail on a schema that doesn't include this table, or succeed with no-op. |
| 6.5 | Medium | No idempotency check. Calling `DELETE /users/{id}` twice on the same id returns 404 the second time (good) but if the first call partially fails, retry on the second call may leave dangling rows because the user is already gone. |
| 6.6 | Low | `deleteRequest` does not check that the calling admin is allowed to delete a specific request (e.g. cross-hospital). Admin role is god-mode; no scoping. |

### Recommendation

- **ASK-FIRST** — extract delete logic into `AdminService`, drive cascades via JPA `cascade=REMOVE` + schema cascades, drop the native query list.
- **ASK-FIRST** — switch to **soft delete** for users and medical records (`deleted_at` column + global `@SQLDelete`/`@Where`). Keeps audit trail intact.
- **AUTO-FIX-OK (Phase 7 cleanup)** — create the missing `RequestAudit` entity OR remove the stale repository + DELETE statements.

---

## 7. Status transitions are unbounded

### Flow

[AdminController.updateRequestStatus](../backend-spring/src/main/java/com/example/blooddonation/controller/AdminController.java#L276-L285) accepts any `?status=` query parameter and parses it into a `RequestStatus` enum. No transition validation.

### Defects

| # | Severity | Defect |
|---|----------|--------|
| 7.1 | High | An admin can move `COMPLETED → PENDING`, `REJECTED → COMPLETED`, `CANCELLED → IN_PROGRESS`. There is no state machine. Donation history rows that reference the original status are not updated. |
| 7.2 | Medium | The frontend `RequestController.updateStatus` (patient path) also doesn't enforce transitions for patient self-cancel — patient can re-open a CANCELLED request by re-PATCHing. |
| 7.3 | Low | `RequestStatus.valueOf(status.toUpperCase())` throws `IllegalArgumentException` (HTTP 500) for unknown values instead of 400. |

### Recommendation

- **ASK-FIRST** — introduce a transition matrix:
  ```
  PENDING → {ACCEPTED, CANCELLED, REJECTED}
  ACCEPTED → {IN_PROGRESS, CANCELLED}
  IN_PROGRESS → {COMPLETED, CANCELLED}
  COMPLETED → ∅
  CANCELLED → ∅
  REJECTED → ∅
  ```
  Reject any other transition with HTTP 409.

---

## 8. Notification dedupe & role filtering

### Flow

[NotificationService.createNotificationIfNotDuplicate](../backend-spring/src/main/java/com/example/blooddonation/service/NotificationService.java#L68-L91) — 5-minute window on identical `(userId, message, type)`.

[NotificationService.getMyNotifications](../backend-spring/src/main/java/com/example/blooddonation/service/NotificationService.java#L26-L41) — fetches 100, filters by allowed types per role, limits to caller's `limit`.

### Defects

| # | Severity | Defect |
|---|----------|--------|
| 8.1 | Medium | "Fetch 100 then filter then limit" — if the user has 100 system notifications and the desired type is `MATCH`, the call returns zero results even though older matches exist. **Filter in the DB**. |
| 8.2 | Low | `markAllAsRead` and `clearAll` rely on caller passing the right user ID. Both controllers resolve from `Authentication`, so safe — but worth a final-vs-recommended doc. |

### Recommendation

- **AUTO-FIX-OK** — push the role-based type filter into the repository query (Phase 4).

---

## 9. Donor self-service (DonorController.unregister-me)

Donor can revert to PATIENT via `DELETE /api/donors/unregister-me`. There is no check for pending accepted requests. Result: a request can have `matchedDonor` pointing to a user whose role is now PATIENT, making subsequent QR generation/donation flows ambiguous.

**Recommendation:** **AUTO-FIX-OK** — reject unregister if the donor has any request in `{ACCEPTED, IN_PROGRESS}`.

---

## 10. Cross-cutting business-logic findings

| # | Theme | Finding |
|---|-------|---------|
| 10.1 | **No state machine** | Request and Donation lifecycles depend on conventions enforced (or not) at each call site. |
| 10.2 | **No locking** | All write-paths assume no concurrent callers. Real-world traffic (push notification → "Accept" button mash) will produce duplicate matches. |
| 10.3 | **No reservation** | Accepting a request doesn't reserve the donor; donor could be matched to multiple PENDING requests concurrently across governorates. |
| 10.4 | **Eligibility decoupled from operations** | The most important business rule (donor health) is collected but never enforced. |
| 10.5 | **Inventory split-brain** | Two donation paths exist (manual + QR) but only the manual path updates inventory. The "preferred" QR path leaves the blood bank balance out of sync. |
| 10.6 | **Cascade duplication** | Schema-level cascades + controller-level native deletes both exist. Maintenance burden + correctness risk. |
| 10.7 | **No outbox / no retry** | WebSocket pushes and notifications are best-effort with silenced exceptions. Lost notifications cannot be re-delivered. |
| 10.8 | **No audit log** | Admin actions are inserted only in `admin_actions` if explicitly written; deletes/edits leave no record. |

---

## 11. Auto-fix list (in scope for Phase 3/4/7)

Per the master prompt's "Critical/High auto-fix without asking" rule, these are unambiguous correctness fixes that will be made:

- [ ] Delete master-key login block (Phase 3).
- [ ] Remove `@CrossOrigin("*")` on `AuthController` (Phase 3).
- [ ] Restrict `/api/verify-donation/validate` to authenticated callers with minimal response (Phase 3).
- [ ] Update `BloodInventory` in `completeDonationWithQr` (Phase 3 — inventory split-brain bug).
- [ ] Move `setStatus(IN_PROGRESS)` inside the `if (!exists)` guard in `acceptRequest` (Phase 3).
- [ ] Reject `acceptRequest` if donor.availabilityStatus != "AVAILABLE" (Phase 3).
- [ ] Reject `unregister-me` if donor has ACCEPTED/IN_PROGRESS requests (Phase 3).
- [ ] Delete the donor-as-actingUser fallback in `QRVerificationController.submitVerification` (Phase 3).
- [ ] Replace `System.out.println` + `System.err.println` debug noise with SLF4J `log.debug` w/o PII (Phase 7).
- [ ] Push notification role filter into DB query (Phase 4).
- [ ] Reject unknown `RequestStatus` strings with 400 not 500 (Phase 3).

## 12. Ask-first list (sign-off required)

These are noted in `audit/00-executive-summary.md` Pending Decisions section:

- Race conditions 3.1 and 4.2 — pessimistic-lock vs `@Version` strategy.
- Status transition matrix (which transitions are admin-only? which are donor/patient-initiable?).
- Soft delete strategy + medical-record retention.
- Eligibility-assessment enforcement on `acceptRequest`.
- Multiple active requests per patient.
- Geo-radius matching using captured lat/long.
- Hospital notifications on new requests.
- QR-token-in-URL vs POST body.
- Password policy + email verification + rate limiting.
