# Complete Project Documentation: Smart Blood Donation System 🩸

## 1. Project Overview
The **Smart Blood Donation System** is a comprehensive, enterprise-grade web platform designed to bridge the gap between blood donors, patients in need, and hospital centers. Localized specifically for the Egyptian healthcare landscape, it provides an intelligent matching system to save lives efficiently.

### Core Objectives:
- **Efficiency**: Reducing the time spent searching for compatible blood donors.
- **Accessibility**: Providing a mobile-friendly platform for all users across 27 Egyptian Governorates.
- **Security**: Ensuring data privacy and secure medical information handling.
- **Automation**: Automating donor-patient matching and notification delivery.

---

## 2. Technology Stack 🛠️

### Frontend (User Interface)
- **Framework**: React 18 (Vite-powered)
- **Language**: TypeScript (for type safety)
- **Styling**: Tailwind CSS + Vanilla CSS (Custom Themes)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Data Visualization**: Recharts (for Admin Analytics)

### Backend (Server Logic)
- **Framework**: Java Spring Boot 3
- **Security**: Spring Security + JWT (JSON Web Tokens)
- **Architecture**: RESTful API
- **Dependency Management**: Maven

### Database (Data Management)
- **Provider**: **Oracle Database (18c/21c XE)**
- **ORM**: Hibernate 6 / Spring Data JPA
- **Initialization**: Automated SQL Schema & Data Seeding

---

## 3. Key Features & User Roles 👥

### A. Donors
- **Smart Profile**: Detailed profile including blood type, last donation date, and health status.
- **Availability Toggle**: Real-time status management (Available/Unavailable).
- **History Tracking**: Automatic tracking of donation frequency and eligibility.

### B. Patients / Requesters
- **Instant Request**: Create blood requests with urgency levels (Normal, Urgent, Critical).
- **Smart Matching**: The system automatically filters compatible donors (e.g., O- donors for any request).
- **Map Integration**: Link requests to precise locations for faster response.

### C. Administrators
- **Real-time Analytics**: Charts showing donation trends and blood type distribution.
- **User Management**: Approve/Reject hospital accounts and monitor system activity.
- **System Health**: Monitoring total donations, lives saved, and hospital inventory.

---

## 4. Database Schema (Oracle Optimized) 📊

The system utilizes 12 primary tables in Oracle, utilizing `IDENTITY` columns for performance:

1.  **USERS**: Central table for authentication (Admin, Donor, Patient, Doctor, Hospital roles).
2.  **DONORS**: Extended data for blood type and availability.
3.  **REQUESTS**: Blood requests containing quantity, location, and status.
4.  **HOSPITALS**: Directory of medical centers across Egypt.
5.  **BLOOD_INVENTORY**: Real-time stock levels of blood types per hospital.
6.  **DONATIONS**: Records of completed donation events.
7.  **NOTIFICATIONS**: System-wide alerts for new requests or approvals.
8.  **ADMIN_ACTIONS**: Audit logs for administrative changes.
9.  **QR_VERIFICATION**: Secure tokens for verifying successful donations via QR codes.
10. **DONATION_VERIFICATIONS**: Medical records signed by doctors.
11. **DONATION_FORMS**: Secure storage for digital medical verification forms including doctor signatures and IDs.
12. **HEALTH_ASSESSMENTS**: Digital forms for donor medical eligibility.
13. **HOME_COLLECTION**: Requests for blood collection from home.

---

## 5. Security & Authentication 🔐

- **Password Hashing**: BCrypt algorithm for irreversible password storage.
- **JWT Authentication**: Stateless session management for secure API communication.
- **Role-Based Access Control (RBAC)**: Specific endpoints restricted to Admin, Hospital, or Donor roles only.
- **CORS Policy**: Configured to allow secure communication between Frontend and Backend.

---

## 6. How to Run the Project 🚀

### Prerequisites:
- **Java 17+**
- **Node.js 18+**
- **Oracle Database XE** (Running on port 1521)

### The Fast Way:
1. Open the root directory.
2. Double-click `run-project.bat`.
3. Wait for the Backend terminal to show `Started BloodDonationApplication`.
4. The website will automatically open at `http://localhost:5173`.

### Manual Configuration:
- **Backend**: Update `application.properties` with your Oracle username and password.
- **Database**: Run `schema.sql` and `data.sql` to initialize the enterprise data.

---

## 7. Future Enhancements 📈
- **Mobile App**: Native Android/iOS applications for push notifications.
- **AI Predictions**: Predicting blood shortages using historical donation data.
- **SMS Integration**: Sending direct SMS alerts to donors in critical emergencies.

---
**Document Version**: 1.0 (Oracle Edition)
**Created By**: Antigravity AI
**Date**: May 2026
