package com.example.blooddonation.repository;

import com.example.blooddonation.entity.DonorHealthAssessment;
import com.example.blooddonation.enums.EligibilityResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface DonorHealthAssessmentRepository extends JpaRepository<DonorHealthAssessment, Long> {
    List<DonorHealthAssessment> findByDonorIdOrderByCreatedAtDesc(Long donorId);

    /**
     * The most recent assessment for a donor whose result is in the allowed set
     * AND was completed within a recent window. Powers the eligibility gate
     * applied at acceptRequest (audit Batch 3).
     */
    Optional<DonorHealthAssessment> findFirstByDonorIdAndEligibilityResultInAndCreatedAtAfterOrderByCreatedAtDesc(
            Long donorId,
            Collection<EligibilityResult> allowedResults,
            LocalDateTime createdAfter
    );
}
