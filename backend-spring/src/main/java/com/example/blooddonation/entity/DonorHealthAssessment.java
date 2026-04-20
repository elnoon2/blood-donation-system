package com.example.blooddonation.entity;

import com.example.blooddonation.enums.EligibilityResult;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "donor_health_assessments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonorHealthAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donor_id")
    private Donor donor;

    // Basic Info
    private String fullName;
    private Integer age;
    private String gender;
    private Double weight;
    private String bloodType;
    private String phone;
    private String email;
    private String governorate;
    private String city;
    private String address;
    private LocalDate lastDonationDate;

    // Health Questions
    private Boolean doYouHaveFever;
    private Boolean doYouHaveColdOrFlu;
    private Boolean doYouHaveChronicDisease;
    private String chronicDiseaseDetails;
    private Boolean doYouHaveHeartDisease;
    private Boolean doYouHaveDiabetes;
    private Boolean doYouHaveHighBloodPressure;
    private Boolean doYouHaveAnemia;
    private Boolean doYouHaveHepatitis;
    private Boolean doYouHaveKidneyDisease;
    private Boolean doYouHaveLiverDisease;
    private Boolean doYouHaveBloodDisorder;
    private Boolean areYouTakingMedications;
    private String medicationDetails;
    private Boolean didYouHaveRecentSurgery;
    private String surgeryDetails;
    private Boolean areYouPregnantOrRecentlyPregnant;
    private Boolean doYouSmoke;
    private Boolean doYouHaveRecentTattooOrPiercing;
    private Boolean doYouHaveRecentInfection;
    private Boolean doYouHaveRecentBleeding;
    private Boolean doYouFeelDizzyOrWeak;
    private String anyOtherMedicalCondition;

    // Lifestyle
    private Boolean sleptWellLastNight;
    private Boolean ateBeforeDonation;
    private Boolean drankEnoughWater;
    private String currentEnergyLevel;
    private Boolean doYouAgreeToMedicalReview;

    // Result
    @Enumerated(EnumType.STRING)
    private EligibilityResult eligibilityResult;

    private String explanation;
    private String recommendation;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
