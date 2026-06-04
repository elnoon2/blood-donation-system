package com.example.blooddonation.service;

import com.example.blooddonation.dto.EligibilityAssessmentDto;
import com.example.blooddonation.enums.EligibilityResult;
import com.example.blooddonation.repository.DonorHealthAssessmentRepository;
import com.example.blooddonation.repository.DonorRepository;
import com.example.blooddonation.repository.HomeCollectionRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class EligibilityServiceTest {

    private EligibilityService service;
    private DonorHealthAssessmentRepository assessmentRepo;
    private HomeCollectionRequestRepository collectionRepo;
    private DonorRepository donorRepo;

    @BeforeEach
    void setUp() throws Exception {
        service = new EligibilityService();
        assessmentRepo = Mockito.mock(DonorHealthAssessmentRepository.class);
        collectionRepo = Mockito.mock(HomeCollectionRequestRepository.class);
        donorRepo = Mockito.mock(DonorRepository.class);
        // Save returns whatever is passed in
        when(assessmentRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        inject(service, "assessmentRepository", assessmentRepo);
        inject(service, "requestRepository", collectionRepo);
        inject(service, "donorRepository", donorRepo);
    }

    @Test
    void hepatitisIsHardIneligible() {
        EligibilityAssessmentDto dto = baseDto();
        dto.setDoYouHaveHepatitis(true);
        EligibilityAssessmentDto result = service.evaluateAndSaveAssessment(null, dto);
        assertEquals(EligibilityResult.INELIGIBLE, result.getEligibilityResult());
    }

    @Test
    void liverDiseaseIsHardIneligible() {
        EligibilityAssessmentDto dto = baseDto();
        dto.setDoYouHaveLiverDisease(true);
        assertEquals(EligibilityResult.INELIGIBLE,
            service.evaluateAndSaveAssessment(null, dto).getEligibilityResult());
    }

    @Test
    void underageIsTemporarilyIneligible() {
        EligibilityAssessmentDto dto = baseDto();
        dto.setAge(17);
        assertEquals(EligibilityResult.TEMPORARILY_INELIGIBLE,
            service.evaluateAndSaveAssessment(null, dto).getEligibilityResult());
    }

    @Test
    void underweightIsTemporarilyIneligible() {
        EligibilityAssessmentDto dto = baseDto();
        dto.setWeight(45.0);
        assertEquals(EligibilityResult.TEMPORARILY_INELIGIBLE,
            service.evaluateAndSaveAssessment(null, dto).getEligibilityResult());
    }

    @Test
    void feverIsTemporarilyIneligible() {
        EligibilityAssessmentDto dto = baseDto();
        dto.setDoYouHaveFever(true);
        assertEquals(EligibilityResult.TEMPORARILY_INELIGIBLE,
            service.evaluateAndSaveAssessment(null, dto).getEligibilityResult());
    }

    @Test
    void lessThanThreeMonthsSinceLastDonationIsTemporarilyIneligible() {
        EligibilityAssessmentDto dto = baseDto();
        dto.setLastDonationDate(LocalDate.now().minusMonths(1));
        assertEquals(EligibilityResult.TEMPORARILY_INELIGIBLE,
            service.evaluateAndSaveAssessment(null, dto).getEligibilityResult());
    }

    @Test
    void chronicDiseaseIsNeedsReview() {
        EligibilityAssessmentDto dto = baseDto();
        dto.setDoYouHaveChronicDisease(true);
        assertEquals(EligibilityResult.NEEDS_REVIEW,
            service.evaluateAndSaveAssessment(null, dto).getEligibilityResult());
    }

    @Test
    void healthyAdultIsEligible() {
        EligibilityAssessmentDto dto = baseDto();
        assertEquals(EligibilityResult.ELIGIBLE,
            service.evaluateAndSaveAssessment(null, dto).getEligibilityResult());
    }

    @Test
    void hardIneligibleBeatsTemporarilyIneligible() {
        // Confirm the if/else-if order does not let temporary checks shadow hard ones.
        EligibilityAssessmentDto dto = baseDto();
        dto.setAge(17);              // would be TEMPORARILY_INELIGIBLE on its own
        dto.setDoYouHaveHepatitis(true); // hard ineligible — must win
        assertEquals(EligibilityResult.INELIGIBLE,
            service.evaluateAndSaveAssessment(null, dto).getEligibilityResult());
    }

    private EligibilityAssessmentDto baseDto() {
        EligibilityAssessmentDto dto = new EligibilityAssessmentDto();
        dto.setFullName("Test Donor");
        dto.setAge(30);
        dto.setWeight(70.0);
        dto.setBloodType("O+");
        dto.setGovernorate("Cairo");
        return dto;
    }

    /** Field-injection helper; the service uses @Autowired private fields. */
    private static void inject(Object target, String fieldName, Object value) throws Exception {
        var f = target.getClass().getDeclaredField(fieldName);
        f.setAccessible(true);
        f.set(target, value);
    }
}
