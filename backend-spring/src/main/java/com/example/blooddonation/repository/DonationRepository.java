package com.example.blooddonation.repository;

import com.example.blooddonation.entity.Donation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DonationRepository extends JpaRepository<Donation, Long> {
    long countByUserId(Long userId);
    java.util.List<Donation> findByUserId(Long userId);
    java.util.List<Donation> findByHospitalId(Long hospitalId);
}
