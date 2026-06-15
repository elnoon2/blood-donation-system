-- 22 hot-query / FK indexes mirrored from Oracle V2.

CREATE INDEX IF NOT EXISTS idx_users_role               ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_blood_type         ON users (blood_type);
CREATE INDEX IF NOT EXISTS idx_users_governorate        ON users (governorate);
CREATE INDEX IF NOT EXISTS idx_users_hospital_id        ON users (hospital_id);

CREATE INDEX IF NOT EXISTS idx_donors_avail             ON donors (availability_status);

CREATE INDEX IF NOT EXISTS idx_requests_status          ON requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_blood_type      ON requests (blood_type);
CREATE INDEX IF NOT EXISTS idx_requests_governorate     ON requests (governorate);
CREATE INDEX IF NOT EXISTS idx_requests_user_id         ON requests (user_id);
CREATE INDEX IF NOT EXISTS idx_requests_hospital_id     ON requests (hospital_id);
CREATE INDEX IF NOT EXISTS idx_requests_matched_donor   ON requests (matched_donor_id);
CREATE INDEX IF NOT EXISTS idx_requests_urgency         ON requests (urgency_level);
CREATE INDEX IF NOT EXISTS idx_requests_deleted_at      ON requests (deleted_at);

CREATE INDEX IF NOT EXISTS idx_donations_user           ON donations (user_id);
CREATE INDEX IF NOT EXISTS idx_donations_hospital       ON donations (hospital_id);
CREATE INDEX IF NOT EXISTS idx_donations_request        ON donations (request_id);

CREATE INDEX IF NOT EXISTS idx_donation_history_patient ON donation_history (patient_id);
CREATE INDEX IF NOT EXISTS idx_donation_history_donor   ON donation_history (donor_id);
CREATE INDEX IF NOT EXISTS idx_donation_history_hospital ON donation_history (hospital_id);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_request_donor  ON qr_verification_tokens (request_id, donor_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires_used   ON qr_verification_tokens (expires_at, is_used);

CREATE INDEX IF NOT EXISTS idx_notifications_user       ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_cleared    ON notifications (cleared_at);

CREATE INDEX IF NOT EXISTS idx_inventory_hospital       ON blood_inventory (hospital_id, blood_type);

CREATE INDEX IF NOT EXISTS idx_messages_pair            ON messages (sender_id, receiver_id);

-- Unique phone constraint required by the first-login phone modal.
-- Partial so legacy NULLs don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique
    ON users (phone) WHERE phone IS NOT NULL;
