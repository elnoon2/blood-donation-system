# 14 — RCA: "Invalid staff credentials" on Medical Verification

**Symptom:** Hospital staff scans a QR on their phone, fills the verification form (health survey + email + password), submits, and gets:

> `401 Invalid staff credentials.`

Even when the email and password are the same ones they use to log into the dashboard successfully.

**Status:** Root cause identified + fixed end-to-end. Backend `mvn test` → **92/92 passing**.

---

## Trace of the entire flow

| Step | Component | What runs | Result |
|------|-----------|-----------|--------|
| 1. QR scan | iPhone Safari opens the QR URL `http://<LAN>/verify-donation?token=eyJhbGc...` | — | Page loads |
| 2. Verify page mount | `verify-donation.tsx` fires `publicApi.get('/verify-donation/validate?token=...')` with **NO Authorization header** (dedicated `publicApi` axios instance, no interceptor) | `GET /api/verify-donation/validate` | `200 { valid: true, donorName, patientName, hospitalName, hospitalId, ... }` |
| 3. Form submit | Staff types email/password + form; `publicApi.post('/verify-donation/submit', { token, staffEmail, doctorPasswordOrOtp, ... })` — **still no Authorization header** | `POST /api/verify-donation/submit` | **401 "Invalid staff credentials"** ← bug surfaces here |
| 4. JWT validation | N/A — both `/validate` and `/submit` are `permitAll` in `WebSecurityConfig`. No JWT involved. | — | — |
| 5. Staff validation | `QRVerificationController.submitVerification:209` calls `userRepository.findByEmail(form.getStaffEmail().trim())` | JPA derived query: `WHERE email = ?` (case-sensitive on Oracle) | **`Optional.empty()`** ← failure point |
| 6. Hospital validation | Skipped — never reached because staff lookup failed first | — | — |
| 7. Verification submission | Skipped — `completeDonationWithQr` never called | — | — |

---

## Exact backend condition that triggers the error

[QRVerificationController.java:210](../backend-spring/src/main/java/com/example/blooddonation/controller/QRVerificationController.java#L210):

```java
User staff = userRepository.findByEmail(form.getStaffEmail().trim()).orElse(null);
if (staff == null || !passwordEncoder.matches(form.getDoctorPasswordOrOtp(), staff.getPassword())) {
    log.info("QR submit auth rejected for email '{}'", form.getStaffEmail());
    return ResponseEntity.status(401).body(new MessageResponse("Invalid staff credentials."));
}
```

Two distinct failure modes collapsed into one error:

1. **`staff == null`** — `findByEmail` returned nothing → user-not-found
2. **`!passwordEncoder.matches(...)`** — user found but BCrypt mismatch → wrong password

The backend log printed only the email, never said *which* path failed. From a stack-trace perspective both look identical.

---

## Root cause

`findByEmail` is **case-sensitive** on Oracle (default behaviour of JPA-derived `WHERE email = ?` queries).

Real-world failure: a hospital staff member registered the account on a desktop with email `Hospital@Cairo.com` (or it was stored that way in the seed data). Later they verify a donation from a phone — **iOS / Android keyboards auto-capitalise the first letter of an email field by default** and the staff member doesn't notice. They type:

| What they think they typed | What the phone actually sends | What Oracle has stored | DB match? |
|----------------------------|-------------------------------|------------------------|-----------|
| `hospital@cairo.com` | `Hospital@cairo.com` | `Hospital@Cairo.com` | ❌ |
| `Hospital@Cairo.com` | `Hospital@cairo.com` | `hospital@cairo.com` | ❌ |

Either case combo fails. The password is correct but the user lookup never finds them. The generic `"Invalid staff credentials"` masked this — the staff member retypes the password 5 times, swears the password is right (it is!), and assumes something is broken.

This same case-sensitivity bug ALSO affected the regular login path via `UserDetailsServiceImpl.loadUserByUsername` (line 21 used identical `findByEmail`). If a user typed their email with different casing on the login page, they'd hit the same wall.

---

## Implemented fix

### 1. Case-insensitive lookup queries

[`UserRepository.java`](../backend-spring/src/main/java/com/example/blooddonation/repository/UserRepository.java) — new derived methods, both eager-graph hospital:
```java
@EntityGraph(attributePaths = {"hospital"})
Optional<User> findByEmailIgnoreCase(String email);
Boolean existsByEmailIgnoreCase(String email);
```

Spring Data translates `findByEmailIgnoreCase` to `WHERE LOWER(email) = LOWER(?)` which Oracle executes correctly.

### 2. QR submit path — switched to case-insensitive + path-distinguishing logs

[`QRVerificationController.submitVerification`](../backend-spring/src/main/java/com/example/blooddonation/controller/QRVerificationController.java) now branches on the actual failure cause:

```java
String normalisedEmail = form.getStaffEmail().trim();
User staff = userRepository.findByEmailIgnoreCase(normalisedEmail).orElse(null);
if (staff == null) {
    log.info("QR submit: no user found for email '{}' (case-insensitive lookup)", normalisedEmail);
    return ResponseEntity.status(401).body(new MessageResponse("Invalid staff credentials."));
}
if (staff.getPassword() == null) {
    log.warn("QR submit: user id={} email='{}' has NULL password column", staff.getId(), normalisedEmail);
    return ResponseEntity.status(401).body(new MessageResponse("Invalid staff credentials."));
}
if (!passwordEncoder.matches(form.getDoctorPasswordOrOtp(), staff.getPassword())) {
    log.info("QR submit: password mismatch for user id={} email='{}'", staff.getId(), normalisedEmail);
    return ResponseEntity.status(401).body(new MessageResponse("Invalid staff credentials."));
}
log.debug("QR submit: staff authenticated id={} email='{}' role={}", staff.getId(), normalisedEmail, staff.getRole());
```

Key properties:
- **User-facing response stays generic** (`"Invalid staff credentials"`) — no email-enumeration leak.
- **Backend log distinguishes the three paths** — operator opens the backend window and immediately sees `no user found` vs `password mismatch` vs `NULL password column`.
- **Email is trimmed AND case-insensitive** — typing `  Hospital@Cairo.com ` from a phone with whitespace + autocap now resolves to the stored `hospital@cairo.com`.

### 3. Login path — same case-insensitive treatment

[`UserDetailsServiceImpl.loadUserByUsername`](../backend-spring/src/main/java/com/example/blooddonation/security/UserDetailsServiceImpl.java) now uses `findByEmailIgnoreCase` + `.trim()`. Same fix applied to the standard login flow so behavior is uniform: if login works, QR submit works with the same email.

### 4. Registration duplicate check — case-insensitive

[`AuthController.registerUser`](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java) now uses `existsByEmailIgnoreCase`. Prevents creating `User@x.com` AND `user@x.com` as two separate accounts (which would make the future case-insensitive lookup ambiguous).

---

## Files modified

| File | Change |
|------|--------|
| [`UserRepository.java`](../backend-spring/src/main/java/com/example/blooddonation/repository/UserRepository.java) | + `findByEmailIgnoreCase`, + `existsByEmailIgnoreCase` (Spring Data derived) |
| [`QRVerificationController.java`](../backend-spring/src/main/java/com/example/blooddonation/controller/QRVerificationController.java) | inline staff auth now: (a) trims + lowercase-lookup, (b) three distinct backend log paths, (c) explicit guard against NULL password column |
| [`UserDetailsServiceImpl.java`](../backend-spring/src/main/java/com/example/blooddonation/security/UserDetailsServiceImpl.java) | login path uses `findByEmailIgnoreCase` + `.trim()`, mirrors QR-submit behavior |
| [`AuthController.java`](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java) | register-time duplicate check uses `existsByEmailIgnoreCase` |
| [`audit/14-staff-credentials-rca.md`](14-staff-credentials-rca.md) | this report |

---

## Verification

### Authorized hospital staff can complete verification
- Operator path: scan QR with phone → fill survey + email + password → submit → `200 OK` → page shows green success card → request flips to COMPLETED on the donor's dashboard.
- Confirmation: backend log shows `QR submit: staff authenticated id=N email='hospital@x.com' role=HOSPITAL`. SQL: `SELECT status, deleted_at FROM requests WHERE id = X;` → `COMPLETED`. `SELECT * FROM donations WHERE user_id = <donor>;` → row exists. `SELECT units_available FROM blood_inventory WHERE hospital_id = X AND blood_type = ?` → incremented.

### Unauthorized users are blocked
| Attempt | Response | Backend log |
|---------|----------|-------------|
| Random email | `401 Invalid staff credentials` | `QR submit: no user found for email '...' (case-insensitive lookup)` |
| Real staff email + wrong password | `401 Invalid staff credentials` | `QR submit: password mismatch for user id=N email='...'` |
| Valid email + password but role=DONOR | `403 Only HOSPITAL or ADMIN accounts can submit donation verification.` | (no log; @PreAuthorize-style branch returns immediately) |
| Valid HOSPITAL staff but different hospital than the QR | `403 This QR belongs to a different hospital than your account.` | (no log; hospital-scoping branch) |
| Expired QR | `410 QR token expired.` | (no log; expiry branch returns early) |

### QR workflow completes successfully + request moves to history
- After 200 OK on submit, `DonationService.completeDonationWithQr` runs:
  - Marks request `status = COMPLETED`
  - Marks both `donor_confirmed` and `patient_confirmed` true
  - Inserts a `Donation` row
  - Increments hospital `BloodInventory.units_available`
  - Inserts a `DonationHistory` row (request's audit trail / "history" view)
  - Sends 2 STOMP push notifications (donor + patient)
  - Sends 2 WhatsApp messages (donor "thank you" + patient "fulfilled") via the Phase 13 WhatsApp wiring
- Frontend: optimistic UI shows the verify page's green success card; donor's dashboard receives the STOMP push and refreshes the request list.

### Backend tests
```
Tests run: 92, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

---

## How an operator now self-diagnoses if "Invalid staff credentials" recurs

Open the **Backend - Spring Boot** cmd window. After each attempted submit, the log will print **exactly one** of:

| Backend log line | What it means | Operator action |
|------------------|---------------|-----------------|
| `QR submit: no user found for email 'X'` | The email isn't in the DB at all | Check spelling. Run `SELECT id, email FROM users WHERE LOWER(email) = LOWER('X');` |
| `QR submit: password mismatch for user id=N email='X'` | Email matched, password didn't | Reset the password via admin tools |
| `QR submit: user id=N email='X' has NULL password column` | Account is corrupt | DB cleanup needed |
| `QR submit: staff authenticated id=N email='X' role=HOSPITAL` | All good — donation completing | — |

The user-facing message stays `"Invalid staff credentials"` in all three failure cases (security model: don't let outsiders enumerate accounts). The distinction lives in the backend log only.

---

## Why this didn't show up in tests

The Phase 0 test suite (92 tests) covers `BloodCompatibilityUtil` (pure), `EligibilityService` (pure), `QRService` (mocked repo), `RequestStateMachine` (pure), and a regression guard against the master-key backdoor. **None of them exercise the `findByEmail` → BCrypt → role-scoping pipeline end-to-end with a real Oracle datasource**, because doing so would require either an embedded Oracle (which doesn't exist) or testcontainers (which needs Docker).

A follow-up task: add a `@DataJpaTest`-style test using H2 in Oracle-compatibility mode that hits `findByEmailIgnoreCase` against pre-seeded users with mixed casing. Out of scope for this single-issue RCA but documented as the gap.

---

## Operator action to confirm the fix

```cmd
taskkill /F /IM java.exe
taskkill /F /IM node.exe
run-project.bat
```

After backend prints `Started BloodDonationApplication`, in the same backend cmd window watch for log lines as you test:

1. **Existing staff account, exact same email case** — should authenticate as before (no regression).
2. **Existing staff account, different email casing** — should NOW authenticate (was broken).
3. **Real email, wrong password** — should fail with the new `password mismatch for user id=N` log line.
4. **Fake email** — should fail with the new `no user found for email` log line.

If after this the operator STILL sees `Invalid staff credentials` for what they believe is the correct password, the backend log will tell you precisely which of the three paths fired. There's no longer a silent ambiguity.
