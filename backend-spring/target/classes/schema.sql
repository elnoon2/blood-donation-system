-- Safe schema initialization
-- We drop tables in reverse dependency order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS home_collection_requests;
DROP TABLE IF EXISTS donor_health_assessments;
DROP TABLE IF EXISTS donation_verifications;
DROP TABLE IF EXISTS qr_verification_tokens;
DROP TABLE IF EXISTS admin_actions;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS donations;
DROP TABLE IF EXISTS blood_inventory;
DROP TABLE IF EXISTS hospitals;
DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS donors;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    blood_type VARCHAR(20),
    governorate VARCHAR(100),
    phone VARCHAR(50),
    medical_id VARCHAR(50) UNIQUE,
    role VARCHAR(50) NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    hospital_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL
);

CREATE TABLE donors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    last_donation_date DATE,
    availability_status VARCHAR(50) DEFAULT 'AVAILABLE',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    blood_type VARCHAR(20) NOT NULL,
    quantity_needed INT NOT NULL,
    governorate VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    requester_latitude DOUBLE,
    requester_longitude DOUBLE,
    requester_map_link VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    donor_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    patient_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    request_date DATE NOT NULL,
    verification_code VARCHAR(6),
    hospital_id BIGINT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL
);

CREATE TABLE hospitals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    governorate VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255) UNIQUE
);

CREATE TABLE blood_inventory (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hospital_id BIGINT NOT NULL,
    blood_type VARCHAR(20) NOT NULL,
    units_available INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

CREATE TABLE donations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    hospital_id BIGINT NOT NULL,
    blood_type VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    donation_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE admin_actions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT NOT NULL,
    action VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE qr_verification_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT NOT NULL,
    donor_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE donation_verifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT NOT NULL,
    donor_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    hospital_name VARCHAR(255) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    doctor_medical_id VARCHAR(50) NOT NULL,
    donation_date DATE NOT NULL,
    bags_count INT,
    notes TEXT,
    verified_by_doctor_id BIGINT,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by_doctor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE donor_health_assessments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    donor_id BIGINT,
    full_name VARCHAR(255) NOT NULL,
    age INT,
    gender VARCHAR(20),
    weight DOUBLE,
    blood_type VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    governorate VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    last_donation_date DATE,
    do_you_have_fever BOOLEAN,
    do_you_have_cold_or_flu BOOLEAN,
    do_you_have_chronic_disease BOOLEAN,
    chronic_disease_details TEXT,
    do_you_have_heart_disease BOOLEAN,
    do_you_have_diabetes BOOLEAN,
    do_you_have_high_blood_pressure BOOLEAN,
    do_you_have_anemia BOOLEAN,
    do_you_have_hepatitis BOOLEAN,
    do_you_have_kidney_disease BOOLEAN,
    do_you_have_liver_disease BOOLEAN,
    do_you_have_blood_disorder BOOLEAN,
    are_you_taking_medications BOOLEAN,
    medication_details TEXT,
    did_you_have_recent_surgery BOOLEAN,
    surgery_details TEXT,
    are_you_pregnant_or_recently_pregnant BOOLEAN,
    do_you_smoke BOOLEAN,
    do_you_have_recent_tattoo_or_piercing BOOLEAN,
    do_you_have_recent_infection BOOLEAN,
    do_you_have_recent_bleeding BOOLEAN,
    do_you_feel_dizzy_or_weak BOOLEAN,
    any_other_medical_condition TEXT,
    slept_well_last_night BOOLEAN,
    ate_before_donation BOOLEAN,
    drank_enough_water BOOLEAN,
    current_energy_level VARCHAR(50),
    do_you_agree_to_medical_review BOOLEAN,
    eligibility_result VARCHAR(50),
    explanation TEXT,
    recommendation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE SET NULL
);

CREATE TABLE home_collection_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    donor_id BIGINT NOT NULL,
    full_address TEXT NOT NULL,
    governorate VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time VARCHAR(100) NOT NULL,
    reason_for_home_collection TEXT,
    medical_notes TEXT,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE
);

SET FOREIGN_KEY_CHECKS = 1;
