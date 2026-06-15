-- ============================================================
-- Postgres baseline (Neon).
-- Schema mirrors the Oracle entities defined in com.example.blooddonation.entity.*
-- but uses Postgres idioms: BIGSERIAL identities, TIMESTAMPTZ, no sequences,
-- partial unique indexes for soft-delete.
-- ============================================================

CREATE TABLE IF NOT EXISTS hospitals (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    governorate     VARCHAR(64)  NOT NULL,
    address         VARCHAR(512),
    phone           VARCHAR(32),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    map_link        VARCHAR(500),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password        VARCHAR(255) NOT NULL,
    blood_type      VARCHAR(8),
    governorate     VARCHAR(64),
    phone           VARCHAR(32),
    medical_id      VARCHAR(64),
    role            VARCHAR(32)  NOT NULL,
    is_approved     BOOLEAN      NOT NULL DEFAULT TRUE,
    hospital_id     BIGINT REFERENCES hospitals(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT chk_users_role  CHECK (role IN ('ADMIN','HOSPITAL','DONOR','PATIENT'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
    ON users (LOWER(email)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_medical_id_unique
    ON users (medical_id) WHERE medical_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS donors (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    availability_status   VARCHAR(32)  NOT NULL DEFAULT 'AVAILABLE',
    last_donation_date    DATE,
    total_donations       INTEGER      NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ,
    CONSTRAINT chk_donors_status CHECK (availability_status IN ('AVAILABLE','UNAVAILABLE','PAUSED'))
);

CREATE TABLE IF NOT EXISTS requests (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hospital_id           BIGINT       REFERENCES hospitals(id) ON DELETE SET NULL,
    matched_donor_id      BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    blood_type            VARCHAR(8)   NOT NULL,
    quantity_needed       INTEGER      NOT NULL,
    bags_needed           INTEGER      NOT NULL DEFAULT 1,
    governorate           VARCHAR(64)  NOT NULL,
    phone                 VARCHAR(32)  NOT NULL,
    requester_latitude    DOUBLE PRECISION,
    requester_longitude   DOUBLE PRECISION,
    requester_map_link    VARCHAR(500),
    status                VARCHAR(32)  NOT NULL,
    urgency_level         VARCHAR(16),
    donor_confirmed       BOOLEAN      NOT NULL DEFAULT FALSE,
    patient_confirmed     BOOLEAN      NOT NULL DEFAULT FALSE,
    confirmed_donors      INTEGER      NOT NULL DEFAULT 0,
    request_date          DATE         NOT NULL,
    verification_code     VARCHAR(6),
    patient_name          VARCHAR(255),
    deleted_at            TIMESTAMPTZ,
    CONSTRAINT chk_requests_status  CHECK (status IN ('PENDING','ACCEPTED','IN_PROGRESS','COMPLETED','REJECTED','CANCELLED')),
    CONSTRAINT chk_requests_urgency CHECK (urgency_level IS NULL OR urgency_level IN ('NORMAL','URGENT','CRITICAL'))
);

CREATE TABLE IF NOT EXISTS donations (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hospital_id     BIGINT REFERENCES hospitals(id) ON DELETE SET NULL,
    request_id      BIGINT REFERENCES requests(id) ON DELETE SET NULL,
    blood_type      VARCHAR(8) NOT NULL,
    bags            INTEGER    NOT NULL DEFAULT 1,
    status          VARCHAR(32) NOT NULL,
    donation_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT chk_donations_status CHECK (status IN ('PENDING','SCHEDULED','COMPLETED','CANCELLED'))
);

CREATE TABLE IF NOT EXISTS donation_history (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    donor_id        BIGINT REFERENCES users(id) ON DELETE SET NULL,
    hospital_id     BIGINT REFERENCES hospitals(id) ON DELETE SET NULL,
    request_id      BIGINT REFERENCES requests(id) ON DELETE SET NULL,
    blood_type      VARCHAR(8),
    bags            INTEGER,
    completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS qr_verification_tokens (
    id              BIGSERIAL PRIMARY KEY,
    request_id      BIGINT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    donor_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           TEXT   NOT NULL UNIQUE,
    is_used         BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(32) NOT NULL,
    title           VARCHAR(255),
    message         TEXT,
    related_id      BIGINT,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cleared_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS blood_inventory (
    id              BIGSERIAL PRIMARY KEY,
    hospital_id     BIGINT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    blood_type      VARCHAR(8) NOT NULL,
    bags_available  INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_inventory_hospital_type UNIQUE (hospital_id, blood_type)
);

CREATE TABLE IF NOT EXISTS donor_health_assessments (
    id              BIGSERIAL PRIMARY KEY,
    donor_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    eligibility_result VARCHAR(32) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_eligibility CHECK (eligibility_result IN ('ELIGIBLE','TEMPORARILY_INELIGIBLE','INELIGIBLE','NEEDS_REVIEW'))
);

CREATE TABLE IF NOT EXISTS messages (
    id              BIGSERIAL PRIMARY KEY,
    sender_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS donation_forms (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    request_id      BIGINT REFERENCES requests(id) ON DELETE SET NULL,
    payload_json    JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS donation_verifications (
    id              BIGSERIAL PRIMARY KEY,
    donation_id     BIGINT REFERENCES donations(id) ON DELETE SET NULL,
    verified_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    verified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT
);

CREATE TABLE IF NOT EXISTS admin_actions (
    id              BIGSERIAL PRIMARY KEY,
    admin_id        BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(64) NOT NULL,
    target_type     VARCHAR(64),
    target_id       BIGINT,
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS donor_requests (
    id              BIGSERIAL PRIMARY KEY,
    donor_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id      BIGINT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    accepted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_donor_request UNIQUE (donor_id, request_id)
);

CREATE TABLE IF NOT EXISTS home_collection_requests (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,
    address         VARCHAR(512),
    governorate     VARCHAR(64),
    requested_date  DATE,
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_delivery_log (
    id                BIGSERIAL PRIMARY KEY,
    phone_last4       VARCHAR(8),
    context_summary   VARCHAR(255),
    status            VARCHAR(16) NOT NULL,
    error_code        VARCHAR(64),
    error_message     VARCHAR(500),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
