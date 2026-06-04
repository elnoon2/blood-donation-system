-- FINAL COMPREHENSIVE HOSPITAL SEED (All Governorates Included)
-- [CAIRO]
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Kasr Al-Ainy', 'Garden City', 'Cairo', '02-1234567', 'kasr@hosp.eg');
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Ain Shams University Hospital', 'Abbassia', 'Cairo', '02-7654321', 'ainshams@hosp.eg');
-- [GIZA]
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Giza Memorial Hospital', 'Dokki', 'Giza', '02-7777777', 'giza@hosp.eg');
-- [ALEXANDRIA]
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Alexandria University Hospital', 'Azarita', 'Alexandria', '03-1111111', 'alex@hosp.eg');
-- [MATROUH]
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Matrouh General Hospital', 'Marsa Matrouh', 'Matrouh', '046-1111111', 'matrouh@hosp.eg');
-- [DAKAHLIA]
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Mansoura University Hospital', 'Mansoura', 'Dakahlia', '050-1111111', 'mansoura@hosp.eg');
-- [NORTH SINAI]
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Arish General Hospital', 'Arish', 'North Sinai', '068-1111111', 'arish@hosp.eg');
-- [SOUTH SINAI]
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Sharm El Sheikh International', 'Sharm El Sheikh', 'South Sinai', '069-1111111', 'sharm@hosp.eg');
-- [PORT SAID]
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Port Said General Hospital', 'Port Said', 'Port Said', '066-1111111', 'portsaid@hosp.eg');
-- [SUEZ]
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Suez General Hospital', 'Suez', 'Suez', '062-1111111', 'suez@hosp.eg');
-- [DAMIETTA]
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Damietta University Hospital', 'New Damietta', 'Damietta', '057-1111111', 'damietta@hosp.eg');
-- [KAFR EL SHEIKH]
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Kafr El Sheikh University Hospital', 'Kafr El Sheikh', 'Kafr El Sheikh', '047-1111111', 'kafr@hosp.eg');
-- [ASWAN]
INSERT INTO hospitals (name, location, governorate, phone, email) VALUES ('Aswan University Hospital', 'Aswan', 'Aswan', '097-1111111', 'aswan@hosp.eg');

-- Users & Donors
INSERT INTO users (name, email, password, role, governorate, phone, blood_type, is_approved) 
VALUES ('Nour Admin', 'nourelkassyamin15@gmail.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.7uCyQ5a', 'ADMIN', 'Cairo', '01000000000', 'A+', 1);

INSERT INTO users (name, email, password, role, governorate, phone, blood_type, is_approved) VALUES ('Ahmed Cairo', 'ahmed@mail.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.7uCyQ5a', 'DONOR', 'Cairo', '0111', 'O+', 1);
-- Clean up any existing duplicate donor records in case this script ran multiple times previously
DELETE FROM donors WHERE rowid NOT IN (
    SELECT MIN(rowid) FROM donors GROUP BY user_id
);

-- Insert donor profile only if it doesn't already exist
INSERT INTO donors (user_id, availability_status) 
SELECT id, 'AVAILABLE' FROM users 
WHERE role = 'DONOR' 
AND id NOT IN (SELECT user_id FROM donors);

COMMIT;
