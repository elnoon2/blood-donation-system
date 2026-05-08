-- Oracle Data Seeding for Smart Blood Donation System
-- Using subqueries to find IDs to ensure correct relationships

-- 1. Hospitals (Clear and Insert)
DELETE FROM hospitals;
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Kasr Al-Ainy', 'Garden City', 'Cairo', '02-1234567', 'info@kasralainy.edu.eg');
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Ain Shams University Hospital', 'Abbassia', 'Cairo', '02-7654321', 'contact@asu.edu.eg');
-- ... adding some more important ones ...
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Maadi Military Hospital', 'Maadi', 'Cairo', '02-1111111', 'maadi@mil.eg');

-- 2. Users (Clear and Insert)
DELETE FROM users;

-- Admin
INSERT INTO users (name, email, password, blood_type, governorate, phone, medical_id, role, created_at)
VALUES ('Admin User', 'nourelkassyamin15@gmail.com', '$2a$10$SZfFY8okQNl1rUP/9/zpfOTqI.VoFBZr6jXfLJsJzi5f5k0.H4GnW', 'O+', 'Cairo', '0123456789', 'ADM-001', 'ADMIN', SYSTIMESTAMP);

-- Donor
INSERT INTO users (name, email, password, blood_type, governorate, phone, role, created_at)
VALUES ('John Donor', 'donor@example.com', '$2a$10$SZfFY8okQNl1rUP/9/zpfOTqI.VoFBZr6jXfLJsJzi5f5k0.H4GnW', 'A+', 'Alexandria', '0111111111', 'DONOR', SYSTIMESTAMP);

-- Patient
INSERT INTO users (name, email, password, blood_type, governorate, phone, role, created_at)
VALUES ('Sarah Patient', 'patient@example.com', '$2a$10$SZfFY8okQNl1rUP/9/zpfOTqI.VoFBZr6jXfLJsJzi5f5k0.H4GnW', 'B-', 'Giza', '0122222222', 'PATIENT', SYSTIMESTAMP);

-- 3. Donors Table
INSERT INTO donors (user_id, last_donation_date, availability_status)
SELECT id, TO_DATE('2026-01-01', 'YYYY-MM-DD'), 'AVAILABLE' FROM users WHERE email = 'donor@example.com';

-- 4. Requests (Urgent Help Needed)
INSERT INTO requests (user_id, blood_type, quantity_needed, governorate, phone, status, request_date, hospital_id)
SELECT u.id, 'A+', 2, 'Cairo', '01012345678', 'PENDING', CURRENT_DATE, h.id 
FROM users u, hospitals h 
WHERE u.email = 'patient@example.com' AND h.email = 'info@kasralainy.edu.eg';

INSERT INTO requests (user_id, blood_type, quantity_needed, governorate, phone, status, request_date, hospital_id)
SELECT u.id, 'O-', 1, 'Giza', '01123456789', 'PENDING', CURRENT_DATE, h.id 
FROM users u, hospitals h 
WHERE u.email = 'patient@example.com' AND h.email = 'info@kasralainy.edu.eg';

INSERT INTO requests (user_id, blood_type, quantity_needed, governorate, phone, status, request_date, hospital_id)
SELECT u.id, 'B+', 3, 'Alexandria', '01234567890', 'PENDING', CURRENT_DATE, h.id 
FROM users u, hospitals h 
WHERE u.email = 'patient@example.com' AND h.email = 'contact@asu.edu.eg';

COMMIT;
