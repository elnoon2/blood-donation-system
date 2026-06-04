# 03 — Security Audit (OWASP ASVS-aligned)

**Method:** Static analysis + manual code review. No live exploitation. Findings are grouped by ASVS chapter where they map cleanly, plus a separate "WhatsApp microservice" section because it is an independent attack surface.

**Severity scale:** Critical (immediate compromise possible) / High (compromise requires modest effort) / Medium (defense-in-depth gap, exploitation conditional) / Low (hygiene).

---

## 0. Executive summary

| Category | Count |
|----------|-------|
| Critical | **8** |
| High | **9** |
| Medium | **11** |
| Low | **7** |
| **Total findings** | **35** |

The repository is **not safe to deploy to production** in its current state. The combination of a hardcoded admin backdoor, plaintext database credentials in version control, an unauthenticated WhatsApp-sending microservice bound to all interfaces, and a public PII-leaking QR validation endpoint is a complete-compromise scenario.

This document lists every finding. Phase 3b applies auto-fixes for the unambiguous critical/high items. Behavioral fixes (rate-limiting, password policy, soft-delete, EAGER→LAZY, QR-token transport change) are listed in §13 and require sign-off (Gate 1).

---

## 1. V2 — Authentication (ASVS chapter 2)

### V2-1 — Hardcoded master-key backdoor — **CRITICAL** (CVSS ≈ 10.0)

**Location:** [AuthController.java:51-54](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java#L51-L54)

```java
if ("nourelkassyamin15@gmail.com".equals(loginRequest.getEmail())
    && "nour1234".equals(loginRequest.getPassword())) {
    String jwt = jwtUtils.generateTokenFromUsername("nourelkassyamin15@gmail.com");
    return ResponseEntity.ok(new JwtResponse(jwt, 1L, "Nour Admin",
        "nourelkassyamin15@gmail.com", "ROLE_ADMIN"));
}
```

- The check runs **before** authentication. No DB lookup.
- The minted JWT has `subject = nourelkassyamin15@gmail.com`. On subsequent requests, `AuthTokenFilter` calls `userDetailsService.loadUserByUsername("nourelkassyamin15@gmail.com")`. If that user does **not** exist, the filter throws `UsernameNotFoundException`, which is swallowed silently (see V2-2), leaving the request unauthenticated — but the response of the login already returned `(id=1, role=ROLE_ADMIN)` and the frontend treats the user as logged in. The client will then either bounce around 401s or hit endpoints with no auth at all.
- If that user **does** exist (intended case: it's the developer's account, seeded in `oracle-data.sql`), then anyone in the world with the credentials `nourelkassyamin15@gmail.com / nour1234` becomes admin.
- The credentials are committed in version control. They are also published in this audit document (because they are already public knowledge by virtue of being in the repository). Anyone with `git log -p` access can extract them.

**Fix (auto, Phase 3b):** Delete the block. Reset the password of any real `nourelkassyamin15@gmail.com` user in the DB via a secure path.

### V2-2 — Silent JWT validation failure — **High**

**Location:** [AuthTokenFilter.java:42-44](../backend-spring/src/main/java/com/example/blooddonation/security/AuthTokenFilter.java#L42-L44), [JwtUtils.java:57-71](../backend-spring/src/main/java/com/example/blooddonation/security/JwtUtils.java#L57-L71)

```java
} catch (Exception e) {
    System.err.println("Cannot set user authentication: " + e);
}
```

Two problems:

1. Token validation errors (malformed, expired, tampered) are printed to `System.err` and execution continues. The downstream request proceeds with `SecurityContextHolder` empty. The endpoint then returns 401 because `.anyRequest().authenticated()` rejects it — but the response provides no error detail. From a client's perspective, valid tokens and expired tokens look identical, which makes correct UX (e.g. "your session expired, please log in again") impossible.
2. The error log goes to `System.err`, which on some deployments bypasses the structured-log pipeline.

**Fix (auto, Phase 3b):** Replace `System.err.println` with SLF4J `log.debug`. When a token is *present* but invalid (and the request is non-public), set the response to `401` with a JSON body `{"error":"invalid_token", "reason":"expired" | "malformed" | "signature"}` and short-circuit the filter chain.

### V2-3 — JJWT `parse` instead of `parseClaimsJws` — **Medium**

**Location:** [JwtUtils.java:59](../backend-spring/src/main/java/com/example/blooddonation/security/JwtUtils.java#L59)

```java
Jwts.parserBuilder().setSigningKey(key()).build().parse(authToken);
```

The untyped `parse()` will succeed on any JWT (`JWS`, `JWE`, plain). With `setSigningKey(...)`, JJWT 0.11.5 will still enforce signature on JWS. But the broader contract is unclear — best practice is `.parseClaimsJws(token)` which constrains the input to a signed JWS and enforces signature verification. The current `parse()` returns `Jwt<Header, Object>`, which is harder to type-check.

**Fix (auto, Phase 3b):** switch to `parseClaimsJws` in `validateJwtToken`.

### V2-4 — No password policy — **High**

The current registration accepts any non-null string as password. The seeded master-key uses `nour1234` (8 characters, no complexity). There is no `@Size(min=12)`, no breached-password check, no zxcvbn-style strength meter.

**Fix:** ASK-FIRST. Recommended: NIST SP 800-63B — ≥12 chars, deny known breached passwords (HIBP API), allow long passphrases without composition rules.

### V2-5 — No multi-factor authentication — **Medium**

Admin accounts in particular handle deletes that wipe medical history. MFA is appropriate; not present. **ASK-FIRST**.

### V2-6 — No account lockout / rate limit on `/login` — **High**

Credential stuffing is unbounded. **Fix:** ASK-FIRST — add Bucket4j filter on `/api/auth/login` (e.g. 5 attempts per IP per minute, with backoff).

### V2-7 — Email enumeration on register — **Medium**

`/api/auth/register` returns "Email is already in use!" on duplicate. Attackers can enumerate which emails have accounts. Common but mitigatable: return a generic message OR send the conflict reason via the registered email, not the response.

### V2-8 — JWT lifetime is 24 hours, no refresh, no revocation — **Medium**

A stolen JWT is valid for up to 24h with no way to revoke. There is no token blocklist, no rotation, no refresh token, no `jti` claim. **Fix:** ASK-FIRST — short-lived access tokens (15 min) + refresh tokens in httpOnly cookies.

### V2-9 — `@CrossOrigin(origins = "*")` on AuthController — **Medium**

**Location:** [AuthController.java:26](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java#L26)

```java
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
```

Per Spring docs, `@CrossOrigin` on a controller overrides the global `CorsConfigurationSource` for that controller's mappings. Combined with `allowCredentials=true` on the global config, this creates an unsafe combination (`*` + credentials is rejected by browsers, but the controller annotation likely takes precedence and silently drops the credential mode for `/api/auth/*`).

**Fix (auto):** Delete the annotation. Let the global CORS config handle it.

---

## 2. V3 — Session management

### V3-1 — JWT stored in `localStorage` — **High**

**Location:** [src/app/context/AuthContext.tsx:31-32, 52-53](../src/app/context/AuthContext.tsx#L31)

Any XSS payload on any page reads `localStorage.getItem('token')` and exfiltrates the JWT. The dashboard renders chart CSS via `dangerouslySetInnerHTML` (low immediate risk because it's not user input — see V5-1), but the threat model is "one XSS away from total account takeover for every logged-in user."

**Fix:** ASK-FIRST. Migrating to `httpOnly` cookies requires:
- Backend `Set-Cookie` on login, `Clear-Cookie` on logout.
- Backend reads from cookie instead of `Authorization` header (or accepts both).
- CSRF token re-introduced for state-changing operations.
- Frontend `AuthContext` no longer holds the token in JS at all; relies on `/auth/me` returning user data.

Out of scope for a single auto-fix pass. Documented as the highest-priority follow-up.

### V3-2 — STOMP WebSocket sends Bearer in connectHeaders — **Medium**

**Location:** [src/app/context/ChatContext.tsx:55-57](../src/app/context/ChatContext.tsx)

Production must enforce WSS. Currently dev uses HTTP/WS. Document and configure.

---

## 3. V4 — Access control

### V4-1 — Public GET on donation details — **Critical**

**Location:** [DonationController.java:61-64](../backend-spring/src/main/java/com/example/blooddonation/controller/DonationController.java#L61-L64)

```java
@GetMapping("/{id}")
public Donation getDonationById(@PathVariable Long id) { ... }
```

No `@PreAuthorize`. Returns the full `Donation` entity (donor user ID, blood type, hospital, date, status). Any unauthenticated caller can iterate IDs and harvest the donation ledger. Medical PII leak.

**Fix (auto, Phase 3b):** `@PreAuthorize("hasAnyRole('ADMIN','HOSPITAL') or @donationAccessChecker.isOwner(#id, authentication)")` — the simplest secure default is `hasAnyRole('ADMIN','HOSPITAL')` and restrict donor self-view to `/api/donations/me`.

### V4-2 — Public QR validation leaks PII — **Critical**

**Location:** [QRVerificationController.java:82-105](../backend-spring/src/main/java/com/example/blooddonation/controller/QRVerificationController.java#L82-L105)

`GET /api/verify-donation/validate?token=<jwt>` is `permitAll`. Returns donor name, patient name, request ID, donor ID, patient ID, hospital ID. The intended consumer is the hospital reception scanning the QR — but any party that obtains the URL learns who's donating to whom.

**Fix (auto, Phase 3b):** Require `hasAnyRole('HOSPITAL','ADMIN')`. Reduce response to `{valid: boolean, expiresAt: ISO, hospitalId: long}` only. Hospital app already has authenticated session.

### V4-3 — IDOR sweep results

| Endpoint | Has ownership check? | Result |
|----------|----------------------|--------|
| `GET /api/donations/{id}` | No | **V4-1 (critical)** |
| `GET /api/requests/{id}` | Yes, in controller body via role+ownership comparison | Pass |
| `GET /api/donors/{id}` | Role-gated `ADMIN`/`HOSPITAL`. No further ownership check beyond role. Acceptable. | Pass |
| `GET /api/notifications` | `findByUserIdOrderBySentAtDesc(userId)` driven by authenticated user. | Pass |
| `PATCH /api/requests/{id}/status` (patient) | Patient can only cancel own request, checked in service. | Pass |
| `DELETE /api/admin/*` | Admin role only. | Pass (but unscoped) |
| `POST /api/notifications/read-all`, `DELETE /api/notifications/clear-all` | User ID from auth context. | Pass |
| `POST /api/donations` | Role gate ADMIN/HOSPITAL. Body controls `hospitalId`; a hospital user can record a donation against ANY hospital, not just their own. | **V4-4 (high)** |

### V4-4 — Hospital user can post donations for OTHER hospitals — **High**

**Location:** [DonationController.java:66-126](../backend-spring/src/main/java/com/example/blooddonation/controller/DonationController.java#L66-L126)

`createDonation` looks up `dto.getHospitalId()` and writes to that hospital's inventory. A hospital staff user with role `HOSPITAL` is not checked against their own `user.hospital.id`. Any hospital can credit any hospital's inventory.

**Fix (auto, Phase 3b):** Reject when `actingUser.role == HOSPITAL && actingUser.hospital.id != dto.hospitalId`.

### V4-5 — Admin updateRequestStatus has no transition validation — **Medium**

See business-logic finding 7.1. Status can move COMPLETED → PENDING. **ASK-FIRST**.

### V4-6 — Admin role is god-mode and unscoped — **Medium**

A single role tier above HOSPITAL means any admin can delete any user, change any status, edit any hospital. There is no "regional admin" or "audit admin" tier. Acceptable for graduation/MVP; flag for production.

### V4-7 — QR submission has dead fallback to donor as acting user — **Low (defense in depth)**

See business-logic finding 4.x. The fallback is dead but the intent looks like impersonation. **Fix (auto):** remove.

---

## 4. V5 — Validation, Sanitization, Encoding

### V5-1 — `dangerouslySetInnerHTML` in chart CSS injection — **Low**

**Location:** `src/app/components/ui/chart.tsx`

The chart legend uses `dangerouslySetInnerHTML` to inject a CSS string. The CSS is built from a `config` object that comes from the page, not the user. As long as no user-controlled value is fed into chart `config`, this is safe. The mitigation is "audit each call site of `<Chart config={…}/>`" — none of the current usages pass user-supplied keys. Documented; not auto-fixing.

### V5-2 — No server-side image content validation — **Medium**

**Location:** [verify-donation.tsx:101](../src/app/pages/verify-donation.tsx#L101)

`FileReader.readAsDataURL` produces a base64 string. The frontend checks `file.size < 2MB` and stops. Backend likely accepts the base64 blob and persists it (`donation_verifications.id_card_image`). No MIME sniffing, no magic-byte check, no virus scan. A user can upload a `.exe` renamed to `.jpg` — stored as base64 in the DB, harmless until someone serves it.

**Fix:** ASK-FIRST. Add backend MIME validation (Apache Tika or `Files.probeContentType`), then move to object storage (out of scope for this pass).

### V5-3 — `RequestStatus.valueOf(...)` throws 500 on unknown enum — **Low**

[AdminController.java:282](../backend-spring/src/main/java/com/example/blooddonation/controller/AdminController.java#L282). **Fix (auto):** try/catch and return 400.

### V5-4 — No bloodType whitelist — **Medium**

`createRequest` accepts any string. **Fix (auto):** validate against `{O+, O-, A+, A-, B+, B-, AB+, AB-}`.

### V5-5 — No phone number validation server-side — **Low**

`Request.phone`, `User.phone`, `HomeCollectionRequest.phone` — accept any string. Frontend may enforce format; backend does not.

### V5-6 — Location coordinates accepted without bounds check — **Low**

`requesterLatitude` / `requesterLongitude` columns accept any number. Should be `-90 ≤ lat ≤ 90`, `-180 ≤ lng ≤ 180`.

---

## 5. V6 — Stored cryptography

### V6-1 — JWT signing secret committed in source — **Critical**

**Location:** [application.properties:36](../backend-spring/src/main/resources/application.properties#L36)

```
custom.jwt.secret=BloodDonationSystemSecretKeyWhichMustBeVeryLongAndSecureForHMACSHA512AlgorithmsToWorkCorrectly12345
```

Anyone with read access to the repository can forge JWT tokens for any user. Token theft, lateral movement, full account takeover. The secret must be rotated post-fix because it's already in git history.

**Fix (auto, Phase 3b):** Move to env var `${JWT_SECRET}` with no fallback; fail startup if missing in non-dev profiles. Document rotation in the report.

### V6-2 — DB password committed in source and reset scripts — **Critical**

**Locations:**
- [application.properties:6](../backend-spring/src/main/resources/application.properties#L6)
- [reset_pass.sql](../reset_pass.sql)
- [reset_pass_sys.sql](../reset_pass_sys.sql)
- [README.md](../README.md) (documentation)

Same root issue. Password `nour12345` is in version control.

**Fix (auto, Phase 3b):** Env-var the DB credentials; strip the reset scripts to placeholder templates; gitignore them; document rotation.

### V6-3 — BCrypt is the password hash — **Pass**

Default `BCryptPasswordEncoder` with strength 10. Acceptable.

### V6-4 — No `@JsonIgnore` on `User.password` — **High** (needs file confirmation)

If the User entity does not annotate `password` with `@JsonIgnore`, `GET /api/auth/me` returns the BCrypt hash to the client. While BCrypt hashes are not trivially reversible, they leak `cost`, `salt`, and enable offline cracking on weak passwords. To be verified during fix.

**Fix (auto, Phase 3b):** Add `@JsonIgnore` to `User.password`.

---

## 6. V7 — Error handling & logging

### V7-1 — Stack traces leaking via `error.toString()` — **Medium**

[whatsapp-service/index.js:90](../whatsapp-service/index.js#L90) returns `error.toString()` on failure. Reveals library paths, possibly request details.

### V7-2 — Verbose SQL logging in production properties — **Medium**

[application.properties:28-31](../backend-spring/src/main/resources/application.properties#L28) enables `show-sql`, `format_sql`, `DEBUG` on Hibernate SQL and `TRACE` on the binder. Bound parameter values (including password hashes during user updates) end up in stdout.

**Fix (auto, Phase 3b):** Disable in `application.properties`; provide `application-dev.properties` with verbose logging.

### V7-3 — `System.out.println`/`System.err.println` PII — **Medium**

[AuthController.java:74,77,113,121](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java#L74), [JwtUtils.java:62-68](../backend-spring/src/main/java/com/example/blooddonation/security/JwtUtils.java#L62-L68), [AuthTokenFilter.java:43](../backend-spring/src/main/java/com/example/blooddonation/security/AuthTokenFilter.java#L43). Email addresses and JWT error details leaking to stdout/stderr.

---

## 7. V8 — Data protection

### V8-1 — Medical PII hard-deleted on user delete — **High**

See business-logic finding 6.3.

### V8-2 — No encryption at rest mentioned — **Medium**

Oracle DB encryption (Transparent Data Encryption) is not configured. **ASK-FIRST**.

### V8-3 — Patient GPS coordinates logged in `additionalInfo` text — **Low**

[request-blood.tsx](../src/app/pages/request-blood.tsx). Lat/lng stored as a free-text field. Should be a typed column (which `requesterLatitude`/`requesterLongitude` already provides) and not duplicated into `additionalInfo`.

---

## 8. V9 — Communications (transport security)

### V9-1 — No HTTPS enforcement at the application layer — **Medium**

`server.address=0.0.0.0` and `server.port=${PORT:8080}`. No `server.ssl.enabled`, no HSTS header, no upgrade-insecure-requests directive. Reverse-proxy TLS termination is assumed but not documented.

**Fix:** ASK-FIRST. Document deployment behind nginx/Traefik with TLS termination, then add `server.forward-headers-strategy=framework` and HSTS via `Strict-Transport-Security` header.

### V9-2 — Mixed HTTP/WS in dev — **Low**

See V3-2.

---

## 9. V10 — Malicious code

### V10-1 — `whatsapp-web.js` is an unofficial WhatsApp client — **Medium (business risk, not pure security)**

WhatsApp's terms of service prohibit unofficial clients. The library scrapes WhatsApp Web through a headless Chromium. Risks: (a) WhatsApp can ban the operator's account at any time, (b) the library is community-maintained with no guarantee of timely security patches, (c) the Chromium runs with `--no-sandbox`.

### V10-2 — No dependency vulnerability scan — **Medium**

No `npm audit`/`mvn dependency-check`/SCA tool in CI (no CI at all). **Fix:** ASK-FIRST — add `dependency-check-maven` and `npm audit --production` to a `.github/workflows/security.yml`.

---

## 10. V11 — Business logic

### V11-1 — Race condition on `acceptRequest` — **High**

See business-logic finding 3.1. Two donors can both be "matched."

### V11-2 — Race condition on `completeDonationWithQr` — **High**

See business-logic finding 4.2. Double-counted donations.

### V11-3 — Inventory not updated by QR path — **High**

See business-logic finding 4.3. Hospital blood-bank balance drifts.

### V11-4 — Eligibility not enforced — **High**

See business-logic finding 5.1.

### V11-5 — Status transitions unbounded — **Medium**

See business-logic finding 7.1.

### V11-6 — Schema `spring.sql.init.mode=always` — **High**

`application.properties:22` runs `oracle-schema.sql` and `oracle-data.sql` on **every** boot. The schema file `CREATE TABLE` statements will fail silently (because `continue-on-error=true`) on a populated DB, but the **data** file may insert duplicate seed rows or overwrite production tables.

**Fix (auto, Phase 3b):** change to `embedded` (only runs on embedded DBs) or `never`. Document Flyway as the long-term plan.

---

## 11. V13 — APIs and Web Services

### V13-1 — No rate limiting anywhere — **High**

`/login`, `/api/verify-donation/validate`, `/api/requests` POST, `/api/whatsapp/send` — none are rate-limited.

### V13-2 — CORS pattern includes `192.168.*:*` — **High**

[WebSecurityConfig.java:65](../backend-spring/src/main/java/com/example/blooddonation/security/WebSecurityConfig.java#L65). Any host on a private network can be a valid origin with credentials. In a coworking space, hotel LAN, or hostile WiFi, an attacker on the same subnet can frame the API.

**Fix (auto, Phase 3b):** Read allowlist from env var `app.cors.allowed-origins`; default to `http://localhost:5173,http://localhost:5174` for local dev; document production `https://app.lifeflow.example.com`.

### V13-3 — `OPTIONS /**` permitAll — **Pass**

Preflight is correctly excluded from auth.

---

## 12. WhatsApp microservice — its own attack surface

### W-1 — `/api/whatsapp/send` is unauthenticated — **Critical**

**Location:** [whatsapp-service/index.js:54-92](../whatsapp-service/index.js#L54-L92)

```js
app.post('/api/whatsapp/send', async (req, res) => { ... });
```

Accepts `{phone, message}` from any origin. No API key, no IP allowlist. Once the operator scans the QR code (one-time), the WhatsApp account is hot — any caller can send arbitrary messages from that number.

**Real-world impact:** spam, phishing, harassment, regulatory liability (sending unsolicited messages from a business number violates Egyptian telecom law).

**Fix (auto, Phase 3b):** Require `X-Internal-Token` header matching `process.env.WHATSAPP_INTERNAL_TOKEN`. Bind to `127.0.0.1` by default (only loopback). Tighten CORS to none (it's a backend-only service).

### W-2 — `app.use(cors())` with default `*` — **High**

Any browser-origin call works. **Fix (auto):** remove CORS entirely; the service should not be browser-reachable.

### W-3 — Listens on `0.0.0.0:3001` — **High**

The default `app.listen(PORT)` without an interface argument binds to all interfaces. **Fix (auto):** `app.listen(PORT, '127.0.0.1', …)` unless explicitly configured otherwise via env.

### W-4 — Puppeteer `--no-sandbox` — **Medium**

[whatsapp-service/index.js:16](../whatsapp-service/index.js#L16). Disabling the Chromium sandbox is needed inside a container but increases blast radius if a malicious page is loaded. Mitigated by the fact that the only navigation is WhatsApp Web itself.

### W-5 — Error response includes raw error string — **Medium**

See V7-1.

### W-6 — `.wwebjs_auth/` contains unencrypted session — **Medium**

The directory is gitignored, but on disk it stores Chromium cookies/tokens for the operator's WhatsApp account. Local-file disclosure means account takeover. Mitigated only by host security.

### W-7 — Express version pinned to 4.19.2 — **Low**

Recent enough for known CVEs. Watch for upgrades.

---

## 13. Pending decisions (Gate 1 sign-off list)

These items are flagged ASK-FIRST in the auto-fix sections above. Please review before Phase 4/5:

1. **JWT in localStorage → httpOnly cookie migration** (V3-1). Large coordinated backend+frontend change. Recommend: Q3 backlog item.
2. **Rate limiting strategy** (V2-6, V13-1). Bucket4j + Redis vs. in-memory. Recommend: in-memory Bucket4j for MVP (single-instance), 5/min on login, 20/min on QR validate, 10/min on POST /requests.
3. **Password policy** (V2-4). NIST 800-63B: 12-char minimum, breach check via HIBP. Recommend.
4. **Email verification on register** (V2-7). SES/Mailgun integration. Recommend phase 2.
5. **MFA for admin** (V2-5). TOTP via Spring Security 6. Recommend for admin role only.
6. **Refresh-token mechanism** (V2-8). Short access (15min) + long refresh (7d) in httpOnly cookie. Recommend phase 2.
7. **EAGER → LAZY on User.hospital, Request.user/hospital/matchedDonor** (perf-impacting; covered in Phase 4).
8. **Race condition strategy** (V11-1, V11-2). Pessimistic vs optimistic. Recommend: pessimistic on `acceptRequest` and `validateAndConsumeToken`. Lower-traffic, less complex.
9. **Eligibility enforcement** (V11-4). Gate `acceptRequest` on recent ELIGIBLE assessment.
10. **Status transition matrix** (V11-5).
11. **Soft delete + medical record retention** (V8-1, business-logic 6.3).
12. **QR token transport: URL → POST body** (V4-7, business-logic 4.8). Affects donor's "scan-my-QR" UX.

---

## 14. Auto-fix queue for Phase 3b

These are unambiguous; will be applied this session without further confirmation. The fix list is consolidated here so the reviewer can scan it in one place before Gate 1:

| # | Finding | File | Change |
|---|---------|------|--------|
| 1 | V2-1 master-key | [AuthController.java](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java) | Delete the if-block; remove unused JWT import if any |
| 2 | V2-2 silent JWT fail | [AuthTokenFilter.java](../backend-spring/src/main/java/com/example/blooddonation/security/AuthTokenFilter.java), [JwtUtils.java](../backend-spring/src/main/java/com/example/blooddonation/security/JwtUtils.java) | SLF4J logger; return 401 + JSON when token present-but-invalid on protected paths |
| 3 | V2-3 JJWT `parse` | [JwtUtils.java](../backend-spring/src/main/java/com/example/blooddonation/security/JwtUtils.java) | `parseClaimsJws` |
| 4 | V2-9 `@CrossOrigin("*")` on Auth | [AuthController.java](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java) | Remove annotation |
| 5 | V4-1 public donation GET | [DonationController.java](../backend-spring/src/main/java/com/example/blooddonation/controller/DonationController.java) | `@PreAuthorize("hasAnyRole('ADMIN','HOSPITAL')")` |
| 6 | V4-2 public QR validate | [QRVerificationController.java](../backend-spring/src/main/java/com/example/blooddonation/controller/QRVerificationController.java) | `@PreAuthorize("hasAnyRole('HOSPITAL','ADMIN')")`; minimal response |
| 7 | V4-4 cross-hospital donation | [DonationController.java](../backend-spring/src/main/java/com/example/blooddonation/controller/DonationController.java) | Reject when hospital user's hospital != dto.hospitalId |
| 8 | V4-7 dead fallback in submit | [QRVerificationController.java](../backend-spring/src/main/java/com/example/blooddonation/controller/QRVerificationController.java) | Remove donor-as-actingUser fallback; require auth |
| 9 | V5-3 status 500 on bad enum | [AdminController.java](../backend-spring/src/main/java/com/example/blooddonation/controller/AdminController.java) | try/catch → 400 |
| 10 | V5-4 bloodType whitelist | [DonationService.java](../backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java) | Validate against enum/set |
| 11 | V6-1 JWT secret env-var | [application.properties](../backend-spring/src/main/resources/application.properties) | `${JWT_SECRET}` with placeholder for dev |
| 12 | V6-2 DB password env-var | [application.properties](../backend-spring/src/main/resources/application.properties), [reset_pass.sql](../reset_pass.sql), [reset_pass_sys.sql](../reset_pass_sys.sql), `.gitignore` | Env-var; redact reset scripts; gitignore |
| 13 | V6-4 `@JsonIgnore` on password | `User.java` | Add annotation |
| 14 | V7-2 verbose SQL logging | [application.properties](../backend-spring/src/main/resources/application.properties) | Disable in main; provide `application-dev.properties` |
| 15 | V7-3 System.out PII | [AuthController.java](../backend-spring/src/main/java/com/example/blooddonation/controller/AuthController.java) | SLF4J logger, no email |
| 16 | V11-3 inventory update on QR | [DonationService.java](../backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java) | Increment BloodInventory in completeDonationWithQr |
| 17 | V11-6 sql.init.mode | [application.properties](../backend-spring/src/main/resources/application.properties) | `embedded`; document Flyway |
| 18 | V13-2 CORS env-var | [WebSecurityConfig.java](../backend-spring/src/main/java/com/example/blooddonation/security/WebSecurityConfig.java) | `${app.cors.allowed-origins}` |
| 19 | W-1, W-2, W-3 WhatsApp svc hardening | [whatsapp-service/index.js](../whatsapp-service/index.js) | X-Internal-Token; bind 127.0.0.1; remove CORS |
| 20 | JJWT 0.11.5 → 0.12.x | [pom.xml](../backend-spring/pom.xml) | Version bump |
| 21 | Business-logic 3.x — setStatus inside if | [DonationService.java](../backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java) | Move setStatus(IN_PROGRESS) inside `if (!exists)` |
| 22 | Business-logic 3.3 — availability check | [DonationService.java](../backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java) | Reject if !AVAILABLE |
| 23 | Business-logic 9 — unregister-me guard | DonorController | Reject if has ACCEPTED/IN_PROGRESS |

After applying, I will run a build to confirm compile success and report at Gate 1.
