# Defense Day Runbook — Smart Blood Donation System

> One-page operator guide. Print this or keep it open during the defense.
> All commands are Windows cmd.

---

## 1) Start everything (one command)

```cmd
cd "C:\Users\LAP TREND\Downloads\Smart Blood Donation System UI"
run-project.bat
```

This opens **three** windows:
- **Backend - Spring Boot** → wait for `Started BloodDonationApplication`
- **WhatsApp Service** → wait for `[WA] CLIENT IS READY` (first run needs QR scan)
- **Frontend - React/Vite** → wait for `Local: http://localhost:5173`

The launcher also prints the LAN IP for your phone (e.g. `http://192.168.100.17:5173`).

---

## 2) Demo credentials

After running [the password-reset SQL](#9-recovery-known-good-admin-credentials):

| Role | Email | Password |
|------|-------|----------|
| Admin | `nourelkassyamin15@gmail.com` | `Admin1234!` |
| Donor / Patient / Hospital | register on the spot | minimum 8 chars |

---

## 3) The demo flow (~3 minutes)

**Login as patient** (create one if needed) → `Request Blood` → form auto-fills your name/blood/phone/governorate → submit.

**Login as donor** (different account, compatible blood type, same governorate, `AVAILABLE` status) → dashboard shows the new request → click `Accept` → click `Show QR`.

**QR scan on phone** (phone on same WiFi as laptop) → page opens public verify-donation form → fill 5 health questions → enter the staff email (hospital/admin account that's in the same hospital as the request) → submit.

Page shows green success → donor's dashboard updates → notifications appear → WhatsApp sent (if linked).

---

## 4) WhatsApp linking (one-time per session)

The WhatsApp Service window prints a QR code on first start. On your phone:

**WhatsApp → Settings → Linked Devices → Link a Device → Scan**

Wait for `[WA] CLIENT IS READY` before triggering any flow that should send WhatsApp.

If it gets stuck on `authenticated` for >2 min, the cached session is incompatible — fix:

```cmd
cd whatsapp-service
npm install whatsapp-web.js@latest
rmdir /S /Q .wwebjs_auth
rmdir /S /Q .wwebjs_cache
npm start
```

Then scan the new QR.

---

## 5) Quick health checks (paste in browser or curl)

| URL | Meaning |
|-----|---------|
| `http://localhost:8080/api/public/stats` | Backend up + DB connected |
| `http://localhost:8080/api/public/server-info` | What LAN IP the QR will use |
| `http://localhost:3001/health` | WhatsApp state (`ready: true` = good) |
| `http://localhost:5173` | Frontend up |

---

## 6) Common defense-day fixes

### Backend won't start — `ORA-01017`
Oracle credentials wrong / account locked. From cmd:
```cmd
sqlplus / as sysdba
```
```sql
ALTER USER system ACCOUNT UNLOCK;
ALTER USER system IDENTIFIED BY nour12345;
EXIT;
```
Restart with `run-project.bat`.

### Backend won't start — port 8080 already in use
```cmd
taskkill /F /IM java.exe
```
Then `run-project.bat`.

### QR opens 404 / "couldn't connect" on phone
The QR encoded `localhost` or a Docker IP. The latest code auto-detects via `/api/public/server-info`. Verify:
```cmd
curl http://localhost:8080/api/public/server-info
```
Should return `"publicBaseUrl": "http://192.168.x.x:5173"`. If it returns `172.19.x.x`, that's a Docker virtual adapter — open the dashboard at the LAN IP printed by `run-project.bat` instead of `localhost`.

### "Invalid staff credentials" on QR submit
Email is no longer registered as `HOSPITAL` or `ADMIN`. Check with:
```sql
SELECT id, email, role, hospital_id FROM users WHERE LOWER(email) = LOWER('YOUR_EMAIL');
```
If `role != HOSPITAL/ADMIN`, register a new HOSPITAL account or change the role.

### "Registration failed - Something went wrong"
Password too short (min 8 chars now). The error toast now says the exact reason — read it.

### Page shows old behavior / stale UI
Browser cached old JS. **Ctrl + Shift + R** (hard reload).

### Frontend won't compile after pulling new code
```cmd
rmdir /S /Q node_modules\.vite
npm install
npm run dev
```

---

## 7) What to mention in the defense

Talking points if asked about technical depth:

- **Security**: rate limiting (Bucket4j), password policy validator, BCrypt, JWT, case-insensitive email lookup, removed hardcoded master-key backdoor
- **Concurrency**: pessimistic locks on Request + QR token rows prevent double-accept / double-consume
- **Architecture**: layered (Controller → Service → Repository), DTO separation, soft-delete on Request + Notification, audit log table for WhatsApp deliveries
- **Performance**: 22 DB indexes, EAGER → LAZY entity migration, Vite manualChunks for vendor split, React.lazy for heavy routes
- **Real-time**: STOMP WebSocket notifications + WhatsApp side-channel for offline donors
- **Mobile**: QR public URL auto-detect from backend so dashboards opened at localhost still produce scannable QRs
- **Audit reports**: 16 markdown files in `audit/` documenting every phase

---

## 8) Repository

```
https://github.com/elnoon2/blood-donation-system
```

Latest work is on the `main` branch.

---

## 9) Recovery — known-good admin credentials

If somehow `Admin1234!` doesn't work for `nourelkassyamin15@gmail.com`, reset it:

```cmd
sqlplus system/nour12345@//localhost:1521/XEPDB1
```
```sql
UPDATE users SET password = '$2a$10$onhykLQNc.M8RazZlnR8Dux2jysvM240e/Z3wMToPw1bue6qqrVCq'
WHERE LOWER(email) = LOWER('nourelkassyamin15@gmail.com');
COMMIT;
EXIT;
```

That hash corresponds to `Admin1234!`. Same hash can reset any other test account by changing the WHERE clause.

---

## 10) Files to NOT touch on defense day

- `backend-spring/src/main/resources/application-local.properties` (your DB credentials)
- `whatsapp-service/.wwebjs_auth/` (your WhatsApp linked session)
- Anything in `node_modules/` or `target/`

Everything else is in git and recoverable from GitHub if needed.

---

## Audit trail (for the panel if they ask)

| Phase | Topic |
|-------|-------|
| 01-08 | Initial production audit (architecture, security, performance, database, competitor analysis, code quality, RCAs) |
| 09 | 16-batch full execution (tests, locks, rate limiting, eligibility, soft-delete, Flyway, EAGER→LAZY, etc.) |
| 11 | QR flow rebuild (public route + inline staff auth) |
| 12 | QR public URL fix + soft-delete + notifications panel |
| 13 | WhatsApp wiring + request auto-fill + Find Donors role fix |
| 13.1 / 13.2 | QR public URL auto-detect from backend (smart NIC selection) |
| 14 | "Invalid staff credentials" RCA — case-insensitive email lookup |
| 15 | Email-only QR verification (no password on the QR form) |
| 16 | Registration "Something went wrong" RCA — password policy + field-error parsing |

All in `audit/00-executive-summary.md` through `audit/16-register-failure-rca.md`.
