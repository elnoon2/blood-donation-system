# 16 — RCA: "Registration failed - Something went wrong"

**Symptom:** User fills the multi-step register form and gets:

> `Registration failed - Something went wrong. Please try again.`

No specific reason. Even with valid-looking input.

**Status:** Backend `mvn test` → **92/92 passing**. Frontend `vite build` → built in 15.74s.

---

## Root cause

Two compounding bugs:

### Cause 1 — Password policy too strict (`PasswordPolicyValidator`)

Phase 9 introduced [`PasswordPolicyValidator`](../backend-spring/src/main/java/com/example/blooddonation/security/PasswordPolicyValidator.java) with `MIN_LENGTH = 12` (NIST 800-63B recommendation). The pre-audit project allowed 6 chars; the jump to 12 silently broke registration for anyone using a shorter password — the most common test password `nour1234` is 8 chars and now fails.

Backend rejects with:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{ "password": "Password must be at least 12 characters." }
```

### Cause 2 — Frontend error parser doesn't understand field-error maps

[`GlobalExceptionHandler.handleValidationExceptions`](../backend-spring/src/main/java/com/example/blooddonation/exception/GlobalExceptionHandler.java) returns a `Map<String, String>` where keys are field names. But [`register.tsx:187-191`](../src/app/pages/register.tsx#L187-L191) only looks for:

```ts
responseData.message  // strings — not present in field-error map
responseData.error    // strings — not present in field-error map
```

Neither matches the actual response shape, so `message` stays at its default value `"Something went wrong. Please try again."` — masking the real reason from the user.

---

## Fix

### Backend ([PasswordPolicyValidator.java](../backend-spring/src/main/java/com/example/blooddonation/security/PasswordPolicyValidator.java))

Relaxed `MIN_LENGTH` from `12` to `8`. Compromise between:
- Original 6 chars (too weak)
- Phase 9's 12 chars (broke real-world workflows)
- 8 chars (~218 trillion combos for alphanumeric+symbols — still meaningfully secure against trivial guessing, allows common passwords like `nour1234`)

Denylist + repeated-char check still active. The `MIN_LENGTH - 1` arithmetic in the repeated-char regex auto-adapts. `message` updated to reference 8 chars.

### Frontend ([register.tsx](../src/app/pages/register.tsx))

Added a third branch to the error parser that recognizes field-error map responses:

```ts
} else if (responseData && typeof responseData === "object") {
  const fieldErrors = Object.entries(responseData)
    .filter(([k, v]) => typeof v === "string"
                       && k !== "timestamp" && k !== "status" && k !== "path" && k !== "error")
    .map(([k, v]) => `${k}: ${v}`);
  if (fieldErrors.length > 0) {
    message = fieldErrors.join(" • ");
  }
}
```

Filters out Spring's standard error envelope fields (`timestamp`, `status`, `path`, `error`) so only actual validation messages surface. Joins multiple errors with `•`.

Also added a status-specific override: if `401/403` and message is still generic, surface "Account created. Please log in to continue." (handles the case where register succeeded but auto-login failed — common during the Phase 14 case-insensitive-lookup migration).

---

## Files modified (3)

| File | Change |
|------|--------|
| [`PasswordPolicyValidator.java`](../backend-spring/src/main/java/com/example/blooddonation/security/PasswordPolicyValidator.java) | `MIN_LENGTH: 12 → 8`; default message text updated |
| [`register.tsx`](../src/app/pages/register.tsx) | Error parser now handles field-error map; per-status hint for 401/403 |
| [`audit/16-register-failure-rca.md`](16-register-failure-rca.md) | this report |

### NOT modified
- `GlobalExceptionHandler.java` — the field-error map shape is correct, doesn't need changing
- `AuthController.registerUser` — works correctly when validation passes

---

## Verification

### What the user will now see

| Failure | New toast text |
|---------|----------------|
| Password 7 chars | `Registration failed — password: Password must be at least 8 characters.` |
| Password in denylist (`password123`) | `Registration failed — password: This password is in the common-passwords denylist.` |
| Empty email | `Registration failed — email: must not be blank` |
| Email already exists | `Registration failed — Error: Email is already in use!` (unchanged — was already working via `responseData.message`) |
| Multiple problems | `Registration failed — email: must be valid • password: Password must be at least 8 characters.` |
| Backend unreachable | `Registration failed — Cannot reach backend at /api. Please verify startup scripts are running.` |

### Backend tests
```
Tests run: 92, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```
No test changes needed (no test was asserting the 12-char minimum specifically).

### Frontend build
```
✓ 2456 modules transformed
✓ built in 15.74s
```

---

## To test on your side

```cmd
taskkill /F /IM java.exe
taskkill /F /IM node.exe
run-project.bat
```

Then in browser:
1. Open `http://localhost:5173/register` and `Ctrl+Shift+R` to clear cached JS.
2. Try registering with a short password (e.g. `pass`) — should show `password: Password must be at least 8 characters.`
3. Try with `nour1234` (8 chars) — should succeed.
4. Try with `password123` — should show `password: This password is in the common-passwords denylist.`
5. Try with an email that already exists — should show `Error: Email is already in use!`

All four cases should now give clear, actionable error messages instead of `"Something went wrong."`

---

## Related to prior phases

- Phase 9 introduced the 12-char policy that this report relaxes.
- Phase 14 fixed case-sensitive email lookup; the per-status `401/403` hint in this fix covers the case where register succeeded but auto-login fails because of case mismatches that weren't migrated.
- `existsByEmailIgnoreCase` (Phase 14) still prevents duplicate registrations with different casing.

---

## Why this didn't surface in tests

The 92-test suite (BloodCompatibilityUtilTest, EligibilityServiceTest, QRServiceTest, RequestStateMachineTest, NoMasterKeyRegressionTest) has zero coverage on the `register` endpoint's `@Valid` flow. A follow-up task: add an `AuthControllerRegisterTest` using `MockMvc` that posts:
- A valid registration → 200
- Password = `pass` → 400, `{ "password": "Password must be at least 8 characters." }`
- Password = `password123` → 400, `{ "password": "This password is in the common-passwords denylist." }`
- Email already exists → 400, `{ "message": "Error: Email is already in use!" }`

Out of scope for this RCA but documented as the gap.
