-- =================================================================
-- Smart Blood Donation System - Index DDL
-- Apply against an existing Oracle XE 11g/12c+ schema.
--
-- These indexes target the dominant query patterns identified in the
-- Phase 4 performance audit (audit/04-performance.md). All are non-unique
-- BTREE indexes unless noted; safe to apply against a live schema.
--
-- IMPORTANT: every CREATE INDEX below is wrapped in a PL/SQL block so the
-- script is idempotent (re-runs do not error on existing indexes). Oracle
-- error -955 is "name is already used by an existing object."
-- =================================================================

DECLARE
    PROCEDURE create_index_if_absent(p_sql IN VARCHAR2) IS
    BEGIN
        EXECUTE IMMEDIATE p_sql;
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE != -955 THEN
                RAISE;
            END IF;
    END;
BEGIN
    -- users
    create_index_if_absent('CREATE INDEX idx_users_hospital_id ON users(hospital_id)');
    create_index_if_absent('CREATE INDEX idx_users_role ON users(role)');
    create_index_if_absent('CREATE INDEX idx_users_blood_type ON users(blood_type)');

    -- donors
    create_index_if_absent('CREATE INDEX idx_donors_avail_blood_gov ON donors(availability_status)');
    -- composite would require joining to users; keep single-col for now.

    -- requests
    create_index_if_absent('CREATE INDEX idx_requests_user_id ON requests(user_id)');
    create_index_if_absent('CREATE INDEX idx_requests_hospital_id ON requests(hospital_id)');
    create_index_if_absent('CREATE INDEX idx_requests_matched_donor ON requests(matched_donor_id)');
    create_index_if_absent('CREATE INDEX idx_requests_status ON requests(status)');
    create_index_if_absent('CREATE INDEX idx_requests_status_date ON requests(status, request_date DESC)');

    -- donor_request junction
    create_index_if_absent('CREATE INDEX idx_donor_request_request ON donor_request(request_id)');

    -- blood_inventory
    create_index_if_absent('CREATE INDEX idx_blood_inv_hosp_type ON blood_inventory(hospital_id, blood_type)');

    -- donations
    create_index_if_absent('CREATE INDEX idx_donations_user_id ON donations(user_id)');
    create_index_if_absent('CREATE INDEX idx_donations_hospital_id ON donations(hospital_id)');

    -- notifications
    create_index_if_absent('CREATE INDEX idx_notifications_user_sent ON notifications(user_id, sent_at DESC)');

    -- qr_verification_tokens
    create_index_if_absent('CREATE INDEX idx_qr_request_donor ON qr_verification_tokens(request_id, donor_id)');
    create_index_if_absent('CREATE INDEX idx_qr_used_expires ON qr_verification_tokens(is_used, expires_at)');

    -- donation_history
    create_index_if_absent('CREATE INDEX idx_history_patient ON donation_history(patient_id)');
    create_index_if_absent('CREATE INDEX idx_history_hospital ON donation_history(hospital_id)');
    create_index_if_absent('CREATE INDEX idx_history_request ON donation_history(request_id)');

    -- home_collection_requests
    create_index_if_absent('CREATE INDEX idx_home_collection_donor ON home_collection_requests(donor_id)');

    -- donor_health_assessments
    create_index_if_absent('CREATE INDEX idx_health_assess_donor ON donor_health_assessments(donor_id)');

    -- donation_verifications
    create_index_if_absent('CREATE INDEX idx_ver_request ON donation_verifications(request_id)');
    create_index_if_absent('CREATE INDEX idx_ver_donor ON donation_verifications(donor_id)');
    create_index_if_absent('CREATE INDEX idx_ver_patient ON donation_verifications(patient_id)');
END;
/

COMMIT;
