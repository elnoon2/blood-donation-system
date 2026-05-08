# Smart Blood Donation System 🩸

Modern, secure, and intelligent platform localized for the Egyptian market to connect blood donors with patients and hospitals in real-time. This system has been recently upgraded to use **Oracle Database** for enterprise-grade data management.

---

## 🌟 Key Features

### 1. Smart Matching System (Intelligence) 🧠
The platform uses advanced medical compatibility rules to find the best donors for any request:
- **Automatic Compatibility**: Searching for `A+` will not only find exact matches but also compatible universal donors like `O-`.
- **Regional Filtering**: Advanced filtering by **27 Egyptian Governorates**.
- **Availability Tracking**: Donors can toggle their availability status and track their last donation date.

### 2. User Roles 👥
- **Donors**: Manage profiles, set availability, and view nearby requests.
- **Patients/Requesters**: Submit blood requests with urgency levels.
- **Admin**: Premium dashboard with real-time analytics, user management, and system health monitoring.

### 3. Premium UI/UX 🎨
- **Modern Design**: Built with React, Tailwind CSS, and Framer Motion for smooth animations.
- **Responsive**: 100% mobile-friendly design.
- **Egyptian Localization**: Full support for all Egyptian regions and localized contact information.

---

## 🛠️ Technology Stack

- **Frontend**: React 18 + Vite + TypeScript + Lucide Icons.
- **Styling**: Tailwind CSS + Vanilla CSS (Modern Custom Themes).
- **Animations**: Framer Motion.
- **Backend**: Java Spring Boot 3 + Spring Security + JWT Authentication.
- **Database**: **Oracle Database (18c/21c XE)**.
- **ORM/JPA**: Hibernate 6 / Spring Data JPA.

---

## 🚀 Getting Started (Fast Run)

The easiest way to run the project is using the provided automation script:

1. Make sure you have **Node.js**, **Java 17+**, and **Oracle Database** installed.
2. Ensure your Oracle listener is running on port `1521`.
3. Double-click `run-project.bat` in the root directory.
   - This will start the Backend on `http://localhost:8080`
   - This will start the Frontend on `http://localhost:5173`

---

## ⚙️ Manual Configuration

### 1. Oracle Database Setup
1. Create a user named `system` (or use existing) with password `nour12345` (or update `application.properties`).
2. The schema is automatically initialized from `backend-spring/src/main/resources/schema.sql` on the first run.
3. Seed data is loaded from `data.sql`.

### 2. Backend Configuration
Update `backend-spring/src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:oracle:thin:@localhost:1521:xe
spring.datasource.username=system
spring.datasource.password=your_password
```

---

## 📊 Database Schema (Oracle Optimized)

The system uses a robust schema including:
- `users`: Central table for authentication (Oracle `IDENTITY` columns).
- `donors`: Specific data for donation availability.
- `requests`: Tracks blood needs with status management and matched donor links.
- `hospitals`: Partners and inventory tracking.
- `notifications`: Real-time system alerts.

---

## 📞 Support & Contact
- **Email**: support@lifeflow.com
- **Phone**: +20 (100) 123-4567
- **Address**: 123 Nile Street, Maadi, Cairo, Egypt

---

## 🖋️ License
Project developed for modern healthcare solutions in Egypt.
