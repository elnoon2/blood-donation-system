# 07 — Code Quality Review

**Method:** Static review of the largest files, dead-code grep, dependency graph, error-handling patterns, test coverage measurement.

---

## 1. Dead code

### 1.1 Removed this session (zero-risk deletions)

| Path | Reason |
|------|--------|
| `Dockerfile.old` | Legacy template, not referenced anywhere, replaced by current `Dockerfile`. |
| `smart-blood-donation-system/` | Empty directory, no contents, no references in git history or documentation. |

### 1.2 Flagged for ASK-FIRST removal

| Path | Reason | Risk |
|------|--------|------|
| `static-version/` | Pre-React HTML mockups (index/login/register/about). Not served by Vite, not in routing, not referenced. | None — but may be intentionally kept as a demo fallback. |
| `compose.yaml` | Entirely templated/commented. Useless in current form. | Should be either rewritten as a real compose file or deleted. |
| `fix-and-run.bat` | Destructive force-kill + rebuild script. Useful for one developer; dangerous if run on a shared host. | Document or remove. |

### 1.3 Code-level dead code

| Location | Symbol | Notes |
|----------|--------|-------|
| `backend-spring/src/main/java/com/example/blooddonation/repository/RequestAuditRepository.java` (if it exists) | Entire repository | Referenced by `AdminController` deletes but **no entity class exists**. The deletes hit a non-existent table and silently fail via `continue-on-error`. Either build out the audit feature or drop the repo + delete statements. |
| `requests.verification_code` column | DB column | Unused by any current Java code. Probably a leftover from a verification-by-code flow that was superseded by QR. |
| `dto/QrPayloadDTO.timestamp` field | DTO field | Carried only to print to QR payload. The signed JWT already has `iat` / `exp`. Redundant. |
| `donor_health_assessments.do_you_agree_to_medical_review` column | DB column | Captured, persisted, never read. (Business-logic finding 5.4.) |

### 1.4 Likely-dead dependencies in `package.json`

Grep across [src/](../src/) shows **no imports** of:

| Dependency | Status |
|------------|--------|
| `@mui/material` | **No imports found.** Direct dependency only — safe to remove after running a build to confirm no plugin pulls it. |
| `@mui/icons-material` | No imports found. |
| `@emotion/react`, `@emotion/styled` | Only required transitively by MUI; remove with MUI. |
| `@popperjs/core` | Used by Radix internally but might be removable if MUI removed. |
| `react-popper` | No imports found. |
| `react-dnd`, `react-dnd-html5-backend` | No imports found. |
| `react-slick` | No imports found. |
| `react-responsive-masonry` | No imports found. |
| `embla-carousel-react` | No imports found (carousel.tsx in ui/ may re-export). |
| `vaul` | Possibly used by `drawer.tsx` UI primitive. |
| `cmdk` | Possibly used by `command.tsx`. |
| `react-day-picker` | Possibly used by `calendar.tsx`. |
| `input-otp` | Possibly used by `input-otp.tsx`. |
| `tw-animate-css` | Possibly used by Tailwind config. |

**Recommendation (ASK-FIRST):** before removing, run `vite build` after deletion for each. The cumulative dependency-tree savings are large (MUI + Emotion alone are ~300 KB minified-gzipped). Documented as a sequenced cleanup; not auto-applied.

### 1.5 Confirmed alive

- `next-themes` — initially flagged as dead, but [src/app/components/ui/sonner.tsx](../src/app/components/ui/sonner.tsx) uses `useTheme()` from it. Keep.

---

## 2. Large files / refactor candidates

| File | Lines | Reason |
|------|-------|--------|
| [src/app/pages/dashboard.tsx](../src/app/pages/dashboard.tsx) | 857 | Multi-role mega-component. State for 15+ concerns (notifications, stats, requests, donors, QR map, recommendations, geo, status, …). Should be split. |
| [backend-spring/src/main/java/com/example/blooddonation/controller/AdminController.java](../backend-spring/src/main/java/com/example/blooddonation/controller/AdminController.java) | ~305 | Contains business logic (cascade deletes via native SQL) that belongs in an `AdminService`. |
| [backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java](../backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java) | ~370 (post-fix) | OK for now but `acceptRequest` is dense; consider extracting `RequestStateMachine`. |
| [src/app/pages/verify-donation.tsx](../src/app/pages/verify-donation.tsx) | 442 | QR-decode + doctor-form + photo-upload + OTP — multiple responsibilities. |

### 2.1 Recommended dashboard.tsx split (ASK-FIRST)

Extract sub-components:
- `<DonorStatsHeader stats={…} />` — donations / lives saved / next eligible
- `<MyRequestsList requests={…} actions={…} />` — patient view of own requests
- `<CompatibleRequestsList requests={…} onAccept={…} />` — donor view of acceptable requests
- `<QrPanel requestId={...} token={...} />` — QR display + show/hide toggle
- `<RecommendedDonorsPanel requestId={...} donors={...} />` — admin/hospital recommendations
- `<NotificationDrawer notifications={...} />`

The state can stay in the page; sub-components take props + callbacks. This is mechanical refactoring; no behavior change. Not auto-applying because of the size and the risk of breaking the existing visual layout.

---

## 3. Maintainability issues

### 3.1 Native SQL in controllers (CRITICAL maintainability debt)

`AdminController.deleteUser/deleteRequest/deleteHospital` contain 25+ `entityManager.createNativeQuery(...)` calls. Every new entity added to the schema requires editing this controller. Already drifted (the `request_audits` table doesn't exist; the deletes are no-ops).

**Fix (ASK-FIRST):** extract to `AdminService.cascadeDelete(EntityType, id)`. Use JPA's cascade rules as the primary mechanism; the service only orchestrates the order and emits audit events.

### 3.2 `System.out.println` / `System.err.println` scattered

Fixed in Phase 3 for `AuthController`, `JwtUtils`, `AuthTokenFilter`. Still present in other places; grep finds these and they need migration to SLF4J:
- `DatabasePatcher.java` (config package — likely diagnostic prints)
- Various `e.printStackTrace()` call sites (need to be located via grep)

### 3.3 Boilerplate `@Autowired` field injection

Whole project uses field injection. Constructor injection is the Spring-recommended pattern (immutable, testable, no circular DI silently succeeding). Migration is mechanical: convert every `@Autowired private X x;` to a final field set via a Lombok `@RequiredArgsConstructor`.

### 3.4 Bare `.get()` on `Optional`

Found in `DonorController.getMyDonorProfile`, `DonorController.updateMyDonorProfile`, `DonorController.unregisterAsDonor`, etc.:
```java
User user = userRepository.findById(userDetails.getId()).get();
```
If the user was deleted mid-session (e.g. admin pruning), `.get()` throws `NoSuchElementException` → HTTP 500. Use `.orElseThrow(() -> new ResourceNotFoundException("…"))`.

### 3.5 `String` blood-types and statuses

Most domain values (blood type, governorate, urgency, availability) are strings. `RequestStatus`, `DonationStatus`, `Role`, `NotificationType`, `EligibilityResult`, `CollectionRequestStatus` are enums — good. The string-typed fields are vulnerable to typos and have no compile-time safety.

**Recommendation (ASK-FIRST):** add `BloodType` enum, `Governorate` enum (27 values), `AvailabilityStatus` enum, `UrgencyLevel` enum.

### 3.6 No null-checks on `Authentication.getPrincipal()`

Many controllers assume `auth.getPrincipal() instanceof UserDetailsImpl`. If a future filter swaps in a different principal type, an unchecked cast will throw. Refactor to a small helper:
```java
private UserDetailsImpl requirePrincipal(Authentication auth) {
    if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl p)) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    }
    return p;
}
```

### 3.7 Frontend `any` overuse

[src/app/pages/dashboard.tsx](../src/app/pages/dashboard.tsx) declares 5+ `useState<any[]>` and `Record<number, any>`. The Axios client returns untyped `response.data`. Easy fix: declare API response types in `src/types/api.ts` and use them consistently.

### 3.8 No backend tests, no frontend tests

`pom.xml` declares `spring-boot-starter-test` + `spring-security-test`. Zero tests written. `package.json` has no test runner. Zero test coverage.

**Recommendation:** ship minimum-viable unit tests in this priority order:
1. `BloodCompatibilityUtil.canDonate(...)` — pure function, 8×8 truth table.
2. `EligibilityService.evaluateAndSaveAssessment(...)` — pure function with branching.
3. `QRService.generateOrReuseSignedQrPayload` — token reuse correctness.
4. `DonationService.acceptRequest` — race-condition regression test (use `@Sql` + concurrent calls).
5. `AuthController.authenticateUser` integration test confirming the master-key login is **gone**.

A starter test suite of ~15 tests would meaningfully reduce regression risk.

---

## 4. Readability nitpicks

- `request.setStatus(RequestStatus.valueOf(status.toUpperCase()))` is now wrapped (Phase 3 fix). Was a 500 magnet.
- `BloodCompatibilityUtil` enums vs. strings: list of donors that can give to recipient — fine.
- Magic numbers: `QR_TOKEN_VALIDITY_HOURS = 24`, `MIN_SECRET_BYTES_HS512 = 64`, `safeLimit = Math.max(1, Math.min(limit, 50))` — extracted constants would help.
- `@JsonIgnore` on `User.password` — present, good (Phase 3 verified).
- `User.hospital` is EAGER (perf finding §1.2). The controller `AdminController.getAllDonors` line 91-95 has an explicit `d.getUser().getName()` "touch" to dodge `LazyInitializationException`. Once §1.2 is fixed, delete that hack.

---

## 5. Frontend specifics

### 5.1 Token in URL query parameter (verify-donation.tsx)

Already noted in security audit (V4-x and §1.x). Moving to POST body is **ASK-FIRST** because it changes the QR-URL contract.

### 5.2 STOMP debug logging

[src/app/context/ChatContext.tsx:51](../src/app/context/ChatContext.tsx#L51):
```js
debug: (str) => console.log('STOMP: ' + str),
```
Should be conditioned:
```js
debug: import.meta.env.PROD ? () => {} : (str) => console.log('STOMP:', str),
```

### 5.3 No error boundaries

No `<ErrorBoundary>` in the React tree. An uncaught render error blanks the page. React Router v7 has loader-level error handling but no global `errorElement` defined on the root. Add one.

### 5.4 Toast usage inconsistent

Some code paths `toast.success(...)`, some `console.log(...)`, some return values silently. Standardize on Sonner.

---

## 6. JJWT 0.11.5 → 0.12.x upgrade (deferred)

The version bump was in the Phase 3 plan. **Deferred and re-flagged here** because:
- 0.12.x renames `parserBuilder().setSigningKey(key).build()` → `parser().verifyWith(key).build()`.
- `signWith(key, SignatureAlgorithm.HS512)` → `signWith(key, Jwts.SIG.HS512)`.
- `setSubject` / `setIssuedAt` / `setExpiration` → `subject` / `issuedAt` / `expiration`.
- `parseClaimsJws` → `parseSignedClaims`; `getBody()` → `getPayload()`.

Touches [JwtUtils.java](../backend-spring/src/main/java/com/example/blooddonation/security/JwtUtils.java) and [QRService.java](../backend-spring/src/main/java/com/example/blooddonation/service/QRService.java). Mechanical but pervasive. Bundling it with the security pass risked masking a regression in QR token signature behavior. Recommended as a dedicated PR with tests added first (see §3.8 #3).

---

## 7. Scoring summary (input to Phase 8)

| Dimension | Pre-audit | Post-audit | Reason |
|-----------|-----------|------------|--------|
| Maintainability | 4/10 | 5/10 | Dead files removed, SLF4J introduced, fail-fast added, but native SQL controllers and field injection unchanged. |
| Testability | 1/10 | 1/10 | Still zero tests. Code shape is testable; nobody's tested it. |
| Readability | 5/10 | 5/10 | Slight improvement from logger introduction; mega-components remain. |
| Architectural cleanliness | 4/10 | 5/10 | Auth flow tightened; cascade-delete pattern unchanged. |

---

## 8. Auto-fixes applied this phase

1. Deleted `Dockerfile.old`.
2. Removed empty `smart-blood-donation-system/` directory.

## 9. Deferred (ASK-FIRST)

1. `dashboard.tsx` split into 6 sub-components.
2. `AdminController` cascade delete → `AdminService`.
3. Constructor injection migration.
4. `BloodType` / `Governorate` / `AvailabilityStatus` / `UrgencyLevel` enums.
5. MUI removal (after build verification per-dep).
6. JJWT 0.11.5 → 0.12.x upgrade.
7. Frontend `any` → typed API responses.
8. Test suite bootstrap.
9. `static-version/`, `fix-and-run.bat`, `compose.yaml` cleanup decisions.
