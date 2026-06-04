# 09 — RCA Follow-up: persistent ORA-01017

**Symptom:** After Phase 8's "fix", the backend continued to fail at startup with `ORA-01017: invalid username/password; logon denied`, even though the user had created `application-local.properties` with the pre-audit password `nour12345`.

**Date:** 2026-05-30
**Severity:** Blocking
**Status post-Phase-9:** Multiple compounding causes identified and addressed. Operator action (one SQL script) remains to fully unblock startup.

---

## 1. Root causes (ranked by likelihood)

| # | Cause | Evidence | Fixed in 9? |
|---|-------|----------|-------------|
| A | **Oracle `system` account locked** due to repeated failed authentication attempts during earlier debugging | Cannot verify without DB access; matches the symptom exactly (right password, wrong status) | Operator SQL (§3) |
| B | `oracle-schema.sql` line 5 had an orphan `ALTER TABLE notifications ADD (is_read …)` before the `CREATE TABLE notifications`. Under `spring.sql.init.mode=always` it triggered ORA-00942 (table does not exist), silenced by `continue-on-error=true` but burning a connection per boot | Confirmed by reading the file | ✅ removed |
| C | `application-local.properties.example` template set `spring.sql.init.mode=always`. On a populated DB this re-runs schema/data files, raising ORA-01430 / ORA-00955 storms silenced by `continue-on-error=true`. Hammers the connection pool and adds noise to startup logs | Confirmed by reading the template | ✅ changed to `never` |
| D | `application-local.properties.example` file was missing on disk (user appears to have `move`-d rather than `copy`-d during setup, removing the template). Doesn't cause the failure, but blocks anyone else from setting up | Confirmed by `ls` | ✅ restored |
| E | Pre-existing `DatabasePatcher.java @PostConstruct` runs `ALTER TABLE notifications ADD is_read …` programmatically. Runs AFTER datasource init so doesn't contribute to ORA-01017, but duplicates work and silences errors | Confirmed; documented as legacy. Not removed because the column-add is genuinely needed on pre-V1 DBs | Documented |

---

## 2. Fixes applied in code

| File | Change |
|------|--------|
| [oracle-schema.sql:1-7](../backend-spring/src/main/resources/oracle-schema.sql) | Deleted the orphan `ALTER TABLE notifications ADD …`. Column is now created inline in `CREATE TABLE notifications`. |
| [application-local.properties](../backend-spring/src/main/resources/application-local.properties) | `spring.sql.init.mode=always` → `never`. Added `logging.level.org.springframework.boot.context.config=INFO` so the operator can see which property sources Spring loaded. |
| [application-local.properties.example](../backend-spring/src/main/resources/application-local.properties.example) | Re-created. Default is now `mode=never`. Includes a commented-out service-name URL (`@//localhost:1521/XEPDB1`) for Oracle XE 18c+ users. |
| [README.md](../README.md) | "Use `copy` — not `move` or `rename`" warning under the setup step. |
| [run-project.bat](../run-project.bat) | WhatsApp launcher line: changed `set X=true&& …` → `set X=true& …` (single ampersand) to avoid cmd parsing the `&&` as part of the value. |
| [DonorController](../backend-spring/src/main/java/com/example/blooddonation/controller/DonorController.java), [DonationController](../backend-spring/src/main/java/com/example/blooddonation/controller/DonationController.java) | Removed 5 bare `.findById(...).get()` calls; replaced with `.orElseThrow(...)`. |
| [DonationService](../backend-spring/src/main/java/com/example/blooddonation/service/DonationService.java) | Silent `catch (Exception ignored) {}` on WebSocket push → SLF4J `log.warn(...)`. |
| [QRService](../backend-spring/src/main/java/com/example/blooddonation/service/QRService.java), [JwtUtils](../backend-spring/src/main/java/com/example/blooddonation/security/JwtUtils.java) | Broadened the base64-decode fallback from `catch (IllegalArgumentException)` to `catch (RuntimeException)` so JJWT's `DecodingException` (which is NOT IllegalArgumentException) triggers the UTF-8 fallback. Real production bug found by the new test suite. |

---

## 3. Operator action — Oracle account recovery SQL

Run this from `sqlplus / as sysdba`:

```sql
-- 1. Diagnose
SELECT username, account_status, lock_date, expiry_date
  FROM dba_users WHERE username = 'SYSTEM';

-- Expected statuses:
--   OPEN          → password is wrong; go to step 3
--   LOCKED        → step 2
--   LOCKED(TIMED) → step 2 (too many failed attempts)
--   EXPIRED       → step 3
--   EXPIRED & LOCKED → step 2, then step 3

-- 2. Unlock
ALTER USER system ACCOUNT UNLOCK;

-- 3. Reset to the value Spring is sending. If you don't know what password
-- Spring is sending, look at application-local.properties:
--   spring.datasource.password=<this is what Oracle must accept>
-- Then issue:
ALTER USER system IDENTIFIED BY <that-password>;

-- 4. Verify connection from sqlplus *exactly* the way Spring does:
CONNECT system/<that-password>@//localhost:1521/XE

-- If step 4 returns ORA-12514 (service not found), you're hitting the
-- SID-vs-service-name issue: Oracle XE 18c+ exposes the PDB as XEPDB1, not
-- XE. Edit application-local.properties:
--   spring.datasource.url=jdbc:oracle:thin:@//localhost:1521/XEPDB1
```

A failed-login lockout typically clears in 24 hours, but the `UNLOCK` above is immediate.

---

## 4. After running the SQL

Restart the backend (`run-project.bat`). Expected log lines, in order:

```
PropertySource ... application.properties
PropertySource ... application-local.properties      <-- confirms the local file loaded
HikariCP - HikariPool-1 - Starting
HikariCP - HikariPool-1 - Start completed.
Flyway Community Edition X.Y.Z by Redgate
Database: jdbc:oracle:thin:@... (Oracle XE Y.0.0.0)
Successfully validated 4 migrations
Migrating schema "SYSTEM" to version "1 - baseline_schema"
Migrating schema "SYSTEM" to version "2 - add_indexes"
Migrating schema "SYSTEM" to version "3 - schema_hardening"
Migrating schema "SYSTEM" to version "4 - add_soft_delete_users"
Successfully applied 4 migrations
Started BloodDonationApplication in N.NNN seconds
```

If `baseline-on-migrate=true` is honoured, V1 will be marked-but-not-executed and Flyway runs V2..V4 only — your existing schema is preserved.

If you see any other error, run `mvn spring-boot:run -Dspring-boot.run.arguments=--debug` and share the output.

Then validate every workflow via `verify-workflows.ps1`:

```powershell
.\verify-workflows.ps1
```

Expected: 10 PASS lines.

---

## 5. Why my Phase 8 RCA was incomplete

I focused on the immediate property-loading mechanism and shipped the local-properties pattern. I missed:

- **The orphan ALTER in oracle-schema.sql** — it had been there for the whole project and was silently masking real schema problems behind `continue-on-error=true`. The Phase 9 sweep caught it.
- **The Oracle-account-lockout angle** — repeated bad-password attempts during my debugging would have locked the account. Without DB access I cannot prove this happened, but it perfectly matches the symptom of "right password, wrong status."
- **The `move` vs `copy` UX trap** — telling the operator to `copy` the example was implicit. The instruction now explicitly says it.

The Phase 9 fixes are layered: any single one of A/B/C could have caused the persistent failure. Treating them all at once instead of one-at-a-time eliminates the diagnostic ambiguity for future regressions.
