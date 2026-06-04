package com.example.blooddonation.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "donation_forms")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonationForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id")
    private Long requestId;

    // Patient Information
    @Column(name = "patient_name", nullable = false)
    private String patientName;

    @Column(name = "patient_national_id", nullable = false)
    private String patientNationalId;

    @Column(name = "blood_type", nullable = false)
    private String bloodType;

    @Column(name = "patient_phone", nullable = false)
    private String patientPhone;

    @Column(name = "patient_age")
    private Integer patientAge;

    @Column(name = "patient_governorate", nullable = false)
    private String patientGovernorate;

    @Column(name = "patient_address", columnDefinition = "CLOB")
    private String patientAddress;

    @Column(columnDefinition = "CLOB")
    private String notes;

    // Doctor Information
    @Column(name = "doctor_name", nullable = false)
    private String doctorName;

    @Column(name = "doctor_id_number", nullable = false)
    private String doctorIdNumber;

    @Lob
    @Column(name = "doctor_id_image")
    private String doctorIdImage;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
