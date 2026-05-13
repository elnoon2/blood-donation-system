# Official Presentation Plan: Smart Blood Donation System (LifeFlow)

This plan is structured according to the specific requirements for the final project presentation.

---

## 1. Project Title & Team Members
*   **Project Title**: LifeFlow: An Automated Smart Blood Donation & Inventory Management System.
*   **Team Members**: [Your Name] & Level 1/Level 2 Team.
*   **Supervision**: Under the guidance of our esteemed instructors.

## 2. Agenda
1.  Introduction & Problem Statement
2.  Proposed System & Objectives
3.  System Analysis (Requirements & Architecture)
4.  Design Models (Use Case & ER Diagram)
5.  System Tools (Tech Stack)
6.  System Demo & Screenshots
7.  Conclusion & Future Work

## 3. Introduction
*   **LifeFlow** is a comprehensive solution designed to bridge the critical gap between blood donors and patients in urgent need. It integrates real-time inventory tracking with a geolocation-based donor notification system.

## 4. Problem Statement
*   **Inefficiency**: Manual processes for finding donors lead to fatal delays.
*   **Data Fragmentation**: Hospitals lack a unified view of blood inventory in nearby facilities.
*   **Trust Issues**: Difficulty in verifying previous donations and health eligibility of donors.

## 5. Proposed System
*   A **Centralized Digital Platform** where:
    *   Hospitals manage their blood banks in real-time.
    *   Patients can post urgent requests visible to nearby verified donors.
    *   Every donation is verified via secure QR Code technology.

## 6. Objectives
*   To **reduce response time** in emergency blood requests by 70%.
*   To **digitize blood bank inventory** for 100% transparency.
*   To **ensure donor safety** through mandatory digital health assessments.

## 7. System Analysis
### 7.1. Functional Requirements
*   **User Management**: Registration, Login, and Role-based access (Donor, Patient, Hospital, Admin).
*   **Request Lifecycle**: Create, Match, Notify, Accept, and Verify requests.
*   **Inventory Control**: Real-time stock updates for 8 blood types.
*   **Notification System**: Real-time alerts for compatible donors in the same governorate.

### 7.2. Non-Functional Requirements
*   **Security**: Data encryption (BCrypt) and secure session handling (JWT).
*   **Reliability**: Oracle Database ensures 99.9% data persistence and integrity.
*   **Usability**: Responsive UI designed for both medical staff and regular users.

### 7.3. System Architecture
*   **N-Tier Architecture**:
    *   **Presentation Layer**: React.js / Vite.
    *   **Logic Layer**: Spring Boot REST APIs.
    *   **Data Layer**: Oracle Database 12c/XE.

### 7.4. Use Case (Key Scenarios)
*   **Donor**: "Register Profile", "Complete Health Assessment", "Accept Blood Request".
*   **Hospital**: "Update Inventory", "Verify Donation via QR", "Approve New Users".
*   **Patient**: "Submit Urgent Blood Request", "Track Request Status".

### 7.5. ER Diagram & Database Schema
*   **Structure**: 13 Entity-Relationship tables.
*   **Schema**: Optimized Oracle schema with PK/FK constraints to prevent data redundancy.
*   *(Note: Refer to the dbdiagram.io export for the visual schema).*

## 8. System Tools
### 8.1. Frontend
*   **HTML5 & CSS3**: The foundation of the web interface and structure.
*   **React 18**: For building a dynamic and fast user interface.
*   **Tailwind CSS**: For modern, utility-first premium styling.

### 8.2. Backend
*   **Spring Boot (Java)**: The robust core for handling business logic.
*   **Spring Security**: To enforce role-based access control.
*   **JPA/Hibernate**: For seamless communication with the Oracle DB.

## 9. Demo
*   **Recorded Video**: A complete active cycle showing:
    1.  Patient creating a request.
    2.  Donor receiving notification and accepting.
    3.  Hospital verifying the donation and inventory updating automatically.

## 10. Screenshots
*   *Dashboard Overview*
*   *Donor Finding Page (Filtered by Governorate)*
*   *Hospital Inventory Management*
*   *Admin Approval Portal*

## 11. Conclusion & Future Work
*   **Conclusion**: LifeFlow transforms the traditional blood bank model into a proactive, technology-driven ecosystem that saves lives through data.
*   **Future Work**:
    *   Integrating **AI** to predict blood demand spikes.
    *   Developing a **Mobile App** with push notifications.
    *   Expanding the system to include **Organ Donation** records.
