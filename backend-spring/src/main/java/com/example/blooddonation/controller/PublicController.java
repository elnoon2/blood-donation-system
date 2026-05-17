package com.example.blooddonation.controller;

import com.example.blooddonation.dto.PublicStatsDTO;
import com.example.blooddonation.repository.DonationRepository;
import com.example.blooddonation.repository.DonorRepository;
import com.example.blooddonation.repository.HospitalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    @Autowired
    DonorRepository donorRepository;

    @Autowired
    HospitalRepository hospitalRepository;

    @Autowired
    DonationRepository donationRepository;

    @GetMapping("/stats")
    public ResponseEntity<PublicStatsDTO> getPublicStats() {
        long totalDonors = donorRepository.count();
        long totalHospitals = hospitalRepository.count();
        long totalDonations = donationRepository.count();
        long totalLivesSaved = totalDonations * 3;

        PublicStatsDTO stats = PublicStatsDTO.builder()
                .totalDonors(totalDonors)
                .totalHospitals(totalHospitals)
                .totalLivesSaved(totalLivesSaved)
                .build();

        return ResponseEntity.ok(stats);
    }
}
