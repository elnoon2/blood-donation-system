# 15 — Email-only QR Verification (no password on the QR form)

**Status:** Backend `mvn test` → **92/92 passing**. Frontend `vite build` → built in 20.55s.

---

## Decision

The QR verification page no longer asks for a password. The signed QR token itself is the cryptographic auth; the staff email is for identity and audit only.

Regular login (dashboard, register, /me) is **unchanged** — password is still required there.

## Why this is a reasonable security model

| Attack surface | Required to forge a completion |
|---|---|
| Forge a QR | Need the JWT signing secret (`JWT_SECRET` env var, never returned to clients). Impractical without backend compromise. |
| Steal an issued QR | Need physical access to the donor's phone at the moment they show the QR. Even then, must complete BEFORE the donor or any prior submitter — single-use, 24h expiry. |
| Pose as a verifier with a stolen QR | Must know the email of a registered HOSPITAL/ADMIN account; AND for HOSPITAL accounts, the staff's `hospital_id` must equal the QR's `request.hospital.id`. |

The previous "email + password" model added one more layer (password) — but in practice the password was being typed on a phone by a stranger to the staff member's account, which was the friction the operator wanted to remove. The current model is closer to how barcode-based hospital tools usually work: scan = verify, identity captured for audit.

## What changed

### Backend

**[`QRVerificationController.submitVerification`](../backend-spring/src/main/java/com/example/blooddonation/controller/QRVerificationController.java)**:
- Input validation: only `staffEmail` required (token is already validated separately). `doctorPasswordOrOtp` field is ignored if present (DTO field kept for backward compatibility — old frontend builds keep working).
- BCrypt `passwordEncoder.matches(...)` call removed entirely.
- Email lookup still uses `findByEmailIgnoreCase` (Phase 14) so phone-keyboard auto-capitalisation doesn't break the lookup.
- Failed lookup now returns a friendlier message: `"This email is not registered as an authorised verifier. Use the email your hospital/Ministry of Health account is registered with."` (was the generic `"Invalid staff credentials."`).
- `PasswordEncoder` autowire + import removed (no longer used in this controller).

**Role + hospital scoping retained** (unchanged from Phase 11):
- Staff must have `role = HOSPITAL` or `ADMIN` (DONOR/PATIENT verifiers rejected with 403).
- If `HOSPITAL`, `staff.hospital.id` must equal `request.hospital.id` (rejected with 403 otherwise).

### Frontend

**[`verify-donation.tsx`](../src/app/pages/verify-donation.tsx)**:
- Password `<Input type="password" id="auth" ...>` block removed entirely.
- A small helper text now sits where the password field was: *"The QR code itself authorises this verification. You only need to identify yourself with the email registered on your Ministry of Health / hospital account."*
- Submit-button precondition relaxed: only requires `staffEmail` (was `staffEmail && password`).
- POST body still sends `doctorPasswordOrOtp: ""` so old DTO-aware backends don't blow up — backend ignores it.
- Unused `Lock` icon import removed.

### Untouched (intentional)

- `AuthController.authenticateUser` — regular login still requires password.
- `UserDetailsServiceImpl.loadUserByUsername` — Spring Security login flow unchanged.
- `DonationVerificationRequest` DTO — `doctorPasswordOrOtp` field kept (now ignored by the controller) for safe backward compatibility with mobile clients that might be cached on old JS.
- All other Phases 11/12/13/13.2/14 work.

## Files modified (4)

| File | What |
|------|------|
| [`QRVerificationController.java`](../backend-spring/src/main/java/com/example/blooddonation/controller/QRVerificationController.java) | password check removed; friendlier error message; cleanup of unused `PasswordEncoder` |
| [`verify-donation.tsx`](../src/app/pages/verify-donation.tsx) | password input removed + helper text added + validation simplified |
| `audit/15-email-only-qr-verification.md` | this report |

## Verification

### Authorized hospital staff can complete verification
- Operator path: scan QR → fill health survey + email + (doctor name, ID, date, bags, photo) → submit → `200 OK` → green success card → request flips to COMPLETED.
- Backend log: `QR submit: identified verifier id=N email='...' role=HOSPITAL`.

### Unauthorized attempts blocked

| Attempt | Response | Reason |
|---|---|---|
| Email not in users table | `401` | Email lookup returns nothing → "not registered as an authorised verifier" message |
| Email belongs to a DONOR or PATIENT | `403` | Role guard rejects with "Only HOSPITAL or ADMIN accounts can submit donation verification" |
| HOSPITAL staff at a different hospital from the QR | `403` | Hospital-scoping guard: "This QR belongs to a different hospital than your account" |
| QR already used | `409` | Token DB row has `is_used=true` |
| QR expired | `410` | Token DB row's `expires_at < now` |
| Tampered QR (signature mismatch) | `401` | `qrService.parseTokenClaims` rejects signature |

### Backend tests
```
Tests run: 92, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Frontend build
```
✓ built in 20.55s
```

## To test on your side

```cmd
taskkill /F /IM java.exe
taskkill /F /IM node.exe
run-project.bat
```

1. On laptop, open `http://localhost:5173`, log in as donor, accept a request, click **Show QR**.
2. On phone, scan the QR. The verification page opens with the health survey.
3. Fill in the survey + just your **hospital staff email** (NO password field anymore).
4. Submit. Should succeed without typing a password.
5. Backend log line confirms: `QR submit: identified verifier id=N email='...' role=HOSPITAL` (or `ADMIN`).

If the email isn't registered as a HOSPITAL or ADMIN account, you'll get the friendly message: `"This email is not registered as an authorised verifier."` — fix is to either:
- Use a different email that IS registered as HOSPITAL/ADMIN
- Have an admin add/promote the account via the dashboard

## Recovery from Phase 14 admin-password issue

The Phase 14 RCA gave you a one-shot SQL to reset `nourelkassyamin15@gmail.com`'s password to `Admin1234!`. That's still useful for the **regular login** path (dashboard, API auth). It's no longer needed for QR submit — you can use that same email for QR verification without typing any password.

```sql
-- Still works for the regular login form (dashboard.tsx, login.tsx).
-- NOT needed anymore for QR submit (email-only now).
UPDATE users
SET password = '$2a$10$onhykLQNc.M8RazZlnR8Dux2jysvM240e/Z3wMToPw1bue6qqrVCq'
WHERE LOWER(email) = LOWER('nourelkassyamin15@gmail.com');
COMMIT;
```
