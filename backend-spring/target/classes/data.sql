-- Delete existing admin to prevent duplicate entry on multiple runs
DELETE FROM users WHERE email = 'nourelkassyamin15@gmail.com';

-- Insert Default Admin Account
-- Password is 'nour12345' hashed using BCrypt. 
-- Generated via standard BCrypt ($2y$10$ or $2a$10$)
INSERT INTO users (name, email, password, blood_type, governorate, phone, role, created_at)
VALUES (
    'Admin User', 
    'nourelkassyamin15@gmail.com', 
    '$2a$10$SZfFY8okQNl1rUP/9/zpfOTqI.VoFBZr6jXfLJsJzi5f5k0.H4GnW', 
    'O+', 
    'Cairo',
    '0123456789',
    'ADMIN', 
    CURRENT_TIMESTAMP
);

-- Seed some donors and patients
INSERT INTO users (name, email, password, blood_type, governorate, phone, role, created_at)
VALUES 
('John Donor', 'donor@example.com', '$2a$10$SZfFY8okQNl1rUP/9/zpfOTqI.VoFBZr6jXfLJsJzi5f5k0.H4GnW', 'A+', 'Alexandria', '0111111111', 'DONOR', CURRENT_TIMESTAMP),
('Sarah Patient', 'patient@example.com', '$2a$10$SZfFY8okQNl1rUP/9/zpfOTqI.VoFBZr6jXfLJsJzi5f5k0.H4GnW', 'B-', 'Giza', '0122222222', 'PATIENT', CURRENT_TIMESTAMP);

INSERT INTO donors (user_id, last_donation_date, availability_status)
VALUES (2, '2026-01-01', 'AVAILABLE');

INSERT INTO hospitals (name, location, governorate, phone, email)
VALUES 
('Kasr Al-Ainy', 'Garden City', 'Cairo', '02-1234567', 'info@kasralainy.edu.eg'),
('Ain Shams University Hospital', 'Abbassia', 'Cairo', '02-7654321', 'contact@asu.edu.eg'),
('Maadi Military Hospital', 'Maadi', 'Cairo', '02-1111111', 'maadi@mil.eg'),
('Italian Hospital', 'Abbassia', 'Cairo', '02-2222222', 'italy@hospital.eg'),
('Giza Memorial Hospital', 'Giza Square', 'Giza', '02-3333333', 'giza@hospital.eg'),
('Agouza Hospital', 'Agouza', 'Giza', '02-4444444', 'agouza@hospital.eg'),
('Victoria Hospital', 'Victoria', 'Alexandria', '03-5555555', 'victoria@alex.eg'),
('Alexandria University Hospital', 'Azarita', 'Alexandria', '03-6666666', 'unihosp@alex.edu.eg'),
('Mansoura University Hospital', 'Mansoura', 'Dakahlia', '050-7777777', 'mansoura@uni.eg'),
('Hurghada General Hospital', 'Hurghada', 'Red Sea', '065-8888888', 'hgh@redsea.eg'),
('Sharm El Sheikh International Hospital', 'Sharm El Sheikh', 'South Sinai', '069-9999999', 'ssh@sinai.eg'),
('Aswan University Hospital', 'Aswan', 'Aswan', '097-1010101', 'aswan@hosp.eg'),
('Luxor International Hospital', 'Luxor', 'Luxor', '095-2020202', 'luxor@hosp.eg'),
('Suez General Hospital', 'Suez', 'Suez', '062-3030303', 'suez@hosp.eg'),
('Port Said General Hospital', 'Port Said', 'Port Said', '066-4040404', 'portsaid@hosp.eg'),
('Tanta University Hospital', 'Tanta', 'Gharbia', '040-5050505', 'tanta@hosp.eg'),
('Zagazig University Hospital', 'Zagazig', 'Sharqia', '055-6060606', 'zagazig@hosp.eg'),
('Banha University Hospital', 'Banha', 'Qalyubia', '013-7070707', 'banha@hosp.eg'),
('Shebin El Kom Teaching Hospital', 'Shebin El Kom', 'Menofia', '048-8080808', 'shebin@hosp.eg'),
('Damanhur National Medical Institute', 'Damanhur', 'Beheira', '045-9090909', 'damanhur@hosp.eg'),
('Kafr El Sheikh University Hospital', 'Kafr El Sheikh', 'Kafr El Sheikh', '047-1111112', 'kafr@hosp.eg'),
('Minya University Hospital', 'Minya', 'Minya', '086-2222223', 'minya@hosp.eg'),
('Assiut University Hospital', 'Assiut', 'Assiut', '088-3333334', 'assiut@hosp.eg'),
('Sohag University Hospital', 'Sohag', 'Sohag', '093-4444445', 'sohag@hosp.eg'),
('Qena University Hospital', 'Qena', 'Qena', '096-5555556', 'qena@hosp.eg'),
('Beni Suef University Hospital', 'Beni Suef', 'Beni Suef', '082-6666667', 'benisuef@hosp.eg'),
('Fayoum University Hospital', 'Fayoum', 'Fayoum', '084-7777778', 'fayoum@hosp.eg'),
('Marsa Matrouh General Hospital', 'Matrouh', 'Matrouh', '046-8888889', 'matrouh@hosp.eg'),
('Bir El Abd Hospital', 'Bir El Abd', 'North Sinai', '068-9999990', 'northsinai@hosp.eg'),
('El Kharga General Hospital', 'Kharga', 'New Valley', '092-1212121', 'newvalley@hosp.eg'),
('Ismailia General Hospital', 'Ismailia', 'Ismailia', '064-1234568', 'ismailia@hosp.eg'),
('Damietta General Hospital', 'Damietta', 'Damietta', '057-7654322', 'damietta@hosp.eg'),
('Mallawi General Hospital', 'Mallawi', 'Minya', '086-1112223', 'mallawi@hosp.eg'),
('Beni Mazar Central Hospital', 'Beni Mazar', 'Minya', '086-3334445', 'benimazar@hosp.eg'),
('Dabaa General Hospital', 'Dabaa', 'Matrouh', '046-2223334', 'dabaa@hosp.eg'),
('New Damietta City Hospital', 'New Damietta', 'Damietta', '057-5556667', 'newdam@hosp.eg'),
('Mit Ghamr Hospital', 'Mit Ghamr', 'Dakahlia', '050-8889990', 'mitghamr@hosp.eg'),
('Suez Canal University Hospital', 'Ismailia City', 'Ismailia', '064-9990001', 'scu@hosp.eg'),
('Ras El Bar Hospital', 'Ras El Bar', 'Damietta', '057-1110002', 'raselbar@hosp.eg'),
('Baltim Central Hospital', 'Baltim', 'Kafr El Sheikh', '047-3330004', 'baltim@hosp.eg'),
('Idku General Hospital', 'Idku', 'Beheira', '045-4441115', 'idku@hosp.eg'),
('Rosetta Hospital', 'Rosetta', 'Beheira', '045-5552226', 'rosetta@hosp.eg'),
('Safaga Hospital', 'Safaga', 'Red Sea', '065-6663337', 'safaga@hosp.eg'),
('Quseir Hospital', 'Quseir', 'Red Sea', '065-7774448', 'quseir@hosp.eg'),
('Marsa Alam Hospital', 'Marsa Alam', 'Red Sea', '065-8885559', 'marsaalam@hosp.eg'),
('Wadi El Natrun Hospital', 'Wadi El Natrun', 'Beheira', '045-9996660', 'wadi@hosp.eg'),
('El Mahalla General Hospital', 'Mahalla', 'Gharbia', '040-1231231', 'mahalla@hosp.eg'),
('Zefta General Hospital', 'Zefta', 'Gharbia', '040-4564562', 'zefta@hosp.eg'),
('Talkha Central Hospital', 'Talkha', 'Dakahlia', '050-7897893', 'talkha@hosp.eg'),
('Belqas Hospital', 'Belqas', 'Dakahlia', '050-3213214', 'belqas@hosp.eg');

-- Seed initial blood requests for the dashboard
INSERT INTO requests (user_id, blood_type, quantity_needed, governorate, phone, status, request_date)
VALUES 
(3, 'A+', 2, 'Cairo', '01012345678', 'PENDING', CURRENT_DATE),
(3, 'O-', 1, 'Giza', '01123456789', 'PENDING', CURRENT_DATE),
(3, 'B+', 3, 'Alexandria', '01234567890', 'PENDING', CURRENT_DATE),
(3, 'AB-', 1, 'Dakahlia', '01567890123', 'PENDING', CURRENT_DATE);
