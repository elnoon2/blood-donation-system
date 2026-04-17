package com.example.blooddonation.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "donation_verifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonationVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private Request request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donor_id", nullable = false)
    private User donor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @Column(name = "hospital_name", nullable = false)
    private String hospitalName;

    @Column(name = "doctor_name", nullable = false)
    private String doctorName;

    @Column(name = "doctor_medical_id", nullable = false)
    private String doctorMedicalId;

    @Column(name = "donation_date", nullable = false)
    private LocalDate donationDate;

    @Column(name = "bags_count")
    private Integer bagsCount;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Lob
    @Column(name = "id_card_image", columnDefinition = "LONGTEXT")
    private String idCardImage;

    @Lob
    @Column(name = "questionnaire_json", columnDefinition = "LONGTEXT")
    private String questionnaireJson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by_doctor_id")
    private User verifiedByDoctor;

    @Column(name = "verified_at")
    @Builder.Default
    private LocalDateTime verifiedAt = LocalDateTime.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (verifiedAt == null) verifiedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
