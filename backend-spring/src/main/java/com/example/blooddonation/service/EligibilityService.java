package com.example.blooddonation.service;

import com.example.blooddonation.dto.EligibilityAssessmentDto;
import com.example.blooddonation.dto.HomeCollectionRequestDto;
import com.example.blooddonation.entity.Donor;
import com.example.blooddonation.entity.DonorHealthAssessment;
import com.example.blooddonation.entity.HomeCollectionRequest;
import com.example.blooddonation.enums.CollectionRequestStatus;
import com.example.blooddonation.enums.EligibilityResult;
import com.example.blooddonation.repository.DonorHealthAssessmentRepository;
import com.example.blooddonation.repository.DonorRepository;
import com.example.blooddonation.repository.HomeCollectionRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EligibilityService {

    @Autowired
    private DonorHealthAssessmentRepository assessmentRepository;
    
    @Autowired
    private HomeCollectionRequestRepository requestRepository;

    @Autowired
    private DonorRepository donorRepository;

    @Transactional
    public EligibilityAssessmentDto evaluateAndSaveAssessment(Long donorId, EligibilityAssessmentDto dto) {
        // Eligibility Logic
        EligibilityResult result = EligibilityResult.ELIGIBLE;
        String explanation = "You appear eligible for donation pending medical confirmation.";
        String recommendation = "Proceed with selecting your donation option.";

        // Hard Ineligible conditions
        if (Boolean.TRUE.equals(dto.getDoYouHaveHepatitis()) || 
            Boolean.TRUE.equals(dto.getDoYouHaveLiverDisease()) ||
            Boolean.TRUE.equals(dto.getDoYouHaveHeartDisease()) ||
            Boolean.TRUE.equals(dto.getDoYouHaveBloodDisorder())) {
            result = EligibilityResult.INELIGIBLE;
            explanation = "Due to the medical conditions selected, you are not eligible to donate blood.";
            recommendation = "Thank you for your willingness to help, but blood donation is not safe for you or the recipient at this time.";
        }
        // Temporarily Ineligible conditions
        else if (dto.getAge() != null && (dto.getAge() < 18 || dto.getAge() > 65)) {
            result = EligibilityResult.TEMPORARILY_INELIGIBLE;
            explanation = "Your age falls outside the allowed range for blood donation (18-65 years).";
            recommendation = "You may not donate blood at this time based on age restrictions.";
        } else if (dto.getWeight() != null && dto.getWeight() < 50.0) {
            result = EligibilityResult.TEMPORARILY_INELIGIBLE;
            explanation = "Your weight is below the minimum requirement of 50 kg.";
            recommendation = "Please try again once you meet the minimum weight requirement.";
        } else if (Boolean.TRUE.equals(dto.getDoYouHaveFever()) || 
                   Boolean.TRUE.equals(dto.getDoYouHaveColdOrFlu()) ||
                   Boolean.TRUE.equals(dto.getDoYouHaveRecentInfection()) ||
                   Boolean.TRUE.equals(dto.getDoYouHaveRecentBleeding())) {
            result = EligibilityResult.TEMPORARILY_INELIGIBLE;
            explanation = "You currently have symptoms of illness or recent infection/bleeding.";
            recommendation = "Please wait until you are fully recovered and symptom-free for at least 14 days before attempting to donate.";
        } else if (Boolean.TRUE.equals(dto.getDidYouHaveRecentSurgery()) ||
                   Boolean.TRUE.equals(dto.getAreYouPregnantOrRecentlyPregnant()) ||
                   Boolean.TRUE.equals(dto.getDoYouHaveRecentTattooOrPiercing())) {
            result = EligibilityResult.TEMPORARILY_INELIGIBLE;
            explanation = "Due to recent surgery, pregnancy, or a recent tattoo/piercing, you must wait before donating.";
            recommendation = "You are temporarily restricted from donating. Check with a doctor regarding the exact waiting period.";
        } else if (dto.getLastDonationDate() != null && ChronoUnit.MONTHS.between(dto.getLastDonationDate(), LocalDate.now()) < 3) {
            result = EligibilityResult.TEMPORARILY_INELIGIBLE;
            explanation = "You have donated blood too recently. A waiting period of at least 3 months is required.";
            recommendation = "Please wait until at least 3 months have passed since your last donation.";
        }
        // Needs Review conditions
        else if (Boolean.TRUE.equals(dto.getDoYouHaveChronicDisease()) || 
                 Boolean.TRUE.equals(dto.getAreYouTakingMedications()) ||
                 Boolean.TRUE.equals(dto.getDoYouHaveDiabetes()) ||
                 Boolean.TRUE.equals(dto.getDoYouHaveHighBloodPressure()) ||
                 Boolean.TRUE.equals(dto.getDoYouFeelDizzyOrWeak())) {
            result = EligibilityResult.NEEDS_REVIEW;
            explanation = "Your health answers indicate that a medical professional needs to review your case.";
            recommendation = "Your case requires a doctor's review. Proceed to the hospital to get a final evaluation.";
        }

        // Set Results back to DTO
        dto.setEligibilityResult(result);
        dto.setExplanation(explanation);
        dto.setRecommendation(recommendation);

        // Map DTO to Entity
        DonorHealthAssessment assessment = DonorHealthAssessment.builder()
            .fullName(dto.getFullName())
            .age(dto.getAge())
            .gender(dto.getGender())
            .weight(dto.getWeight())
            .bloodType(dto.getBloodType())
            .phone(dto.getPhone())
            .email(dto.getEmail())
            .governorate(dto.getGovernorate())
            .city(dto.getCity())
            .address(dto.getAddress())
            .lastDonationDate(dto.getLastDonationDate())
            .doYouHaveFever(dto.getDoYouHaveFever())
            .doYouHaveColdOrFlu(dto.getDoYouHaveColdOrFlu())
            .doYouHaveChronicDisease(dto.getDoYouHaveChronicDisease())
            .chronicDiseaseDetails(dto.getChronicDiseaseDetails())
            .doYouHaveHeartDisease(dto.getDoYouHaveHeartDisease())
            .doYouHaveDiabetes(dto.getDoYouHaveDiabetes())
            .doYouHaveHighBloodPressure(dto.getDoYouHaveHighBloodPressure())
            .doYouHaveAnemia(dto.getDoYouHaveAnemia())
            .doYouHaveHepatitis(dto.getDoYouHaveHepatitis())
            .doYouHaveKidneyDisease(dto.getDoYouHaveKidneyDisease())
            .doYouHaveLiverDisease(dto.getDoYouHaveLiverDisease())
            .doYouHaveBloodDisorder(dto.getDoYouHaveBloodDisorder())
            .areYouTakingMedications(dto.getAreYouTakingMedications())
            .medicationDetails(dto.getMedicationDetails())
            .didYouHaveRecentSurgery(dto.getDidYouHaveRecentSurgery())
            .surgeryDetails(dto.getSurgeryDetails())
            .areYouPregnantOrRecentlyPregnant(dto.getAreYouPregnantOrRecentlyPregnant())
            .doYouSmoke(dto.getDoYouSmoke())
            .doYouHaveRecentTattooOrPiercing(dto.getDoYouHaveRecentTattooOrPiercing())
            .doYouHaveRecentInfection(dto.getDoYouHaveRecentInfection())
            .doYouHaveRecentBleeding(dto.getDoYouHaveRecentBleeding())
            .doYouFeelDizzyOrWeak(dto.getDoYouFeelDizzyOrWeak())
            .anyOtherMedicalCondition(dto.getAnyOtherMedicalCondition())
            .sleptWellLastNight(dto.getSleptWellLastNight())
            .ateBeforeDonation(dto.getAteBeforeDonation())
            .drankEnoughWater(dto.getDrankEnoughWater())
            .currentEnergyLevel(dto.getCurrentEnergyLevel())
            .doYouAgreeToMedicalReview(dto.getDoYouAgreeToMedicalReview())
            .eligibilityResult(result)
            .explanation(explanation)
            .recommendation(recommendation)
            .build();

        if (donorId != null) {
            Donor donor = donorRepository.findById(donorId).orElse(null);
            assessment.setDonor(donor);
        }

        assessmentRepository.save(assessment);

        return dto;
    }

    @Transactional
    public HomeCollectionRequestDto createHomeCollectionRequest(Long donorId, HomeCollectionRequestDto dto) {
        Donor donor = donorRepository.findById(donorId)
                .orElseThrow(() -> new RuntimeException("Donor not found"));

        HomeCollectionRequest request = HomeCollectionRequest.builder()
                .donor(donor)
                .fullAddress(dto.getFullAddress())
                .governorate(dto.getGovernorate())
                .city(dto.getCity())
                .phone(dto.getPhone())
                .preferredDate(dto.getPreferredDate())
                .preferredTime(dto.getPreferredTime())
                .reasonForHomeCollection(dto.getReasonForHomeCollection())
                .medicalNotes(dto.getMedicalNotes())
                .status(CollectionRequestStatus.PENDING_REVIEW)
                .build();

        HomeCollectionRequest saved = requestRepository.save(request);
        dto.setId(saved.getId());
        dto.setStatus(saved.getStatus());
        dto.setCreatedAt(saved.getCreatedAt());

        return dto;
    }
    
    public List<HomeCollectionRequestDto> getHomeCollectionRequests(Long donorId) {
        return requestRepository.findByDonorIdOrderByCreatedAtDesc(donorId).stream()
                .map(req -> {
                    HomeCollectionRequestDto dto = new HomeCollectionRequestDto();
                    dto.setId(req.getId());
                    dto.setFullAddress(req.getFullAddress());
                    dto.setGovernorate(req.getGovernorate());
                    dto.setCity(req.getCity());
                    dto.setPhone(req.getPhone());
                    dto.setPreferredDate(req.getPreferredDate());
                    dto.setPreferredTime(req.getPreferredTime());
                    dto.setReasonForHomeCollection(req.getReasonForHomeCollection());
                    dto.setMedicalNotes(req.getMedicalNotes());
                    dto.setStatus(req.getStatus());
                    dto.setCreatedAt(req.getCreatedAt());
                    return dto;
                })
                .collect(Collectors.toList());
    }
}
