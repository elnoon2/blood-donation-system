package com.example.blooddonation.repository;

import com.example.blooddonation.entity.DonationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DonationHistoryRepository extends JpaRepository<DonationHistory, Long> {
    List<DonationHistory> findByPatientIdOrderByVerifiedAtDesc(Long patientId);
    List<DonationHistory> findByHospitalIdOrderByVerifiedAtDesc(Long hospitalId);
    List<DonationHistory> findByDonorIdOrderByVerifiedAtDesc(Long donorId);
}
