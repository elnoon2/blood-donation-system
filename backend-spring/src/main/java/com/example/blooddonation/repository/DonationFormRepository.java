package com.example.blooddonation.repository;

import com.example.blooddonation.entity.DonationForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DonationFormRepository extends JpaRepository<DonationForm, Long> {
}
