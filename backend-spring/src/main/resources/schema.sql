-- Final Oracle SQL Schema for Smart Blood Donation System (All 13 Tables)
-- Properly ordered drops to handle constraints
DROP TABLE DONOR_REQUEST CASCADE CONSTRAINTS;
DROP TABLE HOME_COLLECTION_REQUESTS CASCADE CONSTRAINTS;
DROP TABLE DONOR_HEALTH_ASSESSMENTS CASCADE CONSTRAINTS;
DROP TABLE DONATION_FORMS CASCADE CONSTRAINTS;
DROP TABLE DONATION_VERIFICATIONS CASCADE CONSTRAINTS;
DROP TABLE QR_VERIFICATION_TOKENS CASCADE CONSTRAINTS;
DROP TABLE ADMIN_ACTIONS CASCADE CONSTRAINTS;
DROP TABLE NOTIFICATIONS CASCADE CONSTRAINTS;
DROP TABLE DONATIONS CASCADE CONSTRAINTS;
DROP TABLE BLOOD_INVENTORY CASCADE CONSTRAINTS;
DROP TABLE REQUESTS CASCADE CONSTRAINTS;
DROP TABLE DONORS CASCADE CONSTRAINTS;
DROP TABLE USERS CASCADE CONSTRAINTS;
DROP TABLE HOSPITALS CASCADE CONSTRAINTS;

-- 1. Hospitals
CREATE TABLE hospitals (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    location VARCHAR2(255) NOT NULL,
    governorate VARCHAR2(100),
    phone VARCHAR2(50),
    email VARCHAR2(255) UNIQUE
);

-- 2. Users
CREATE TABLE users (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    email VARCHAR2(255) NOT NULL UNIQUE,
    password VARCHAR2(255) NOT NULL,
    blood_type VARCHAR2(20),
    governorate VARCHAR2(100),
    phone VARCHAR2(50),
    medical_id VARCHAR2(50) UNIQUE,
    role VARCHAR2(50) NOT NULL,
    is_approved NUMBER(1) DEFAULT 1 NOT NULL,
    hospital_id NUMBER(19),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
    CONSTRAINT chk_user_approved CHECK (is_approved IN (0, 1))
);

-- 3. Donors
CREATE TABLE donors (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id NUMBER(19) NOT NULL,
    last_donation_date DATE,
    availability_status VARCHAR2(50) DEFAULT 'AVAILABLE',
    latitude NUMBER,
    longitude NUMBER,
    total_donations NUMBER(10) DEFAULT 0,
    weight NUMBER,
    age NUMBER(10),
    active NUMBER(1) DEFAULT 1,
    suspended NUMBER(1) DEFAULT 0,
    CONSTRAINT fk_donor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Requests
CREATE TABLE requests (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id NUMBER(19) NOT NULL,
    blood_type VARCHAR2(20) NOT NULL,
    quantity_needed NUMBER(10) NOT NULL,
    governorate VARCHAR2(100) NOT NULL,
    phone VARCHAR2(50) NOT NULL,
    requester_latitude NUMBER,
    requester_longitude NUMBER,
    requester_map_link VARCHAR2(500),
    status VARCHAR2(50) DEFAULT 'PENDING' NOT NULL,
    donor_confirmed NUMBER(1) DEFAULT 0 NOT NULL,
    patient_confirmed NUMBER(1) DEFAULT 0 NOT NULL,
    request_date DATE NOT NULL,
    verification_code VARCHAR2(6),
    hospital_id NUMBER(19),
    matched_donor_id NUMBER(19),
    patient_name VARCHAR2(255),
    bags_needed NUMBER(10) DEFAULT 1,
    urgency_level VARCHAR2(50),
    confirmed_donors NUMBER(10) DEFAULT 0,
    CONSTRAINT fk_req_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_req_hosp FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
    CONSTRAINT fk_req_matched FOREIGN KEY (matched_donor_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_req_donor_conf CHECK (donor_confirmed IN (0, 1)),
    CONSTRAINT chk_req_patient_conf CHECK (patient_confirmed IN (0, 1))
);

-- 4.5. Donor Request Junction Table
CREATE TABLE donor_request (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    donor_id NUMBER(19) NOT NULL,
    request_id NUMBER(19) NOT NULL,
    accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dr_donor FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_dr_req FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    CONSTRAINT uq_donor_request UNIQUE (donor_id, request_id)
);

-- 5. Blood Inventory
CREATE TABLE blood_inventory (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hospital_id NUMBER(19) NOT NULL,
    blood_type VARCHAR2(20) NOT NULL,
    units_available NUMBER(10) DEFAULT 0 NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inv_hosp FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 6. Donations
CREATE TABLE donations (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id NUMBER(19) NOT NULL,
    hospital_id NUMBER(19) NOT NULL,
    blood_type VARCHAR2(20) NOT NULL,
    quantity NUMBER(10) NOT NULL,
    donation_date DATE NOT NULL,
    status VARCHAR2(50) DEFAULT 'COMPLETED' NOT NULL,
    CONSTRAINT fk_don_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_don_hosp FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 7. Notifications
CREATE TABLE notifications (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id NUMBER(19) NOT NULL,
    message CLOB NOT NULL,
    type VARCHAR2(50) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Admin Actions
CREATE TABLE admin_actions (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admin_id NUMBER(19) NOT NULL,
    action VARCHAR2(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_user FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. QR Verification Tokens
CREATE TABLE qr_verification_tokens (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id NUMBER(19) NOT NULL,
    donor_id NUMBER(19) NOT NULL,
    patient_id NUMBER(19) NOT NULL,
    token VARCHAR2(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_used NUMBER(1) DEFAULT 0,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_qr_req FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_qr_donor FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_qr_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_qr_used CHECK (is_used IN (0, 1))
);

-- 10. Donation Verifications
CREATE TABLE donation_verifications (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id NUMBER(19) NOT NULL,
    donor_id NUMBER(19) NOT NULL,
    patient_id NUMBER(19) NOT NULL,
    hospital_name VARCHAR2(255) NOT NULL,
    doctor_name VARCHAR2(255) NOT NULL,
    doctor_medical_id VARCHAR2(50) NOT NULL,
    donation_date DATE NOT NULL,
    bags_count NUMBER(10),
    notes CLOB,
    id_card_image CLOB,
    questionnaire_json CLOB,
    verified_by_doctor_id NUMBER(19),
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ver_req FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_ver_donor FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ver_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ver_doctor FOREIGN KEY (verified_by_doctor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Donation Forms
CREATE TABLE donation_forms (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id NUMBER(19),
    patient_name VARCHAR2(255) NOT NULL,
    patient_national_id VARCHAR2(20) NOT NULL,
    blood_type VARCHAR2(10) NOT NULL,
    patient_phone VARCHAR2(20) NOT NULL,
    patient_age NUMBER(10),
    patient_governorate VARCHAR2(100) NOT NULL,
    patient_address CLOB,
    notes CLOB,
    doctor_name VARCHAR2(255) NOT NULL,
    doctor_id_number VARCHAR2(100) NOT NULL,
    doctor_id_image CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Donor Health Assessments
CREATE TABLE donor_health_assessments (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    donor_id NUMBER(19),
    full_name VARCHAR2(255) NOT NULL,
    age NUMBER(10),
    gender VARCHAR2(20),
    weight NUMBER,
    blood_type VARCHAR2(20),
    phone VARCHAR2(50),
    email VARCHAR2(255),
    governorate VARCHAR2(100),
    city VARCHAR2(100),
    address CLOB,
    last_donation_date DATE,
    do_you_have_fever NUMBER(1),
    do_you_have_cold_or_flu NUMBER(1),
    do_you_have_chronic_disease NUMBER(1),
    chronic_disease_details CLOB,
    do_you_have_heart_disease NUMBER(1),
    do_you_have_diabetes NUMBER(1),
    do_you_have_high_blood_pressure NUMBER(1),
    do_you_have_anemia NUMBER(1),
    do_you_have_hepatitis NUMBER(1),
    do_you_have_kidney_disease NUMBER(1),
    do_you_have_liver_disease NUMBER(1),
    do_you_have_blood_disorder NUMBER(1),
    are_you_taking_medications NUMBER(1),
    medication_details CLOB,
    did_you_have_recent_surgery NUMBER(1),
    surgery_details CLOB,
    are_you_pregnant_or_recently_pregnant NUMBER(1),
    do_you_smoke NUMBER(1),
    do_you_have_recent_tattoo_or_piercing NUMBER(1),
    do_you_have_recent_infection NUMBER(1),
    do_you_have_recent_bleeding NUMBER(1),
    do_you_feel_dizzy_or_weak NUMBER(1),
    any_other_medical_condition CLOB,
    slept_well_last_night NUMBER(1),
    ate_before_donation NUMBER(1),
    drank_enough_water NUMBER(1),
    current_energy_level VARCHAR2(50),
    do_you_agree_to_medical_review NUMBER(1),
    eligibility_result VARCHAR2(50),
    explanation CLOB,
    recommendation CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_health_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE SET NULL
);

-- 13. Home Collection Requests
CREATE TABLE home_collection_requests (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    donor_id NUMBER(19) NOT NULL,
    full_address CLOB NOT NULL,
    governorate VARCHAR2(100) NOT NULL,
    city VARCHAR2(100) NOT NULL,
    phone VARCHAR2(50) NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time VARCHAR2(100) NOT NULL,
    reason_for_home_collection CLOB,
    medical_notes CLOB,
    status VARCHAR2(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_home_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE
);
