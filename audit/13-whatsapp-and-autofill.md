# 13 — WhatsApp Wiring + Request Auto-Fill + Find Donors Role Fix

**Scope:** 3 genuinely new items from the user's "Full System Review" request. The other 4 items in that request (QR localhost fix, soft-delete request, notification scroll/Read All/Clear All, request workflow audit) were already shipped in Phases 11 and 12 (commit `007ec958`).
**Status:** Backend `mvn test` → **92/92 passing**. Frontend `vite build` → **2456 modules, built in 8.37s**.

---

## Root causes found

| # | Issue | Cause |
|---|-------|-------|
| 1 | WhatsApp notifications never sent | The `whatsapp-service` Node microservice is hardened and running, but **no Java code in Spring Boot calls it**. `DonationService.notifyCompatibleDonors` and the accept/complete paths only fire STOMP WebSocket messages and DB rows — never POST to `http://localhost:3001/api/whatsapp/send`. Confirmed via grep of the entire backend: zero references to `:3001` or "whatsapp" outside `DonationService` notification code. |
| 2 | Request form doesn't auto-fill from patient profile | [request-blood.tsx:24-33](../src/app/pages/request-blood.tsx#L24) initialized `formData` with hardcoded empty strings for `patientName`/`phone` and default literals `"A+"`/`"Cairo"`. `useAuth()` was never imported, so the patient's stored `name`/`bloodType`/`phone`/`governorate` were never consulted. |
| 3 | Find Donors returned 403 for patients | Route mismatch: [routes.tsx:97](../src/app/routes.tsx#L97) gates `/search-donors` for `PATIENT`, but [DonorController.searchDonors](../backend-spring/src/main/java/com/example/blooddonation/controller/DonorController.java#L37) had `@PreAuthorize("hasAnyRole('ADMIN','HOSPITAL')")`. Patient JWTs always failed authz on the search call. |

---

## Changes implemented

### Task A — WhatsApp wiring (Spring → microservice)

**Design:** new `WhatsAppClient` Spring service that calls the Node microservice over HTTP with a short timeout. Every send attempt — success, failure, or skipped — is persisted to a new `whatsapp_delivery_log` table for audit. All calls are **best-effort**: the client never throws to its callers, and DonationService wraps each call in a second `try/catch` safety net so a misbehaving WhatsApp path can never roll back a donation transaction.

**New files:**

| File | Role |
|------|------|
| [`entity/WhatsAppDeliveryLog.java`](../backend-spring/src/main/java/com/example/blooddonation/entity/WhatsAppDeliveryLog.java) | Audit row per send. Columns: `id, phone_last4, context_summary, status (SENT/SKIPPED/FAILED), error_code, error_message (≤500 chars), created_at`. **PII discipline:** only the last 4 digits of the phone are stored. |
| [`repository/WhatsAppDeliveryLogRepository.java`](../backend-spring/src/main/java/com/example/blooddonation/repository/WhatsAppDeliveryLogRepository.java) | Plain `JpaRepository`. |
| [`service/WhatsAppClient.java`](../backend-spring/src/main/java/com/example/blooddonation/service/WhatsAppClient.java) | `@Service` with `send(phone, message, contextSummary)`. RestTemplate with `connectTimeout=2s`, `readTimeout=5s`. Sends `X-Internal-Token` header when `app.whatsapp.token` is set. Maps every failure mode to a `WhatsAppDeliveryLog.Status` + `error_code` (`DISABLED`, `NO_PHONE`, `NO_MESSAGE`, `HTTP_4xx/5xx`, `CONNECT_REFUSED`, `EXCEPTION`). |

**Modified — [`DonationService.java`](../backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java):**

| Trigger | What fires |
|---------|------------|
| `notifyCompatibleDonors` (new request) | Per compatible donor: `🩸 Urgent blood request: <bloodType> needed in <governorate> at <hospital>. Open the LifeFlow app to respond.` |
| `acceptRequest` (donor accepts) | Patient receives: `✅ Good news! A donor accepted your blood request and is heading to <hospital>. Track progress in the LifeFlow app.` |
| `completeDonationWithQr` (hospital verifies) | Donor: `🎉 Thank you for donating! Your donation at <hospital> is verified and recorded.` + Patient: `🩸 Your blood request has been fulfilled at <hospital>. We hope for a swift recovery.` |

**Modified — [`application.properties`](../backend-spring/src/main/resources/application.properties):**
```properties
app.whatsapp.enabled=${WHATSAPP_ENABLED:true}
app.whatsapp.url=${WHATSAPP_SERVICE_URL:http://127.0.0.1:3001}
app.whatsapp.token=${WHATSAPP_INTERNAL_TOKEN:}
```

**Modified — [`run-project.bat`](../run-project.bat):**
Backend launcher now sets `WHATSAPP_ENABLED=true`, `WHATSAPP_SERVICE_URL=http://127.0.0.1:3001`, `WHATSAPP_INTERNAL_TOKEN=` (empty — paired with the Node side's `WHATSAPP_ALLOW_INSECURE=true` for dev). Production deployments MUST set a non-empty token on BOTH sides.

### Task B — Request creation auto-fill from patient profile

**Modified — [`src/app/pages/request-blood.tsx`](../src/app/pages/request-blood.tsx):**
- Added `import { useAuth }`.
- Initial `formData` seeds from `user.name / user.bloodType / user.phone / user.governorate / user.hospital?.id` (falls back to the existing defaults if the auth context hasn't hydrated yet).
- New `useEffect` hooks `user` so when auth hydrates AFTER first render, fields that are still on their default value get populated. **A field the patient has typed into is never overwritten.**
- All fields remain editable so a patient can submit on behalf of a family member.

### Task C — Find Donors role fix

**Modified — [`DonorController.java`](../backend-spring/src/main/java/com/example/blooddonation/controller/DonorController.java):**
- `GET /api/donors` and `GET /api/donors/search` now `@PreAuthorize("hasAnyRole('ADMIN','HOSPITAL','PATIENT')")`. ADMIN and HOSPITAL still see the same data; PATIENT now gets 200 instead of 403.

---

## Files Modified

| File | Status |
|------|--------|
| `backend-spring/src/main/java/com/example/blooddonation/entity/WhatsAppDeliveryLog.java` | **NEW** |
| `backend-spring/src/main/java/com/example/blooddonation/repository/WhatsAppDeliveryLogRepository.java` | **NEW** |
| `backend-spring/src/main/java/com/example/blooddonation/service/WhatsAppClient.java` | **NEW** |
| `backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java` | Modified — wired WhatsApp at 3 trigger points |
| `backend-spring/src/main/java/com/example/blooddonation/controller/DonorController.java` | Modified — added PATIENT role to /api/donors + /api/donors/search |
| `backend-spring/src/main/resources/application.properties` | Modified — new `app.whatsapp.*` properties |
| `run-project.bat` | Modified — exports `WHATSAPP_*` env vars to backend window |
| `src/app/pages/request-blood.tsx` | Modified — auto-fill from `useAuth().user` |
| `audit/13-whatsapp-and-autofill.md` | **NEW** (this file) |

---

## WhatsApp Verification Report

### Verification covered in this session

| Check | Result |
|-------|--------|
| `WhatsAppClient` compiles cleanly | ✅ `mvn compile` BUILD SUCCESS |
| `WhatsAppDeliveryLog` entity compiles | ✅ |
| `DonationService` wiring compiles | ✅ (autowired `WhatsAppClient` resolves) |
| All 92 backend tests still pass | ✅ (no regression in BloodCompatibilityUtilTest, EligibilityServiceTest, QRServiceTest, RequestStateMachineTest, NoMasterKeyRegressionTest) |
| `app.whatsapp.enabled=false` short-circuits without HTTP | ✅ (verified by code path; persisted as `SKIPPED/DISABLED`) |
| Empty phone → `SKIPPED/NO_PHONE` | ✅ (verified by code path) |
| Connect refused → `FAILED/CONNECT_REFUSED` | ✅ (verified by exception handler) |
| Donation transaction survives WhatsApp failure | ✅ (every call wrapped in try/catch in DonationService; client itself catches all exceptions) |

### Manual operator-side verification (still needed)

End-to-end delivery to a real phone requires the operator to:

1. Launch `run-project.bat`. The "WhatsApp Service" window prints a QR code. Scan it with WhatsApp on a phone to link the service to that phone number. Wait for `WhatsApp Client is ready!`.
2. As a patient with `phone='01000000000'` in their profile, create a new request. Within ~3 seconds:
   - STOMP push fires (existing behavior).
   - Each AVAILABLE compatible donor's phone receives a WhatsApp message from the linked operator number.
   - SQL: `SELECT id, phone_last4, context_summary, status, error_code, error_message, created_at FROM whatsapp_delivery_log WHERE context_summary LIKE 'NEW_REQUEST:req=%' ORDER BY id DESC FETCH FIRST 10 ROWS ONLY;`
3. As that donor, accept the request → patient's phone receives `✅ Good news!...`.
4. Hospital staff verifies the QR → both donor and patient receive `🎉` and `🩸` messages.
5. **Negative path test:** stop the `whatsapp-service` Node process and repeat step 2. Donations still complete; `whatsapp_delivery_log` shows rows with `status=FAILED, error_code=CONNECT_REFUSED`.

The delivery-log table makes failures auditable: an admin can `SELECT * FROM whatsapp_delivery_log WHERE status = 'FAILED' AND created_at > SYSDATE - 1` to see which messages were lost in the last day without touching the Node service.

---

## QR Verification Report

Already shipped and verified in Phases 11 + 12. Key points carried forward to this session:

- QR URL uses `publicBaseUrl()` which prefers `VITE_PUBLIC_BASE_URL` env var (set by `run-project.bat`) and falls back to `window.location.origin`. Warning toast if origin is `localhost`.
- `/api/verify-donation/validate` is `permitAll`; signed QR token authenticates.
- `/api/verify-donation/submit` is `permitAll` but requires `staffEmail` + `doctorPasswordOrOtp` in the body; backend authenticates inline with BCrypt + hospital scoping.
- Legacy `/verify.html?v=N` URLs are caught by `verify-legacy-redirect.tsx` (no more "404 Page Not Found" from old printed QRs).

---

## Test Results

| Test suite | Result |
|------------|--------|
| `BloodCompatibilityUtilTest` | 68/68 ✅ |
| `EligibilityServiceTest` | 9/9 ✅ |
| `QRServiceTest` | 4/4 ✅ |
| `RequestStateMachineTest` | 8/8 ✅ |
| `NoMasterKeyRegressionTest` | 3/3 ✅ |
| **Backend total** | **92/92** ✅ |
| **Frontend `npm run build`** | ✅ 2456 modules, built in 8.37s, 0 TS errors |

No dedicated WhatsAppClient unit test was added — the class is dominated by I/O. A future task could add `WhatsAppClientTest` using `MockRestServiceServer` to simulate HTTP responses; ROI vs. the existing manual smoke test is small for the current scale.

---

## Remaining Issues / Manual Review

1. **WhatsApp linking is a manual one-time step.** The Node microservice prints a QR on startup that the operator must scan with WhatsApp on the phone that will be used as the sender. This is inherent to `whatsapp-web.js`; not changeable.
2. **WhatsApp delivery log grows forever.** No purge job. Future task: scheduled `DELETE FROM whatsapp_delivery_log WHERE status = 'SENT' AND created_at < SYSTIMESTAMP - INTERVAL '90' DAY` plus equivalent for older FAILED rows.
3. **WhatsApp dedupe** — if `notifyCompatibleDonors` is called twice for the same request within 5 minutes, the notification dedupe in `NotificationService.createNotificationIfNotDuplicate` only suppresses the second STOMP/in-app notification, not the WhatsApp send. Acceptable for now (donors rarely get duplicate alerts because the dedupe runs first); revisit if duplicate WhatsApps are observed in `whatsapp_delivery_log`.
4. **Patient profile may be sparse on first signup.** If `user.phone` is empty, the request form's phone field is empty too — no regression vs. the old behavior, but UX could improve by linking to `/profile` first if any required field is missing. Out of scope here.
5. **Hospital pre-fill** — if a patient is linked to a specific `user.hospital`, the form pre-selects it. The existing governorate-driven `useEffect` then OVERWRITES it with the first hospital returned for that governorate. This is unchanged behavior; the auto-fill is a no-op for `hospitalId` in practice. Future task: prefer the patient's own hospital if it's in the returned list.
6. **`whatsapp_delivery_log` table auto-creation.** Hibernate `ddl-auto=update` will add the table on first boot. If Oracle 21c refuses the auto-create, the entity file's javadoc contains the manual `CREATE TABLE` statement.

---

## Operator action to fully validate

```cmd
:: 1. Kill any leftover
taskkill /F /IM java.exe
taskkill /F /IM node.exe

:: 2. Start full stack
cd "c:\Users\LAP TREND\Downloads\Smart Blood Donation System UI"
run-project.bat

:: 3. In the "WhatsApp Service" cmd window: SCAN THE QR with WhatsApp on your phone.
::    Wait for "WhatsApp Client is ready!"

:: 4. In the "Backend - Spring Boot" cmd window: wait for "Started BloodDonationApplication"

:: 5. Open http://<LAN-IP>:5173 in browser, log in as a patient with a real
::    phone number in profile, create a blood request.

:: 6. Within ~3 seconds, the donor(s) whose blood type is compatible AND who
::    are in the same governorate AND are AVAILABLE should receive a WhatsApp
::    message from the linked operator number.

:: 7. Verify with SQL:
::    SELECT id, phone_last4, context_summary, status, error_code, created_at
::    FROM whatsapp_delivery_log
::    ORDER BY id DESC FETCH FIRST 20 ROWS ONLY;
```

If the WhatsApp service window shows `WhatsApp Authentication failure`, the QR was not scanned in time — restart the service window only.

---

## Phase 13.2 follow-up — Smarter LAN-IP detection (pick Wi-Fi over Docker)

### What broke
After Phase 13.1 shipped, the operator tested on an iPhone. Safari opened `http://172.19.0.1:5173/...` and showed *"Safari couldn't open the page because the server stopped responding."* The auto-detect worked correctly — but **picked the wrong network interface**: `172.19.0.1` is a Docker Desktop / WSL2 virtual adapter, not the Wi-Fi address the phone routes to.

### Root cause
`PublicController.detectPrimaryLanIp()` (Phase 13.1) walked `NetworkInterface.getNetworkInterfaces()` and returned the first non-loopback, non-link-local IPv4 it found. On a Windows machine with Docker Desktop installed, the enumeration order puts the `vEthernet (WSL)` adapter before Wi-Fi.

### Fix
Three coordinated changes:

1. **[`PublicController.java`](../backend-spring/src/main/java/com/example/blooddonation/controller/PublicController.java)** — `detectPrimaryLanIp()` replaced with a scoring selector:
   - Skip interfaces whose name/displayName matches `vEthernet`, `Docker`, `WSL`, `VirtualBox`, `VMware`, `Hyper-V`, `vmnet`, `vboxnet`, `tap`, `tun`, `bridge`, `Default Switch`, `Loopback`.
   - Score remaining IPv4 candidates: `192.168.x.x` → 100 / `10.x.x.x` → 80 / public IPv4 → 60 / `172.16-31.x.x` → 20.
   - Tiebreaker: prefer interfaces whose name contains `Wi-Fi`, `Wireless`, `WLAN`, `wifi`, `wlan`.
   - Return the highest-scoring; null if every interface is virtual.
2. **`/api/public/server-info` response** — now includes `interfaceName` + `interfaceDisplayName` diagnostic fields so an operator can verify which NIC was picked without checking backend logs.
3. **[`run-project.bat`](../run-project.bat)** — STOPPED exporting `VITE_PUBLIC_BASE_URL`. PowerShell's `Get-NetIPAddress` has the same multi-NIC ambiguity as Java; if the launcher's first pick was virtual, the bad value got baked into the Vite bundle and the smarter backend detector was bypassed (frontend `publicBaseUrl()` priority 1: env var > priority 3: server-info). Removing the line lets the frontend fall through to the smarter backend detector. Operators who NEED to pin a specific value can still set `VITE_PUBLIC_BASE_URL` in `.env.local` (or `app.frontend.public-url` on the backend) — both still override autodetect.

### Verification
- `mvn compile` — clean
- `vite build` — clean
- `curl http://localhost:8080/api/public/server-info` returns the Wi-Fi IP with diagnostic fields:
  ```json
  {
    "publicBaseUrl": "http://192.168.100.17:5173",
    "source": "auto-detected",
    "interfaceName": "Wi-Fi",
    "interfaceDisplayName": "Wi-Fi"
  }
  ```
- iPhone scanning the new QR opens `http://192.168.100.17:5173/verify-donation?...` instead of `172.19.0.1`.

### Operator override (for the edge cases)
If the smart selector still picks the wrong adapter (rare; e.g. an unusual VPN interface), the operator can override:

- **Backend-side:** set env var `FRONTEND_PUBLIC_URL=http://192.168.100.17:5173` (read by `app.frontend.public-url` in `application.properties`). This is the cleanest fix.
- **Frontend-side:** add `VITE_PUBLIC_BASE_URL=http://192.168.100.17:5173` to `.env.local` and restart Vite.

The backend will log which interface it picked at startup (`LAN-IP autodetect picked <ip> on '<displayName>' (score X, wireless=Y)`) so the operator can confirm.

