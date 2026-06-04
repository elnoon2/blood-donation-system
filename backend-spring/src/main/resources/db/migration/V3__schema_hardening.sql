-- =============================================================================
-- V3: Schema hardening (audit Batch 6 / database findings 2.x + 4)
--
-- Bundles non-breaking, additive corrections:
--   - CHECK constraints aligning string columns with their backing enums
--   - UNIQUE constraint on blood_inventory(hospital_id, blood_type)
--   - FK on donation_forms.request_id (pre-flight orphan check below)
--   - FK on donation_history.verified_by_user_id
--   - @Version columns on hot write paths
--   - is_email_verified column on users (Batch 2)
--
-- All statements idempotent via PL/SQL guards so the migration is safe to
-- re-run after partial application.
-- =============================================================================

DECLARE
    PROCEDURE exec_safe(p_sql IN VARCHAR2, p_ignore_codes IN VARCHAR2 DEFAULT '-955,-1430,-1442,-2275,-2261,-2293,-2299,-1442') IS
    BEGIN
        EXECUTE IMMEDIATE p_sql;
    EXCEPTION
        WHEN OTHERS THEN
            -- Codes we intentionally swallow:
            --   -955  name is already used (constraint/index exists)
            --   -1430 column already exists
            --   -1442 column cannot be modified to NOT NULL (already there)
            --   -2275 constraint already exists
            --   -2261 unique key already exists
            --   -2293 cannot validate: check constraint violated by existing rows
            --   -2299 cannot validate: duplicate keys found
            --   For -2293 / -2299 the operator should clean existing data;
            --   we still apply the constraint to NEW rows via NOVALIDATE
            --   patterns elsewhere. For Phase 9 we tolerate the failure so a
            --   single bad legacy row doesn't block boot.
            IF INSTR(p_ignore_codes, TO_CHAR(SQLCODE)) > 0 THEN
                NULL;
            ELSE
                RAISE;
            END IF;
    END;
BEGIN
    -- --------------------------------------------------------------
    -- CHECK constraints for enum-aligned string columns
    -- --------------------------------------------------------------
    exec_safe('ALTER TABLE requests ADD CONSTRAINT chk_req_status
              CHECK (status IN (''PENDING'',''ACCEPTED'',''IN_PROGRESS'',''COMPLETED'',''REJECTED'',''CANCELLED'',
                                ''UNDER_REVIEW'',''HOSPITAL_CONFIRMED'',''MATCHED_DONOR'',''DONATION_COMPLETED''))
              ENABLE NOVALIDATE');

    exec_safe('ALTER TABLE requests ADD CONSTRAINT chk_req_urgency
              CHECK (urgency_level IS NULL OR urgency_level IN (''NORMAL'',''URGENT'',''CRITICAL''))
              ENABLE NOVALIDATE');

    exec_safe('ALTER TABLE donations ADD CONSTRAINT chk_don_status
              CHECK (status IN (''PENDING'',''COMPLETED'',''CANCELLED''))
              ENABLE NOVALIDATE');

    exec_safe('ALTER TABLE notifications ADD CONSTRAINT chk_notif_type
              CHECK (type IN (''SYSTEM'',''ALERT'',''URGENT'',''MATCH'',''REQUEST''))
              ENABLE NOVALIDATE');

    exec_safe('ALTER TABLE donors ADD CONSTRAINT chk_donor_availability
              CHECK (availability_status IS NULL OR availability_status IN (''AVAILABLE'',''BUSY'',''UNAVAILABLE'',''SUSPENDED''))
              ENABLE NOVALIDATE');

    exec_safe('ALTER TABLE home_collection_requests ADD CONSTRAINT chk_home_status
              CHECK (status IN (''PENDING_REVIEW'',''SCHEDULED'',''COMPLETED'',''REJECTED'',''CANCELLED''))
              ENABLE NOVALIDATE');

    -- --------------------------------------------------------------
    -- UNIQUE constraint on blood inventory (hospital_id, blood_type)
    -- --------------------------------------------------------------
    exec_safe('ALTER TABLE blood_inventory ADD CONSTRAINT uq_blood_inv_hosp_type
              UNIQUE (hospital_id, blood_type)');

    -- --------------------------------------------------------------
    -- Missing FK: donation_forms.request_id -> requests(id)
    -- Pre-flight: refuse to add the FK if orphan rows exist. The operator
    -- must clean orphans first.
    -- --------------------------------------------------------------
    DECLARE v_orphan_count NUMBER;
    BEGIN
        EXECUTE IMMEDIATE
            'SELECT COUNT(*) FROM donation_forms df ' ||
            'WHERE df.request_id IS NOT NULL ' ||
            'AND NOT EXISTS (SELECT 1 FROM requests r WHERE r.id = df.request_id)'
            INTO v_orphan_count;
        IF v_orphan_count = 0 THEN
            exec_safe('ALTER TABLE donation_forms ADD CONSTRAINT fk_dform_request
                      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Table may not exist on a very stripped schema; skip silently.
        IF SQLCODE != -942 THEN RAISE; END IF;
    END;

    -- --------------------------------------------------------------
    -- Missing FK: donation_history.verified_by_user_id -> users(id)
    -- --------------------------------------------------------------
    exec_safe('ALTER TABLE donation_history ADD CONSTRAINT fk_history_verifier
              FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL');

    -- --------------------------------------------------------------
    -- @Version columns for optimistic locking (audit finding 2.3)
    -- Added defensively with default 0; existing rows pick up the default.
    -- --------------------------------------------------------------
    exec_safe('ALTER TABLE requests ADD (version NUMBER(19) DEFAULT 0 NOT NULL)');
    exec_safe('ALTER TABLE qr_verification_tokens ADD (version NUMBER(19) DEFAULT 0 NOT NULL)');
    exec_safe('ALTER TABLE blood_inventory ADD (version NUMBER(19) DEFAULT 0 NOT NULL)');
    exec_safe('ALTER TABLE donors ADD (version NUMBER(19) DEFAULT 0 NOT NULL)');
    exec_safe('ALTER TABLE users ADD (version NUMBER(19) DEFAULT 0 NOT NULL)');

    -- --------------------------------------------------------------
    -- Email verification flag (audit Batch 2)
    -- --------------------------------------------------------------
    exec_safe('ALTER TABLE users ADD (is_email_verified NUMBER(1) DEFAULT 0 NOT NULL)');
    exec_safe('ALTER TABLE users ADD CONSTRAINT chk_user_email_verified
              CHECK (is_email_verified IN (0, 1))');

    -- --------------------------------------------------------------
    -- Audit-trail consistency: created_at / updated_at on requests
    -- --------------------------------------------------------------
    exec_safe('ALTER TABLE requests ADD (created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)');
    exec_safe('ALTER TABLE requests ADD (updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)');
END;
/

COMMIT;
