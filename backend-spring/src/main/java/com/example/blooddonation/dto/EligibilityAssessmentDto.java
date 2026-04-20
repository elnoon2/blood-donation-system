package com.example.blooddonation.dto;

import com.example.blooddonation.enums.EligibilityResult;
import lombok.Data;

import java.time.LocalDate;

@Data
public class EligibilityAssessmentDto {
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

    private Boolean sleptWellLastNight;
    private Boolean ateBeforeDonation;
    private Boolean drankEnoughWater;
    private String currentEnergyLevel;
    private Boolean doYouAgreeToMedicalReview;
    
    // Output fields
    private EligibilityResult eligibilityResult;
    private String explanation;
    private String recommendation;
}
