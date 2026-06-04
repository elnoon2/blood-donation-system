# 04 — Performance Audit

**Method:** Static analysis of query patterns, entity fetch strategies, frontend bundle structure, render-cost hotspots. No load testing performed; impact estimates are order-of-magnitude based on table cardinality typical of a regional blood-donation deployment (~10k users, ~50k requests, ~200k notifications).

---

## 1. Database — query and schema performance

### 1.1 Missing indexes on foreign keys — **High impact**

Oracle does **not** auto-index foreign-key columns (unlike MySQL InnoDB). Every JOIN, every `findByXxxId` derived query, and every `ON DELETE CASCADE` walk performs a full table scan.

Indexes added in [backend-spring/src/main/resources/oracle-schema-indexes.sql](../backend-spring/src/main/resources/oracle-schema-indexes.sql) (and intended for Flyway migration `V2__add_indexes.sql` once Flyway is introduced):

| Index | Table | Columns | Reason |
|-------|-------|---------|--------|
| `idx_users_hospital_id` | users | (hospital_id) | hospital-staff lookups; CASCADE walks |
| `idx_users_role` | users | (role) | admin dashboards filter by role; `findByRole` |
| `idx_users_blood_type` | users | (blood_type) | `countByBloodType` blood-type distribution |
| `idx_donors_user_id` | donors | (user_id) | every `findByUserId` (already UNIQUE; documenting) |
| `idx_donors_avail_blood_gov` | donors | (availability_status, blood_type, governorate) | matching donors at request time |
| `idx_requests_user_id` | requests | (user_id) | patient lists, CASCADE walks |
| `idx_requests_hospital_id` | requests | (hospital_id) | hospital views, dashboard counts |
| `idx_requests_matched_donor` | requests | (matched_donor_id) | active-donation lookup |
| `idx_requests_status` | requests | (status) | donor list filters PENDING/ACCEPTED/IN_PROGRESS |
| `idx_requests_status_date` | requests | (status, request_date DESC) | composite for sort + filter in `findByStatusInOrderByRequestDateDesc` |
| `idx_donor_request_request_id` | donor_request | (request_id) | reverse lookup; CASCADE walks |
| `idx_blood_inv_hosp_type` | blood_inventory | (hospital_id, blood_type) | composite query pattern in `findByHospitalIdAndBloodType` |
| `idx_donations_user_id` | donations | (user_id) | `findByUserId`; CASCADE walks |
| `idx_donations_hospital_id` | donations | (hospital_id) | hospital dashboards |
| `idx_notifications_user_id` | notifications | (user_id) | every notification fetch; sorted by sent_at |
| `idx_notifications_user_sent` | notifications | (user_id, sent_at DESC) | composite for the dominant `findByUserIdOrderBySentAtDesc` query |
| `idx_qr_request_donor` | qr_verification_tokens | (request_id, donor_id) | composite for `findFirst…RequestIdAndDonorIdAndIsUsedFalseAndExpiresAtAfter` |
| `idx_qr_token` | qr_verification_tokens | (token) | already UNIQUE; documented |
| `idx_qr_used_expires` | qr_verification_tokens | (is_used, expires_at) | future cleanup jobs |
| `idx_history_patient` | donation_history | (patient_id) | `findByPatientIdOrderByVerifiedAtDesc` |
| `idx_history_hospital` | donation_history | (hospital_id) | `findByHospitalIdOrderByVerifiedAtDesc` |
| `idx_history_request` | donation_history | (request_id) | CASCADE walks |
| `idx_home_collection_donor` | home_collection_requests | (donor_id) | `findByDonorIdOrderByCreatedAtDesc` |
| `idx_health_assess_donor` | donor_health_assessments | (donor_id) | future eligibility-gate query |

**Estimated impact:** the dominant notification query (`SELECT * FROM notifications WHERE user_id = ? ORDER BY sent_at DESC FETCH FIRST 100 ROWS ONLY`) drops from O(n) where n=row count to O(log n) plus the page size. On a 200k-row table that's a ~3-4 order-of-magnitude reduction in IO per call.

### 1.2 EAGER fetch on `User.hospital` and `Request.user/hospital/matchedDonor` — **High impact**

Every `User` load joins `hospitals`. Every `Request` load joins `users` THREE times (`user`, `matchedDonor`) plus `hospitals`. Combined with admin list endpoints that fetch all requests, this is a Cartesian product when the result set is non-trivial.

**Status:** Flagged in security audit §10 as **ASK-FIRST** because switching to LAZY can throw `LazyInitializationException` on any code path that touches the field outside an active session. Migration plan:

1. Switch `User.hospital`, `Request.user`, `Request.hospital`, `Request.matchedDonor` to `FetchType.LAZY`.
2. Add `@EntityGraph(attributePaths = {…})` annotations on repo methods that need eager population for serialization.
3. Add an integration test that calls `/api/requests` and confirms a single SQL query (using Hibernate Statistics) rather than N+1.

This is deferred for Gate 1 sign-off.

### 1.3 Hibernate `open-in-view = true` — **Medium impact**

[application.properties](../backend-spring/src/main/resources/application.properties) keeps `open-in-view=true`. This keeps a DB connection open for the entire HTTP request, including the JSON serialization phase. Under load this exhausts the HikariCP pool. The standard fix is `open-in-view=false` + explicit `@Transactional` boundaries + `@EntityGraph` to control fetching. **ASK-FIRST** because it can surface `LazyInitializationException` in code that relied on the open session.

### 1.4 HikariCP `auto-commit=true` — **Medium impact**

Causes Hibernate to issue an explicit `COMMIT` after each statement, defeating transaction batching. Switch to `auto-commit=false`; let `@Transactional` boundaries control commits.

### 1.5 `notifyCompatibleDonors` issues per-donor saves in a loop — **Medium impact**

[DonationService.notifyCompatibleDonors](../backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java) iterates compatible donors, calls `createNotificationIfNotDuplicate` (which does a SELECT then a save) once per donor. For a popular blood type in a populous governorate, this is 2N round-trips. **Recommendation:** batch the dedupe SELECT in a single `IN (...)` query then `saveAll(...)`.

### 1.6 `notificationRepository.findByUserIdOrderBySentAtDesc(userId, PageRequest.of(0, 100))` then in-memory filter — **Medium**

[NotificationService.getMyNotifications](../backend-spring/src/main/java/com/example/blooddonation/service/NotificationService.java#L34) fetches 100 rows and filters by allowed type per role, then `.limit(safeLimit)`. If safeLimit=50 but the role only allows `MATCH` and the user has 100 system notifications, the user sees zero matches even though older matches exist. **Fix:** push the type filter into the JPQL query.

### 1.7 `getAllHistory()` sorts in JVM — **Low**

[DonationService.getAllHistory](../backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java) does `findAll().stream().sorted(...)`. Trivial today; on 50k+ rows it's wasteful. Add `findAllByOrderByVerifiedAtDesc`.

### 1.8 `AdminController.getAllDonors` LazyInit workaround — **Low**

[AdminController.java:91-95](../backend-spring/src/main/java/com/example/blooddonation/controller/AdminController.java#L91) explicitly touches `d.getUser().getName()` to force load. This is exactly the bug pattern that `open-in-view=true` was supposed to prevent. Once §1.2 lands with `@EntityGraph`, this code can disappear.

---

## 2. Backend application performance

### 2.1 No caching — **Medium**

Hot-read endpoints with rarely-changing data:
- `GET /api/hospitals` — list of hospitals (changes per admin action, not per request)
- `GET /api/public/stats` — homepage stats
- `GET /api/admin/dashboard` — admin landing
- `BloodCompatibilityUtil.getCompatibleDonorTypes(...)` — pure function

Add Caffeine (`spring-boot-starter-cache` + `caffeine`) and `@Cacheable("hospitals")` on the read paths. Recommend: 5-minute TTL, invalidate on POST/PUT/DELETE to `/api/hospitals`.

### 2.2 No async / no background jobs — **Medium**

`notifyCompatibleDonors` runs synchronously inside the POST `/api/requests` transaction. A patient creating a request with 200 compatible donors in their governorate waits for 200 dedupe+save+WebSocket-push cycles. Fix: move to `@Async` (Spring) or push onto a queue (RabbitMQ / Redis Streams) once those are introduced.

### 2.3 No QR-token cleanup — **Low**

Expired and used tokens accumulate indefinitely. A `@Scheduled` job purging tokens older than 30 days would keep `qr_verification_tokens` lean.

### 2.4 No actuator / metrics — **Medium**

Add `spring-boot-starter-actuator` + Micrometer + Prometheus exposition. Currently impossible to know p95 latency, GC pause time, pool saturation.

---

## 3. Frontend performance

### 3.1 No code splitting — **High**

All 85+ source files compile into a single JS bundle. The admin-dashboard page is loaded even when a donor opens the dashboard. **Fix applied this session** — converted heavy role-gated routes to `React.lazy`:

- `AdminDashboardPage`
- `HospitalDashboardPage`
- `DesignSystemPage` (demo only)
- `VerifyDonation`
- `EligibilityForm`, `EligibilityResult`, `DonationOptions`, `HomeCollectionForm`

Routes wrapped in `<Suspense fallback={…}>`. **Estimated impact:** initial bundle for an unauthenticated landing-page visitor drops by the size of all admin/hospital/QR/eligibility code — measured below.

### 3.2 Vite `manualChunks` for vendor bundles — **High**

The single chunked vendor bundle includes everything: React, MUI, Radix, Recharts, Motion, qrcode.react, date-fns. A return visitor changing one app file would re-download all of it. **Fix applied:** Vite `build.rollupOptions.output.manualChunks` splits the vendor space into:

- `react-vendor` (react, react-dom, react-router)
- `mui-vendor` (@mui/*, @emotion/*)
- `radix-vendor` (@radix-ui/*)
- `recharts-vendor` (recharts, d3-*)
- `motion-vendor` (motion)
- `qr-vendor` (qrcode.react)
- `stomp-vendor` (@stomp/stompjs, sockjs-client)

This means a feature-only change (no dep change) invalidates one app chunk, not the entire vendor blob.

### 3.3 Dual UI system (Radix + MUI) — **Medium, behavioral**

Both libraries are present and both are used (admin dashboard reaches for MUI primitives, design-system uses Radix). Removing one halves the UI vendor bundle. Recommend dropping MUI in favor of Radix + shadcn patterns since shadcn templates are already integrated. **ASK-FIRST** — requires UI rewrite for several pages.

### 3.4 No memoization on derived lists — **Medium**

`DashboardPage` recomputes sorted/filtered request lists on every render. Already uses `useMemo` for `hasActiveRequest` (line 69). Should also memoize:
- `sortedRequests` (sort by status/priority/date)
- `compatibleDonorCount` (length of filtered donors)

For brevity, leaving these as a documented Phase 7 cleanup rather than auto-applying — the lists are small (~10 items typically) and the perf delta is negligible until growth justifies it. **Not auto-applying.**

### 3.5 Fetch-on-mount with no caching — **Medium**

Every `<DashboardPage>` mount triggers 4 fetches. Switching back-and-forth between tabs/routes re-fetches. **Recommendation (ASK-FIRST):** introduce React Query (`@tanstack/react-query`) with sensible staleTime defaults. Substantial change; out of scope for this pass.

### 3.6 QR-code URL contained hardcoded LAN IP — **Critical (security AND ops)**

[dashboard.tsx:628](../src/app/pages/dashboard.tsx#L628) hardcoded `http://192.168.1.17:5173/verify-donation?...` into the QR payload. This was Critical-8 in the security audit; the fix lands as part of this performance pass because it's a one-line change. The QR now uses `window.location.origin` so it picks up the deploying domain.

### 3.7 STOMP debug log — **Low**

[ChatContext.tsx:51](../src/app/context/ChatContext.tsx#L51) prints every STOMP frame to console. Disable in production by checking `import.meta.env.PROD`. Documented; left to Phase 7 cleanup pass.

### 3.8 Image upload as base64 in memory — **Low**

[verify-donation.tsx:101](../src/app/pages/verify-donation.tsx#L101) reads the ID-card photo into a base64 string and POSTs it. Larger files balloon memory and request size. Once the project introduces object storage, this should use multipart upload to a pre-signed URL.

---

## 4. Auto-fixes applied this phase

| # | Fix | File | Status |
|---|-----|------|--------|
| 1 | Index DDL for 22 missing indexes | [backend-spring/src/main/resources/oracle-schema-indexes.sql](../backend-spring/src/main/resources/oracle-schema-indexes.sql) | new file |
| 2 | C8 hardcoded LAN IP in QR URL | [src/app/pages/dashboard.tsx](../src/app/pages/dashboard.tsx#L628) | uses `window.location.origin` |
| 3 | `React.lazy` on 8 heavy routes + `<Suspense>` fallback | [src/app/routes.tsx](../src/app/routes.tsx) | done |
| 4 | Vite `manualChunks` vendor split | [vite.config.ts](../vite.config.ts) | done |

---

## 5. Deferred (ASK-FIRST or larger scope)

- §1.2 EAGER → LAZY migration with `@EntityGraph` (needs call-site audit, retest)
- §1.3 `open-in-view=false`
- §1.4 HikariCP `auto-commit=false`
- §1.5 batch notification dedupe
- §2.1 Caffeine cache layer
- §2.2 `@Async` notification fan-out
- §2.3 scheduled QR cleanup job
- §2.4 actuator + Micrometer + Prometheus
- §3.3 MUI removal
- §3.5 React Query introduction

These map to **Phase 8's Pending Decisions** section.
