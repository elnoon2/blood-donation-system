# Smart Blood Donation System

Modern, secure platform localized for the Egyptian market that connects blood donors with patients and hospitals in real time. Runs on Oracle Database with a Spring Boot 3 backend and a React 18 / Vite frontend.

> **Heads up:** this project has been through a full production-readiness audit. Read [audit/00-executive-summary.md](audit/00-executive-summary.md) before deploying anywhere reachable from the public internet, and read [audit/08-rca-ora-01017.md](audit/08-rca-ora-01017.md) if your backend fails to start with an Oracle login error.

---

## Features at a glance

- **Smart matching** by blood type + Egyptian governorate, with universal-donor (O-) compatibility logic.
- **Three primary roles** — Donor, Patient, Admin — plus Hospital and Doctor sub-roles.
- **QR-based donation verification** for hospital reception.
- **Real-time notifications** via STOMP/WebSocket; WhatsApp microservice for outbound messages (gated by shared secret).
- **Admin dashboard** with stats, user/hospital management, and approval workflows.

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18 + Vite 6 + TypeScript + Tailwind CSS + Radix UI |
| Backend | Spring Boot 3.2 + Spring Security + JWT (JJWT) |
| Persistence | Spring Data JPA / Hibernate 6 on Oracle XE 18c/21c |
| Realtime | STOMP over SockJS |
| Side-channel | Node.js `whatsapp-web.js` microservice (port 3001, loopback by default) |

---

## Quick start (Windows)

1. Install **Node.js 20+**, **JDK 17+**, **Maven 3.9+**, and **Oracle XE** (listener on `1521`).
2. **Set up the local config override** (one-time):
   ```cmd
   copy backend-spring\src\main\resources\application-local.properties.example ^
        backend-spring\src\main\resources\application-local.properties
   ```
   > Use `copy` — not `move` or `rename`. The `.example` file must stay in the repo so other contributors can do the same setup.

   Then open `application-local.properties` and set `spring.datasource.password` to your local Oracle password. The destination file (without `.example`) is gitignored so the secret stays on your machine.

   > **Oracle XE 18c / 21c users:** uncomment the `spring.datasource.url=jdbc:oracle:thin:@//localhost:1521/XEPDB1` line in `application-local.properties`. The default URL uses the legacy SID form `:1521:xe` which only works on Oracle XE 11g; modern XE exposes its Pluggable Database as service-name `XEPDB1`. Symptom of getting this wrong: `ORA-01017 invalid username/password` even when the password is correct (Oracle returns 01017 for "cannot find user in this container" too).

4. **Mobile QR scanning (Phase 12)**: donor QR codes embed a URL that a phone scanning them must be able to reach. Open the donor's dashboard at the **LAN IP** (`http://<your-LAN-IP>:5173` — `run-project.bat` prints this) instead of `localhost`. Alternatively, set `VITE_PUBLIC_BASE_URL` in a `.env.local` file at project root (see `.env.example`) to lock the QR base URL to a specific host. The dashboard shows a warning toast if you try to generate a QR while running on localhost.
3. Optionally set `JWT_SECRET` in the same file to a long random string (>=64 bytes); a placeholder is provided.
4. Double-click `run-project.bat`. It checks for the local config (or a `DB_PASSWORD` env var) and aborts with instructions if neither is present.
5. Backend at <http://localhost:8080>, frontend at <http://localhost:5173>. Wait for `Started BloodDonationApplication` in the backend window before logging in.

If you hit `ORA-01017` at startup, see [audit/08-rca-ora-01017.md](audit/08-rca-ora-01017.md). The Spring `DataSourceFailureAnalyzer` will also print remediation steps directly in the backend window.

---

## Production configuration

In any non-local environment, supply credentials via environment variables — **never** commit them.

| Variable | Required | Notes |
|----------|----------|-------|
| `DB_URL` | yes | e.g. `jdbc:oracle:thin:@db.internal:1521:ORCL` |
| `DB_USERNAME` | yes | dedicated app schema, not `system` |
| `DB_PASSWORD` | yes | rotated regularly |
| `JWT_SECRET` | yes | >= 64 bytes; fail-fast rejects placeholder values in non-dev profiles |
| `JWT_EXPIRATION_MS` | no | default 86400000 (24h) |
| `CORS_ALLOWED_ORIGINS` | yes | comma-separated exact origins; no wildcards |
| `SQL_INIT_MODE` | no | leave at `embedded`; never `always` against production |
| `LOG_SQL_LEVEL` | no | default `WARN` |
| `PORT` | no | default 8080 |
| `WHATSAPP_INTERNAL_TOKEN` | yes (whatsapp service) | shared secret the backend sends as `X-Internal-Token` |
| `WHATSAPP_BIND_ADDRESS` | no | default `127.0.0.1`; widen only behind a private network |

---

## Repository layout

| Path | Purpose |
|------|---------|
| [src/](src/) | React/Vite frontend (TypeScript) |
| [backend-spring/](backend-spring/) | Spring Boot REST API |
| [whatsapp-service/](whatsapp-service/) | Node WhatsApp microservice |
| [audit/](audit/) | Production-readiness audit reports |
| [Dockerfile](Dockerfile) | Multi-stage Docker build |
| [run-project.bat](run-project.bat) | Windows dev launcher |

---

## Database schema

Oracle schema in [backend-spring/src/main/resources/oracle-schema.sql](backend-spring/src/main/resources/oracle-schema.sql) (13 tables: hospitals, users, donors, requests, donor_request, blood_inventory, donations, notifications, donation_history, admin_actions, qr_verification_tokens, donation_verifications, donation_forms, donor_health_assessments, home_collection_requests).

Performance indexes in [backend-spring/src/main/resources/oracle-schema-indexes.sql](backend-spring/src/main/resources/oracle-schema-indexes.sql) — apply once per environment.

---

## Audit reports

- [00 — Executive summary](audit/00-executive-summary.md)
- [01 — Architecture](audit/01-architecture.md)
- [02 — Business logic](audit/02-business-logic.md)
- [03 — Security](audit/03-security.md)
- [04 — Performance](audit/04-performance.md)
- [05 — Database](audit/05-database.md)
- [06 — Competitor analysis](audit/06-competitor-analysis.md)
- [07 — Code quality](audit/07-code-quality.md)
- [08 — RCA: ORA-01017 startup failure](audit/08-rca-ora-01017.md)

---

## Support

For bug reports / feature requests: open an issue. Project context: Egyptian market focus, 27 governorates supported, Arabic localization on the roadmap (see [audit/06-competitor-analysis.md §5](audit/06-competitor-analysis.md#5-improvement-roadmap)).
