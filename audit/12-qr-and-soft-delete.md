
# 12 — QR Public URL + Soft-Delete Request + Notifications UX

**Scope:** Focused three-task implementation. Explicit non-goals: no refactoring of unrelated modules, no removal of existing features, no business logic changes outside these three tasks.
**Status:** Backend `mvn test` → **92/92 passing, BUILD SUCCESS**. Frontend `vite build` → **2456 modules, built in 9.77s**.

---

## TASK 1 — QR localhost fix

### Root cause
[dashboard.tsx:665](../src/app/pages/dashboard.tsx#L665) embedded `${window.location.origin}` directly in the QR. If the donor opens the dashboard at `http://localhost:5173`, the QR carries `http://localhost:5173/verify-donation?...` — a mobile device cannot resolve `localhost` to the dev machine, so Safari shows *"Safari can't open the page because it couldn't connect to the server."*

### Fix
1. **New utility [src/lib/public-url.ts](../src/lib/public-url.ts)** — `publicBaseUrl()` returns `{ url, source, isLocalhost }` with priority order:
   - `import.meta.env.VITE_PUBLIC_BASE_URL` (operator-configured)
   - `window.location.origin` if not localhost
   - `window.location.origin` (localhost) with `isLocalhost=true` so callers can warn
2. **[dashboard.tsx](../src/app/pages/dashboard.tsx)** — QR `value` uses `publicBaseUrl().url`. `handleShowQR` shows a one-time `toast.warning` if the resolved base is localhost.
3. **[run-project.bat](../run-project.bat)** — exports `VITE_PUBLIC_BASE_URL=http://<LAN-IP>:5173` to the Vite child process alongside `VITE_API_BASE_URL`.
4. **[.env.example](../.env.example)** — new file at project root documenting the two Vite env vars.
5. **[README.md](../README.md)** — added a "Mobile QR scanning" section explaining LAN-IP requirement.

### Resulting QR URL
- With `VITE_PUBLIC_BASE_URL=http://192.168.100.17:5173` set (the default if launched via `run-project.bat`): `http://192.168.100.17:5173/verify-donation?request_id=...&token=...` — scannable from any phone on the same WiFi.
- Without the env var, dashboard opened at LAN IP: same result via origin fallback.
- Without the env var, dashboard opened at `localhost`: `http://localhost:5173/...` is still embedded (preserves dev-on-laptop behavior) but the user sees a yellow warning toast.

---

## TASK 2 — Soft-Delete Request

### Approach
Add `requests.deleted_at TIMESTAMP NULL` column (added on next boot via Hibernate `ddl-auto=update`). Repository queries get explicit `WHERE r.deletedAt IS NULL` filters via `@Query` annotations. **Deliberately NOT using Hibernate `@SQLDelete`/`@Where`** because that pattern broke previously on the User entity ([audit/09-rca-followup.md](09-rca-followup.md)). Explicit JPQL is safer and easier to bypass for admin "show all" needs.

### Backend changes
| File | Change |
|------|--------|
| [Request.java](../backend-spring/src/main/java/com/example/blooddonation/entity/Request.java) | Added `@Column(name="deleted_at") private LocalDateTime deletedAt` |
| [RequestRepository.java](../backend-spring/src/main/java/com/example/blooddonation/repository/RequestRepository.java) | Every list/exists query rewritten as explicit `@Query` with `AND r.deletedAt IS NULL`. New `findAllIncludingDeleted()` for admin / data-retention use. `findByIdForUpdate` intentionally does NOT filter (internal lookups still see soft-deleted rows). |
| [RequestController.java](../backend-spring/src/main/java/com/example/blooddonation/controller/RequestController.java) | New `DELETE /api/requests/{id}` endpoint with: ownership check (patient OR matched donor OR admin), status guard (COMPLETED/REJECTED/CANCELLED → 409; ACCEPTED/IN_PROGRESS → require `?confirmed=true`; PENDING → freely deletable), 404 for already-soft-deleted, sets `deletedAt = now()`. |
| `AdminController.deleteRequest` | **Unchanged** — admin keeps the existing hard-delete path on `/api/admin/requests/{id}`. |

### Frontend changes
| File | Change |
|------|--------|
| [dashboard.tsx](../src/app/pages/dashboard.tsx) | Replaced admin-only `handleDeleteRequest` with `performDeleteRequest` that calls `DELETE /api/requests/{id}` (adds `?confirmed=true` for ACCEPTED/IN_PROGRESS). Delete button is shown for owning patient, matched donor, or admin (`canDeleteRequest(request)`). Click opens an `AlertDialog` with contextual copy (simple confirm for PENDING; stronger "matched donor will be cancelled" warning for ACCEPTED/IN_PROGRESS). Local request list updates optimistically on success; specific error toasts per HTTP status (403 / 404 / 409). |

### HTTP contract
```
DELETE /api/requests/{id}?confirmed=true|false
  200 → { message: "Request deleted." }
  403 → caller is not the owner / matched donor / admin
  404 → request not found OR already soft-deleted
  409 → status is COMPLETED / REJECTED / CANCELLED, OR ACCEPTED/IN_PROGRESS without ?confirmed=true
```

---

## TASK 3 — Notifications: Scroll + Read All + Clear All

### Backend changes
| File | Change |
|------|--------|
| [Notification.java](../backend-spring/src/main/java/com/example/blooddonation/entity/Notification.java) | Added `@Column(name="cleared_at") private LocalDateTime clearedAt` |
| [NotificationRepository.java](../backend-spring/src/main/java/com/example/blooddonation/repository/NotificationRepository.java) | `findByUserIdOrderBySentAtDesc` queries now filter `n.clearedAt IS NULL`. `markAllReadByUserId` filters `clearedAt IS NULL` (don't re-mark cleared rows). New `softClearByUserId(userId, now)` `@Modifying` query updates `cleared_at` for visible rows. Dedupe query (`existsDuplicateNotification`) intentionally still scans all rows so a cleared alert isn't re-issued five minutes after the user cleared it. |
| [NotificationService.java](../backend-spring/src/main/java/com/example/blooddonation/service/NotificationService.java) | `clearAll(userId)` switched from hard-delete (`deleteByUserId`) to soft-clear (`softClearByUserId`). |

### Frontend changes
[dashboard.tsx](../src/app/pages/dashboard.tsx) Notifications panel:
- Wrapped list in `<div class="max-h-96 overflow-y-auto pr-2">` — page can no longer overflow on long notification lists.
- New `Read All` button (blue outline, `CheckCheck` icon) → `POST /api/notifications/read-all` → marks all locally as read, toast.
- New `Clear All` button (red outline, `X` icon) → opens `AlertDialog` ("They'll disappear from your panel but stay in the database for history") → `DELETE /api/notifications/clear-all` → empties local list, toast.
- Cleared notifications gain `opacity-70` so already-read rows visually de-emphasize.
- Button group hides when notification list is empty.
- `Read All` button is disabled if every notification is already read (so the click is a true no-op).

### HTTP contract (existing endpoints; behavior changed)
```
POST   /api/notifications/read-all   → marks all unread → returns { count: N }
DELETE /api/notifications/clear-all  → soft-clears all visible (sets cleared_at)
                                       → returns { count: N }
                                       → rows REMAIN in DB
```

---

## TASK 4 + 5 — Health Check (scoped to touched modules)

### Build & test
- `cd backend-spring && mvn clean compile` → **BUILD SUCCESS**
- `cd backend-spring && mvn test` → **92/92 passing** (NoMasterKeyRegressionTest 3, EligibilityServiceTest 9, QRServiceTest 4, RequestStateMachineTest 8, BloodCompatibilityUtilTest 68 — all pre-Phase-12 tests still green after entity + repository changes)
- `npm run build` → **2456 modules, built in 9.77s**, zero TS errors. New chunks include the AlertDialog code (radix-vendor grew from 16 KB → 45 KB because we now pull AlertDialog primitives that weren't loaded before)

### Manual smoke test checklist (operator)
1. **QR fix:** Start with `run-project.bat`. Open `http://<LAN-IP>:5173`, log in as donor, accept a request, click Show QR. Inspect the QR contents (scan with phone): URL must start with the LAN IP, not `localhost`. Page opens the verify form.
2. **QR fix fallback:** Stop the dev server. Open `http://localhost:5173` directly without `VITE_PUBLIC_BASE_URL` set, click Show QR — yellow warning toast appears.
3. **Soft-delete PENDING:** As patient, create a PENDING request, click red trash icon → dialog → Delete. Card disappears immediately. In Oracle: `SELECT id, status, deleted_at FROM requests WHERE id = X;` — row exists, `deleted_at` populated.
4. **Soft-delete COMPLETED (negative):** Find a COMPLETED request — trash icon hidden entirely (`canDeleteRequest` returns false).
5. **Soft-delete ACCEPTED with extra confirm:** As donor (matched on an ACCEPTED request), click trash. Dialog shows the stronger "matched donor will be cancelled" copy. Confirm. Request soft-deleted; `?confirmed=true` was sent on the backend call (visible in browser DevTools Network).
6. **Notifications scroll:** With many notifications, panel scrolls within `max-h-96` (~384px). Page outer scroll unaffected.
7. **Read All:** Click → all unread badges disappear; `Read All` button disables (now no-op). Refresh page → still all read.
8. **Clear All:** Click → confirm dialog → confirm. List empties. In Oracle: `SELECT COUNT(*) FROM notifications WHERE user_id = X AND cleared_at IS NULL;` = 0; `SELECT COUNT(*) FROM notifications WHERE user_id = X;` = original count.

---

## Files modified (10) + created (3)

**Created:**
- [src/lib/public-url.ts](../src/lib/public-url.ts)
- [.env.example](../.env.example)
- [audit/12-qr-and-soft-delete.md](12-qr-and-soft-delete.md) (this file)

**Modified:**
- [backend-spring/.../entity/Request.java](../backend-spring/src/main/java/com/example/blooddonation/entity/Request.java) — added `deletedAt` field
- [backend-spring/.../entity/Notification.java](../backend-spring/src/main/java/com/example/blooddonation/entity/Notification.java) — added `clearedAt` field
- [backend-spring/.../repository/RequestRepository.java](../backend-spring/src/main/java/com/example/blooddonation/repository/RequestRepository.java) — explicit `@Query` with `deletedAt IS NULL` on all list methods
- [backend-spring/.../repository/NotificationRepository.java](../backend-spring/src/main/java/com/example/blooddonation/repository/NotificationRepository.java) — filter clearedAt + new `softClearByUserId`
- [backend-spring/.../service/NotificationService.java](../backend-spring/src/main/java/com/example/blooddonation/service/NotificationService.java) — `clearAll` now soft-clears
- [backend-spring/.../controller/RequestController.java](../backend-spring/src/main/java/com/example/blooddonation/controller/RequestController.java) — new `softDeleteRequest` endpoint
- [src/app/pages/dashboard.tsx](../src/app/pages/dashboard.tsx) — QR uses `publicBaseUrl()` with warning, Delete button visible to owners with `AlertDialog`, Notifications panel has scroll + Read All + Clear All buttons + dialog
- [run-project.bat](../run-project.bat) — exports `VITE_PUBLIC_BASE_URL`
- [README.md](../README.md) — Mobile QR scanning section

**Files NOT modified** (per scope discipline):
- `AdminController.java` (keeps its hard-delete endpoint)
- `WebSecurityConfig.java` (existing auth chain handles `/api/requests/**` correctly)
- `QRVerificationController`, `verify-donation.tsx`, WhatsApp service, Flyway config, JJWT — all untouched

---

## Risk register & follow-ups

| Risk | Status |
|------|--------|
| `ddl-auto=update` failing to add `deleted_at` / `cleared_at` on Oracle 21c | Operator can run manually: `ALTER TABLE requests ADD (deleted_at TIMESTAMP NULL);` and `ALTER TABLE notifications ADD (cleared_at TIMESTAMP NULL);` |
| DB rows growing forever (soft-clear never purges) | Document a future scheduled job: purge `notifications WHERE cleared_at < SYSTIMESTAMP - INTERVAL '90' DAY` and similar for `requests`. Out of scope for this phase. |
| Phone still hits localhost because operator didn't set `VITE_PUBLIC_BASE_URL` | Warning toast appears the first time per session; also documented in README + `.env.example` |
| `request.matchedDonorId` field — does it exist on the request DTO the frontend receives? | Confirmed: `RequestResponseDTO.from(...)` exposes both `userId` and `matchedDonorId`; `canDeleteRequest(request)` reads them directly. If a deployment finds these missing in the JSON, check `RequestResponseDTO` field names. |

---

## OUTPUT REPORT (mapped to your task spec)

### Completed Changes
1. QR generation uses `VITE_PUBLIC_BASE_URL` / origin fallback, with localhost warning
2. Soft-delete on Request: new column + filtered queries + new `DELETE /api/requests/{id}` endpoint + frontend Delete button with AlertDialog
3. Notifications: scrollable panel + Read All button + Clear All button (now SOFT-clear, was hard-delete)
4. `run-project.bat` exports the new env var so out-of-the-box launches produce scannable QRs
5. `.env.example` + README documentation

### Files Modified
See "Files modified" section above (10 modified, 3 created).

### Tests Performed
- `mvn test` → 92/92 backend tests pass (full pre-existing suite)
- `npm run build` → frontend builds clean (2456 modules, 9.77s)
- Manual E2E checklist documented in §"Manual smoke test checklist" above — pending operator execution against a running Oracle.

### Remaining Issues
- **Soft-deleted / soft-cleared rows grow forever** (no scheduled purge). Future task: add a `@Scheduled` job in NotificationService and a sibling for Request to hard-delete rows past a retention window (e.g. 90 days for notifications, 7 years for medical-related Request rows).
- **`VITE_PUBLIC_BASE_URL` env var requires Vite restart to pick up** (it's bundled at build time / dev-server start time). Documented in `.env.example`.
- **The `request.matchedDonorId` field** must be present in `RequestResponseDTO`. If a deployment shows the Delete button on someone else's matched request (or hides it for the matched donor), inspect `RequestResponseDTO.from(...)` to verify the field is exposed.
