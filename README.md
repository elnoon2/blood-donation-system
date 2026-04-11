# Smart Blood Donation System 🩸

Modern, secure, and intelligent platform localized for the Egyptian market to connect blood donors with patients and hospitals in real-time.

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

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Lucide Icons.
- **Backend**: Java Spring Boot + Spring Security + JWT.
- **Database**: MySQL.
- **Styling**: Vanilla CSS (Modern themes).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Java JDK 17+
- MySQL Server

### 1. Backend Setup
1. Navigate to `backend-spring`.
2. Update `application.properties` with your MySQL credentials.
3. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```
4. Seed data is automatically loaded from `schema.sql` and `data.sql`.

### 2. Frontend Setup
1. Open a new terminal in the root directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 📊 Database Schema

The system uses a robust schema including:
- `users`: Central table for authentication and profile data.
- `donors`: Specific data for donation availability.
- `requests`: Tracks blood needs and status.
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
