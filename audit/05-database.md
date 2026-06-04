# 05 — Database Audit

**Engine:** Oracle XE 11g (production target: 12c+ or 19c).
**Schema source:** [backend-spring/src/main/resources/oracle-schema.sql](../backend-spring/src/main/resources/oracle-schema.sql) (279 lines, 13 tables).
**Migration tool:** None. Schema is overwritten in-place via `spring.sql.init.mode=always` (now `embedded` post-Phase-3 fix).

---

## 1. Per-table review

### 1.1 `hospitals`

| Aspect | State | Notes |
|--------|-------|-------|
| PK | `id` IDENTITY | OK |
| Constraints | `email UNIQUE` | OK |
| Indexes | UNIQUE on email only | Missing: governorate (filtered on dashboards) |
| NOT NULL | name, location | Phone/email nullable — acceptable |
| Audit columns | none | No created_at/updated_at |

**Recommendations (ASK-FIRST):**
- Add `created_at`, `updated_at` timestamps.
- Add `idx_hospitals_governorate` if hospital-by-governorate lookups become hot.

### 1.2 `users`

| Aspect | State | Notes |
|--------|-------|-------|
| PK | `id` IDENTITY | OK |
| Constraints | `email UNIQUE`, `medical_id UNIQUE`, FK to hospitals | OK |
| FK cascade | `ON DELETE SET NULL` for hospital_id | OK — deleting a hospital shouldn't wipe users |
| Indexes | added: hospital_id, role, blood_type | Phase 4 fix |
| `is_approved` boolean as NUMBER(1) | check constraint enforces 0/1 | Oracle pattern; OK |
| `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP | present | OK |
| `password` length VARCHAR2(255) | BCrypt fits in 60 chars; 255 is generous | OK |
| `medical_id` VARCHAR2(50) UNIQUE | nullable | Allows duplicate NULLs |

**Recommendation:** add `updated_at` and a trigger/JPA `@PreUpdate` to keep it current.

### 1.3 `donors`

| Aspect | State | Notes |
|--------|-------|-------|
| PK | `id` IDENTITY | OK |
| FK | `user_id UNIQUE NOT NULL` → users(id) ON DELETE CASCADE | Enforces 1:1 |
| `availability_status` VARCHAR2(50) DEFAULT 'AVAILABLE' | free-form string | **Should be enum-checked** — current code treats values as opaque strings |
| `total_donations` NUMBER(10) DEFAULT 0 | OK | |
| `latitude/longitude` NUMBER | no precision/scale | Could be NUMBER(9,6) for accuracy + storage |
| `active`, `suspended` NUMBER(1) | no CHECK constraints | Inconsistent with `users.is_approved` which has `chk_user_approved` |

**Recommendation:** add CHECK constraints on `active`, `suspended`, and a CHECK on `availability_status IN ('AVAILABLE','BUSY','UNAVAILABLE','SUSPENDED')`.

### 1.4 `requests` (the hot table)

| Aspect | State | Notes |
|--------|-------|-------|
| PK | `id` IDENTITY | OK |
| FK | user, hospital, matched_donor | All present |
| FK cascade | `user_id` CASCADE, `hospital_id` SET NULL, `matched_donor_id` SET NULL | Inconsistent — see §3 |
| Indexes | added in Phase 4: user_id, hospital_id, matched_donor, status, (status, request_date DESC) | OK |
| `status` VARCHAR2(50) | no CHECK constraint | Currently accepts ANY string; should restrict to enum values |
| `bags_needed` NUMBER(10) DEFAULT 1 NOT NULL | OK | |
| `urgency_level` VARCHAR2(50) | free-form | Should be CHECK-constrained (NORMAL/URGENT/CRITICAL) |
| `verification_code` VARCHAR2(6) | unused in current code path | Dead column candidate |
| `confirmed_donors` NUMBER(10) DEFAULT 0 | counter | Drifts under concurrency (see business-logic 3.4) |
| Audit columns | only `request_date` (DATE, no time) | Missing `updated_at`, `cancelled_at`, `completed_at` |

**Recommendations (ASK-FIRST):**
- CHECK constraint on `status` values to match `RequestStatus` enum.
- CHECK constraint on `urgency_level`.
- Add `updated_at`, `completed_at`, `cancelled_at`.
- Consider dropping unused `verification_code`.
- `quantity_needed` vs `bags_needed`: pick one (business-logic 2.7).

### 1.5 `donor_request` (junction)

| Aspect | State | Notes |
|--------|-------|-------|
| PK | `id` IDENTITY | OK |
| UNIQUE | (donor_id, request_id) | Prevents same donor double-accepting; ✓ |
| FK cascade | both CASCADE | OK |
| Indexes | UNIQUE on (donor_id, request_id) covers `donor_id` queries; added separate index on `request_id` (Phase 4) | OK |
| Accepted_at | DEFAULT CURRENT_TIMESTAMP | OK |
| **What's missing** | no `is_active` or `withdrawn_at` | If donor cancels, row stays and drifts the counter |

### 1.6 `blood_inventory`

| Aspect | State | Notes |
|--------|-------|-------|
| PK | `id` IDENTITY | OK |
| FK | hospital_id ON DELETE CASCADE | OK |
| Composite index | added in Phase 4: (hospital_id, blood_type) | OK |
| **Missing** | no UNIQUE on (hospital_id, blood_type) | Allows duplicate rows for the same combo — the `findByHospitalIdAndBloodType` query assumes ONE row but the schema permits N |
| **Missing** | no expiry tracking | Real blood-bank software tracks unit_expiry_date; absence prevents FIFO consumption |
| `units_available` NUMBER(10) | OK | |
| `last_updated` TIMESTAMP | OK | |

**Recommendation (ASK-FIRST):**
- Add `UNIQUE (hospital_id, blood_type)` so the application's "one row per combo" assumption is enforced.
- For real blood-bank functionality, split into `blood_units` table with per-unit expiry and `blood_inventory` becomes a materialized view.

### 1.7 `donations`

| Aspect | State | Notes |
|--------|-------|-------|
| PK | `id` IDENTITY | OK |
| FK | user, hospital | CASCADE both |
| Indexes | added Phase 4: user_id, hospital_id | OK |
| `donation_date` DATE | no time of day | OK; daily granularity sufficient |
| `status` VARCHAR2(50) DEFAULT 'COMPLETED' | no CHECK | Should match `DonationStatus` enum |
| **Missing** | no link back to source `Request` | After-the-fact you can't trace which Request a Donation came from (the QR-path `DonationHistory` table fills this gap) |

### 1.8 `notifications`

| Aspect | State | Notes |
|--------|-------|-------|
| PK | `id` IDENTITY | OK |
| FK | user_id CASCADE | OK |
| `message` CLOB | OK for arbitrary length | |
| `type` VARCHAR2(50) | no CHECK | Should match `NotificationType` enum (SYSTEM/ALERT/URGENT/MATCH/REQUEST) |
| `is_read` NUMBER(1) | CHECK 0/1 | OK |
| Composite index | added Phase 4: (user_id, sent_at DESC) | Matches dominant query |
| **Missing** | no `read_at` timestamp | Can't analyze read latency |
| **Missing** | no archive/expiry | Notifications accumulate indefinitely |

### 1.9 `donation_history`

Audit table for QR-verified donations.

| Aspect | State | Notes |
|--------|-------|-------|
| PK | `id` IDENTITY | OK |
| FK | 4 FKs (request, donor, patient, hospital) all CASCADE | **Aggressive** — deleting a request wipes its history. For audit purposes this is wrong |
| Indexes | added Phase 4: patient_id, hospital_id, request_id | OK |
| `qr_token` VARCHAR2(512) | OK (HS512 JWT fits) | |
| `verified_by_user_id` NUMBER(19) | no FK | Bug — should reference users(id) ON DELETE SET NULL |

**Recommendation (ASK-FIRST, security implication):**
- Change cascade rules to `ON DELETE SET NULL` for audit-relevant rows; treat donation_history as immutable.
- Add the missing FK on `verified_by_user_id`.
- Consider read-only role permission via Oracle GRANT.

### 1.10 `admin_actions`

| Aspect | State | Notes |
|--------|-------|-------|
| PK | id IDENTITY | OK |
| FK | admin_id CASCADE | If admin deleted, their actions vanish — wrong for audit |
| `action` VARCHAR2(255) | free-form string | No structured payload (what entity was touched, before/after values) |
| **Missing** | target_entity_type, target_entity_id, payload_json | Currently useless for forensics |

**Recommendation:** redesign as a proper audit table OR drop the table and adopt Hibernate Envers / Spring Modulith events. Currently it's not used by any code path (no `AdminAction` writes in any controller/service that I read).

### 1.11 `qr_verification_tokens`

| Aspect | State | Notes |
|--------|-------|-------|
| PK | id IDENTITY | OK |
| FK | request, donor, patient ALL CASCADE | OK |
| UNIQUE | token | OK |
| Indexes | added Phase 4: (request_id, donor_id), (is_used, expires_at) | OK |
| `is_used` CHECK | 0/1 | OK |
| `used_at` nullable | OK | |
| **Missing** | no row-level lock helper (e.g. version) | Race condition in `validateAndConsumeToken` (security V11-2) |

### 1.12 `donation_verifications`

Separate from `donation_history`. Used by the legacy doctor-form path (with photos, questionnaires).

| Aspect | State | Notes |
|--------|-------|-------|
| PK | id IDENTITY | OK |
| FK | 4 FKs; first three CASCADE, doctor SET NULL | Inconsistent with `donation_history`. Should be uniformly SET NULL for audit data |
| Indexes | added Phase 4: request_id, donor_id, patient_id | OK |
| `id_card_image` CLOB | base64-encoded image | **Anti-pattern** — should be object storage URL |
| `questionnaire_json` CLOB | OK for small payloads | |
| `hospital_name` VARCHAR2(255) NOT NULL | **Denormalized** — should FK to hospitals(id) | Drift risk |
| `doctor_name`, `doctor_medical_id` | denormalized text | Same issue |

**Recommendation (ASK-FIRST):**
- Move `id_card_image` to object storage; store URL.
- Replace denormalized hospital/doctor strings with FKs.

### 1.13 `donation_forms`

| Aspect | State | Notes |
|--------|-------|-------|
| `request_id` NUMBER(19) | nullable, **no FK** | Business-logic 11. Should reference requests(id) |
| `doctor_id_image` CLOB | base64 image | Same anti-pattern as 1.12 |

### 1.14 `donor_health_assessments`

Wide flat table with 30+ Boolean (NUMBER(1)) columns for the health questionnaire.

| Aspect | State | Notes |
|--------|-------|-------|
| PK | id IDENTITY | OK |
| FK | donor_id ON DELETE SET NULL | OK (anonymous assessments allowed) |
| Indexes | added Phase 4: donor_id | OK |
| Schema design | 30+ boolean columns | Wide-table pattern is fine for fixed questionnaires; if questions change frequently, consider EAV |

### 1.15 `home_collection_requests`

| Aspect | State | Notes |
|--------|-------|-------|
| PK | id IDENTITY | OK |
| FK | donor_id CASCADE | OK |
| Indexes | added Phase 4: donor_id | OK |
| `status` VARCHAR2(50) | no CHECK | Should match `CollectionRequestStatus` enum |

---

## 2. Schema-wide issues

### 2.1 Cascade matrix is inconsistent

| Table | FK | Rule | Implication |
|-------|----|------|-------------|
| users | hospital_id | SET NULL | If hospital deleted, users orphan to no hospital |
| donors | user_id | CASCADE | Donor wiped when user deleted |
| requests | user_id | CASCADE | Patient's requests wiped |
| requests | hospital_id | SET NULL | Hospital's requests preserved |
| requests | matched_donor_id | SET NULL | Donor's match preserved |
| donations | user_id | CASCADE | History wiped |
| donations | hospital_id | CASCADE | Wiped (inconsistent with requests) |
| donation_history | (all 4) | CASCADE | **All wiped on any parent delete — destroys audit** |
| donation_verifications | doctor FK | SET NULL | Inconsistent — others CASCADE |
| home_collection_requests | donor_id | CASCADE | OK |
| qr_verification_tokens | (all 3) | CASCADE | OK (tokens are ephemeral) |

**Pattern needed:**
- Operational/ephemeral rows (tokens, junctions, in-flight inventory): CASCADE.
- Audit/historical rows (donation_history, donation_verifications, admin_actions): SET NULL or RESTRICT.
- Aggregates that survive a tenant change (donations, blood_inventory): SET NULL on hospital, CASCADE on user only after retention period.

**ASK-FIRST** — large schema redesign. Recommendation: soft delete (see §2.2).

### 2.2 No soft-delete

All deletes are hard. Combined with §2.1's aggressive CASCADE, this:
- Violates the spirit of medical record retention (Egyptian Health Law mandates retention of patient records for years).
- Makes "right to be forgotten" requests (GDPR Article 17) collide with "right to evidence" (the patient or hospital may need to prove a donation happened).

**Recommendation (ASK-FIRST):**
- Add `deleted_at TIMESTAMP NULL` to all entity tables.
- Hibernate `@SQLDelete("UPDATE … SET deleted_at = SYSTIMESTAMP WHERE id = ?")` + `@Where("deleted_at IS NULL")`.
- Convert `AdminController.deleteUser/deleteRequest/deleteHospital` to soft delete.
- Add a separate `purge` admin endpoint that hard-deletes after a retention window.

### 2.3 No `@Version` columns

No optimistic locking. Two concurrent updaters of the same row last-write-wins. Race conditions in `acceptRequest` and `validateAndConsumeToken` (security V11-1, V11-2) directly stem from this.

**ASK-FIRST.** Recommendation: add `version NUMBER(19) DEFAULT 0` to `requests`, `qr_verification_tokens`, `blood_inventory`, `donors` (for `total_donations` counter), and `User` (for role changes). Then `@Version` on the corresponding entity field.

### 2.4 `spring.sql.init.mode=always` (PRE-fix) is hostile to production

Schema and data files re-ran on every boot. With `continue-on-error=true`, errors were silenced. Production data could be corrupted by a stale `oracle-data.sql`.

**FIXED in Phase 3** — now `embedded` by default; dev profile overrides to `always`.

**Long-term recommendation (ASK-FIRST):** introduce Flyway. Baseline migration captures the current schema; future changes are versioned (V2__add_indexes.sql, V3__add_soft_delete.sql, etc.). The index DDL written this session ([oracle-schema-indexes.sql](../backend-spring/src/main/resources/oracle-schema-indexes.sql)) is structured to become V2 once Flyway lands.

### 2.5 No FK on `donation_forms.request_id`

[oracle-schema.sql:198](../backend-spring/src/main/resources/oracle-schema.sql#L198). Bare `NUMBER(19)`. Allows orphan rows.

**Recommendation (AUTO-FIX-OK once orphan check passes):**
```sql
ALTER TABLE donation_forms
  ADD CONSTRAINT fk_dform_request
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL;
```
Pre-flight check:
```sql
SELECT COUNT(*) FROM donation_forms df
 WHERE df.request_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM requests r WHERE r.id = df.request_id);
```
Cannot run without the live DB; flagged.

### 2.6 No `RequestAudit` entity but `request_audits` referenced

[AdminController.java:191, 195, 229](../backend-spring/src/main/java/com/example/blooddonation/controller/AdminController.java#L191) deletes from `request_audits` but no entity exists, no DDL is in `oracle-schema.sql`. The deletes succeed silently (table doesn't exist → ORA-00942 → swallowed by `continue-on-error`).

**ASK-FIRST** — either create the table + entity (and an actual audit-write path), or drop the DELETE statements.

### 2.7 Patient identity not modeled

Patients are `User`s with `role = PATIENT`. But a Request stores `patient_name` as a free-text field separate from `request.user.name`. This is to allow a user to file requests on behalf of family members. There's no entity for "subject of the donation" — the patient name is duplicated text, the actual `User` is just the requester.

**Recommendation (ASK-FIRST):** introduce a `PatientSubject` entity with the medical details (blood type, age, hospital); link `Request.subject_id`. Backward compat: keep `patient_name` as a denormalized convenience field with a trigger or `@PostLoad`.

### 2.8 No encryption at rest

Oracle TDE (Transparent Data Encryption) not mentioned. PII (phones, addresses, medical IDs, base64 ID-card images) sits in cleartext on disk.

**ASK-FIRST** — depends on hosting model. Document for Phase 8 roadmap.

### 2.9 Backup strategy undefined

`README.md` does not mention RMAN, export schedule, or DR. **ASK-FIRST** — out of scope for code audit, flag for ops.

---

## 3. Indexes added this session

See [oracle-schema-indexes.sql](../backend-spring/src/main/resources/oracle-schema-indexes.sql). 22 indexes across the dominant query paths. Wrapped in a `BEGIN…EXCEPTION WHEN OTHERS` block so re-runs are idempotent.

To apply: `sqlplus user/pwd@xe @backend-spring/src/main/resources/oracle-schema-indexes.sql`.

Once Flyway is introduced, this file becomes `V2__add_indexes.sql`.

---

## 4. Recommended schema redesign (sketch, ASK-FIRST)

A single proposed migration "V3__schema_hardening.sql" would:

1. Add CHECK constraints on `requests.status`, `requests.urgency_level`, `donations.status`, `notifications.type`, `donors.availability_status`, `home_collection_requests.status`.
2. Add UNIQUE on `blood_inventory(hospital_id, blood_type)`.
3. Add FK on `donation_forms.request_id` after orphan check.
4. Add `@Version` columns on `requests`, `qr_verification_tokens`, `blood_inventory`, `donors`, `users`.
5. Add `updated_at` and `deleted_at` to all entity tables.
6. Change `donation_history` and `donation_verifications` cascades to SET NULL where audit-relevant.
7. Add the missing FK on `donation_history.verified_by_user_id`.

Each change is reversible, additive, and zero-downtime against an existing DB. Bundled here for sign-off; not auto-applying.

---

## 5. Sign-off list

| # | Item | Type | Status |
|---|------|------|--------|
| 1 | Apply index DDL ([oracle-schema-indexes.sql](../backend-spring/src/main/resources/oracle-schema-indexes.sql)) | AUTO-FIX | written; operator runs against live DB |
| 2 | sql.init.mode = embedded | AUTO-FIX | applied in Phase 3 |
| 3 | Soft-delete + retention | ASK-FIRST | pending |
| 4 | CHECK constraints on enum columns | ASK-FIRST | pending |
| 5 | FK on `donation_forms.request_id` | AUTO-FIX after orphan check | pending |
| 6 | `@Version` on contentious entities | ASK-FIRST | pending |
| 7 | Cascade rule cleanup | ASK-FIRST | pending |
| 8 | Flyway adoption | ASK-FIRST | pending |
| 9 | `RequestAudit` resolution (create or drop) | ASK-FIRST | pending |
| 10 | `id_card_image` to object storage | ASK-FIRST | pending |
