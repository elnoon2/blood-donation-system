# 01 — Architecture & Inventory Report

**Project:** Smart Blood Donation System ("LifeFlow")
**Audit date:** 2026-05-30
**Auditor:** Principal architect / senior security engineer review
**Scope:** Full system as committed to `main` branch at the time of audit.

---

## 1. System Overview

LifeFlow is a multi-role blood-donation platform connecting donors, patients, hospitals, and administrators in Egypt. It comprises:

```
┌──────────────────────────┐        HTTPS/JSON         ┌──────────────────────────┐
│  React 18 / Vite 6 SPA   │  ──────────────────────▶  │ Spring Boot 3.2.5 REST   │
│  (src/)                  │  ◀──────────────────────  │ (backend-spring/)        │
│  Tailwind + Radix + MUI  │     JWT Bearer auth       │  Java 17, Maven          │
└────────────┬─────────────┘                           └────────────┬─────────────┘
             │                                                       │
             │ SockJS/STOMP                                          │ JDBC
             │ (/ws-chat)                                            ▼
             │                                              ┌────────────────────┐
             └─────────────────────────────────────────────▶│  Oracle XE 11g     │
                                                            │  (13 tables)       │
                                                            └────────────────────┘
                                                                     ▲
                                                                     │ (unused)
                                                            ┌────────┴───────────┐
                                                            │ WhatsApp service   │
                                                            │ Node.js + express  │
                                                            │ whatsapp-web.js    │
                                                            │ (port 3001)        │
                                                            └────────────────────┘
```

The WhatsApp microservice is **not currently wired into the Spring backend** — no Java code calls `http://localhost:3001/api/whatsapp/send`. It is effectively dead code with an open attack surface.

---

## 2. Repository Layout

| Path | Purpose |
|------|---------|
| [src/](../src/) | React/Vite SPA (TypeScript) |
| [backend-spring/](../backend-spring/) | Spring Boot REST API |
| [whatsapp-service/](../whatsapp-service/) | Node.js WhatsApp microservice (unused) |
| [static-version/](../static-version/) | Legacy static HTML pages (archived) |
| [smart-blood-donation-system/](../smart-blood-donation-system/) | Empty placeholder directory |
| [dist/](../dist/) | Frontend build output (gitignored) |
| [Dockerfile](../Dockerfile), [compose.yaml](../compose.yaml) | Container packaging (compose is empty template) |
| [run-project.bat](../run-project.bat), [fix-and-run.bat](../fix-and-run.bat) | Dev launchers |
| [reset_pass.sql](../reset_pass.sql), [reset_pass_sys.sql](../reset_pass_sys.sql) | DB password reset scripts (contain plaintext credentials) |
| `*.md` docs | README, COMPLETE_PROJECT_DOCUMENTATION, FEATURES_SHOWCASE, PRESENTATION_PLAN, PROJECT_OVERVIEW, QUICK_START |

---

## 3. Backend Architecture

**Pattern:** Classic Spring layered MVC (Controller → Service → Repository → Entity).

### 3.1 Package map (`com.example.blooddonation`)

| Package | Files | Purpose |
|---------|-------|---------|
| `config` | 3 | WebSocket config, STOMP auth interceptor, schema patcher |
| `controller` | 9 | REST endpoints |
| `dto` | 21 | Request/response payloads |
| `entity` | 17 | JPA entities |
| `enums` | 6 | Role, RequestStatus, DonationStatus, EligibilityResult, NotificationType, CollectionRequestStatus |
| `exception` | 2 | GlobalExceptionHandler, ResourceNotFoundException |
| `repository` | 17 | Spring Data JPA repositories |
| `security` | 5 | WebSecurityConfig, JwtUtils, AuthTokenFilter, UserDetailsImpl, UserDetailsServiceImpl |
| `service` | 6 | DonationService, EligibilityService, NotificationService, QRService, RecommendationService (referenced but not present), + utility helpers |
| `util` | 2 | BloodCompatibilityUtil, GeoUtils |

### 3.2 Controllers & endpoint inventory

| Controller | Base path | Endpoint count | Auth model |
|------------|-----------|----------------|-------------|
| `AuthController` | `/api/auth` | 3 | permitAll on register/login; authenticated on `/me` |
| `DonationController` | `/api/donations` | 4 | Mixed; `GET /{id}` is permitAll **(critical issue)** |
| `RequestController` | `/api/requests` | 7 | Role-based via `@PreAuthorize` + body checks |
| `QRVerificationController` | `/api/verify-donation` | 5 | Mixed; `GET /validate` is permitAll **(critical issue)** |
| `NotificationController` | `/api/notifications` | 4 | Authenticated; also STOMP handler |
| `AdminController` | `/api/admin` | 14 | Class-level `@PreAuthorize("hasRole('ADMIN')")` |
| `DonorController` | `/api/donors` | 8 | Mixed roles |
| `HospitalVerifyController` (`/api/hospitals`) | `/api/hospitals` | 5 | Public GET; admin CUD |
| `PublicController` | `/api/public` | 1 | permitAll stats |

### 3.3 Entities (17) — full inventory

`User`, `Donor`, `Hospital`, `Request`, `Donation`, `DonationVerification`, `QRVerificationToken`, `BloodInventory`, `DonorHealthAssessment`, `HomeCollectionRequest`, `DonationHistory`, `Message`, `Notification`, `AdminAction`, `DonationForm`, `DonorRequest` (junction), and a referenced `RequestAudit` (entity missing — only the repository exists).

### 3.4 Security stack

| Concern | Implementation | Notes |
|---------|----------------|-------|
| Auth filter | `AuthTokenFilter extends OncePerRequestFilter` | Silent failure on invalid token (H5) |
| Token | JJWT 0.11.5, HS512 | Secret in `application.properties` (C3); 24h TTL |
| Password hash | BCrypt | OK |
| CSRF | Disabled | Acceptable for stateless Bearer-token API |
| Session | `STATELESS` | Correct |
| CORS | Hardcoded patterns incl. `192.168.*:*` | H4 |
| RBAC | Spring `@PreAuthorize` + role checks in method bodies | Inconsistent — some controllers permitAll critical endpoints |

### 3.5 Real-time / async

- **STOMP/WebSocket:** `/ws-chat` endpoint, SockJS fallback, message broker `/user`/`/topic`/`/queue`, custom auth interceptor.
- **No `@Async`** operations anywhere.
- **No `@Scheduled`** jobs anywhere (no eligibility re-checks, donation reminders, token cleanup).

---

## 4. Frontend Architecture

**Pattern:** Client-rendered SPA, React Context for state, no global store.

### 4.1 Stack

| Layer | Library | Version |
|-------|---------|---------|
| Framework | React | 18.3.1 |
| Build | Vite | 6.3.5 |
| Language | TypeScript | 5.x |
| Routing | React Router | 7.13.0 |
| UI primitives | Radix UI | 1.x–2.x (~40 packages) |
| UI components | MUI (Material-UI) | 7.3.5 + Emotion 11 |
| Styling | Tailwind CSS | 4.1.12 + @tailwindcss/vite |
| HTTP | Axios | 1.15.0 |
| WebSocket | @stomp/stompjs + sockjs-client | 7.3.0 / 1.6.1 |
| Forms | React Hook Form | 7.55.0 (used sparingly) |
| Charts | Recharts | 2.15.2 |
| QR codes | qrcode.react | 4.2.0 |
| Toasts | Sonner | 2.0.3 |
| Animation | Motion | 12.23.24 |

**Dual UI system risk:** Both Radix UI and MUI are installed and used. This roughly doubles vendor-CSS-in-JS payload. `next-themes` is installed without Next.js.

### 4.2 Route map (`src/app/routes.tsx`)

18 routes across landing, auth, donor, patient, admin, hospital, QR-verify, eligibility, home-collection. Guards: `ProtectedRoute` (auth) and `PublicRoute` (anti-auth); role gates strip `ROLE_` prefix and compare uppercase.

### 4.3 Auth flow

- JWT + user JSON in `localStorage` (H7 — XSS-stealable).
- Axios request interceptor injects `Authorization: Bearer …` from localStorage on every call.
- Response interceptor: on 401/403 for non-public endpoints, clears auth and redirects to `/login`.
- No refresh-token mechanism — expiry forces full re-login at 24h.

### 4.4 API integration

- Base URL `/api` (relative).
- Dev: Vite proxy `/api → http://127.0.0.1:8080` in [vite.config.ts](../vite.config.ts).
- Prod: assumes co-located deployment (backend serves the SPA, e.g. via Spring static resources or a reverse proxy).

### 4.5 Real-time

- `ChatContext` connects STOMP via SockJS in [src/app/context/ChatContext.tsx](../src/app/context/ChatContext.tsx).
- Bearer token sent in `connectHeaders` — must be WSS in production (currently HTTP/WS in dev).

---

## 5. Data Tier

- **Engine:** Oracle XE 11g.
- **Schema management:** `spring.sql.init.mode=always` re-runs [oracle-schema](../backend-spring/src/main/resources/oracle-schema) and [oracle-data.sql](../backend-spring/src/main/resources/oracle-data.sql) on every boot (H9 — destructive against existing prod data).
- **Pool:** HikariCP with `auto-commit=true` (suboptimal for transactional services).
- **Migrations:** None. No Flyway/Liquibase. Schema versioning is by overwriting the SQL file.
- **Tables:** 13–15 (see Phase 5 audit). All FK constraints present; all FK **columns unindexed** (H3).

---

## 6. Auxiliary Services

### 6.1 WhatsApp microservice (`whatsapp-service/`)

- **Runtime:** Node.js + Express, `whatsapp-web.js` 1.34.7 (unofficial WhatsApp Web scraper using a headless Chromium with Puppeteer).
- **Endpoint:** `POST /api/whatsapp/send` — accepts `{ phone, message }`.
- **Auth:** None. CORS `*`. Binds `0.0.0.0:3001`. (C7)
- **Session storage:** `.wwebjs_auth/` (gitignored) — unencrypted Chromium cookies/tokens for the operator's WhatsApp account.
- **Integration:** Zero references from Spring backend or frontend (`grep` over the repo finds no `localhost:3001` consumer). Frontend uses `wa.me/` deep-links in `donor-card.tsx` instead. **The service is dead code with an open RCE-adjacent surface** — anyone reachable can post arbitrary messages from the operator's account, and the unofficial library's Chromium-on-the-box risks (sandbox disabled via `--no-sandbox`) are real.

### 6.2 Static HTML version (`static-version/`)

- Pre-React HTML mocks (index/login/register/about) with shared `style.css`.
- Not served, not tested, not maintained. Candidate for removal.

### 6.3 Empty placeholder (`smart-blood-donation-system/`)

- Empty directory with no purpose. Candidate for removal.

---

## 7. Build & Deployment

### 7.1 Dockerfile

Multi-stage:
1. `node:20-slim` → builds frontend (`npm install --legacy-peer-deps; npm run build`).
2. `maven:3.9-eclipse-temurin-17` → builds backend (`mvn package -DskipTests`).
3. `eclipse-temurin:17-jre-jammy` → runtime, exposes 8080.

Issues:
- Runs as `root` (no `USER` directive) — H8.
- No `HEALTHCHECK`.
- Base images use floating tags (no digest pin).
- Build skips backend tests entirely.
- WhatsApp service not built or shipped.

### 7.2 compose.yaml

Entirely commented-out template — no actual services, no database, no networking. Effectively absent.

### 7.3 Dev launchers

`run-project.bat` spawns three windows (backend `mvn spring-boot:run`, whatsapp-service `npm start`, frontend `npm run dev`). Detects LAN IP. Not a production deployment tool.

`fix-and-run.bat` is destructive (force-kill Java/Node, rebuild). Dev cleanup only.

### 7.4 CI/CD

None. No `.github/workflows/`, no GitLab CI, no Jenkinsfile. No automated testing, secret scanning, or release pipeline.

---

## 8. Dependency Risk Matrix

### Backend

| Dependency | Version | Risk | Note |
|------------|---------|------|------|
| spring-boot-starter-parent | 3.2.5 | Low | Released Feb 2024; within LTS but newer 3.3.x available |
| spring-security (transitive) | 6.2.x | Low | Current |
| ojdbc11 | (default) | Low | Oracle JDBC for 11g/12c+ |
| jjwt-api/impl/jackson | 0.11.5 | **Medium** | 0.12.x is current; API-compatible upgrade recommended |
| lombok | (parent) | Low | Compile-time only |

### Frontend

| Dependency | Version | Risk | Note |
|------------|---------|------|------|
| react / react-dom | 18.3.1 | Low | React 19 stable since 2024; upgrade is non-urgent |
| @mui/material | 7.3.5 | Medium | Heavyweight; consider removing in favor of Radix |
| @radix-ui/* | mixed | Low | Standard primitives |
| next-themes | 0.4.6 | **Low** | Installed without Next.js — dead dep |
| recharts | 2.15.2 | Low | Watch bundle size |
| whatsapp-web.js | 1.34.7 (in whatsapp-service) | **High** | Unofficial; subject to breakage and WhatsApp ToS issues |

---

## 9. Stack Risk Summary

| Area | Risk level | One-line reason |
|------|------------|------------------|
| Authentication / authorization | **High** | Hardcoded backdoor + public sensitive endpoints |
| Secrets management | **Critical** | DB password and JWT secret committed in plaintext |
| Database performance | **High** | Zero indexes on FKs + EAGER loading on hot entities |
| Schema migrations | **High** | `sql.init.mode=always` against prod = data loss risk |
| Side-channel (WhatsApp svc) | **Critical** | Unauthenticated dead service exposed on 3001 |
| Container hardening | **Medium** | Runs as root, no healthcheck, no compose |
| Frontend bundle | **Medium** | Dual UI lib + no code splitting |
| Test coverage | **High** | Zero automated tests detected |
| CI/CD | **High** | None |
| Real-time channel | **Medium** | STOMP works, but WSS not enforced; debug logging on |

---

## 10. What's Missing vs. a Production Reference Stack

The current architecture lacks the following that a production blood-donation platform would require:

| Missing capability | Why it matters |
|--------------------|----------------|
| Outbound email service | Notifications fall back to WhatsApp only; many users won't have WhatsApp |
| SMS gateway (Twilio / Vonage / Egypt-local) | WhatsApp coverage is uneven; SMS is the universal channel for OTPs and urgent alerts |
| Object storage (S3 / Azure Blob) | ID-card images currently base64 in DB columns — won't scale |
| Background job runner (e.g. Spring Batch + Quartz, or a dedicated worker) | Eligibility re-check, donor reminders, token expiration cleanup all need cron-like execution |
| Caching tier (Redis / Caffeine) | Hospital lists, donor recommendations, public stats are all hot reads |
| Observability (logs/metrics/traces) | Currently `System.err.println` debug; no Micrometer, no Prometheus, no Sleuth |
| Rate limiter (Bucket4j) | No defenses against credential stuffing, QR-token brute-force, request spam |
| Feature flags | All-or-nothing deploys |
| Audit logging (Hibernate Envers / Spring Modulith events) | Medical records demand provable history; current hard CASCADE wipes audit trail |
| Backups | No documented backup/restore for the Oracle DB |

These are not listed as defects — they are absent capabilities to be planned into a roadmap.

---

## 11. Inputs to Subsequent Phases

This architecture report feeds the rest of the audit:

- **Phase 2 (business logic)** will deep-read the services listed in §3.1.
- **Phase 3 (security)** will weaponize the findings in §3.4, §4.3, §6.1.
- **Phase 4 (performance)** will exploit §3.5 (no async) and §5 (no indexes).
- **Phase 5 (database)** will fully expand §5 with per-table review.
- **Phase 6 (competitor analysis)** uses §10 as the gap-list anchor.
- **Phase 7 (code quality)** uses §4.1 (dual UI), §6.2/§6.3 (dead code), §7.4 (no CI).
- **Phase 8** rolls everything into the exec summary.
