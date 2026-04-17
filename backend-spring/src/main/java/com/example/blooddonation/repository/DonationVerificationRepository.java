package com.example.blooddonation.repository;

import com.example.blooddonation.entity.DonationVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DonationVerificationRepository extends JpaRepository<DonationVerification, Long> {
}
