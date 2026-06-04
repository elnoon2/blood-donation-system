-- =============================================================================
-- V4: Soft-delete column on users (audit Batch 5, POC scope)
--
-- Adds `deleted_at TIMESTAMP NULL` on users only. Idempotent via PL/SQL guard.
-- When other entities adopt SoftDeletable, add their ALTER TABLE statements
-- here or as a follow-up migration (V5__add_soft_delete_*).
-- =============================================================================

DECLARE
    PROCEDURE exec_safe(p_sql IN VARCHAR2) IS
    BEGIN
        EXECUTE IMMEDIATE p_sql;
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE != -1430 THEN RAISE; END IF;  -- column already exists
    END;
BEGIN
    exec_safe('ALTER TABLE users ADD (deleted_at TIMESTAMP NULL)');
END;
/

COMMIT;
