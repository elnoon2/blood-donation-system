package com.example.blooddonation.repository;

import com.example.blooddonation.entity.DonorHealthAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DonorHealthAssessmentRepository extends JpaRepository<DonorHealthAssessment, Long> {
    List<DonorHealthAssessment> findByDonorIdOrderByCreatedAtDesc(Long donorId);
}
