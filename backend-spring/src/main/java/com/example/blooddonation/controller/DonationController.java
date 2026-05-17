package com.example.blooddonation.controller;

import com.example.blooddonation.dto.DonationDTO;
import com.example.blooddonation.dto.MessageResponse;
import com.example.blooddonation.entity.BloodInventory;
import com.example.blooddonation.entity.Donation;
import com.example.blooddonation.entity.Hospital;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.enums.DonationStatus;
import com.example.blooddonation.exception.ResourceNotFoundException;
import com.example.blooddonation.repository.BloodInventoryRepository;
import com.example.blooddonation.repository.DonationRepository;
import com.example.blooddonation.repository.HospitalRepository;
import com.example.blooddonation.repository.UserRepository;
import com.example.blooddonation.security.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/donations")
public class DonationController {

    @Autowired
    DonationRepository donationRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    HospitalRepository hospitalRepository;

    @Autowired
    BloodInventoryRepository inventoryRepository;

    @Autowired
    com.example.blooddonation.repository.DonorRepository donorRepository;

    @GetMapping
    public List<Donation> getAllDonations() {
        return donationRepository.findAll();
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public List<Donation> getMyDonations(Authentication auth) {
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        return donationRepository.findByUserId(userDetails.getId());
    }

    @GetMapping("/{id}")
    public Donation getDonationById(@PathVariable Long id) {
        return donationRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Donation not found"));
    }

    @PostMapping
    @Transactional
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<?> createDonation(@Valid @RequestBody DonationDTO dto, Authentication auth) {
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        User user = userRepository.findById(userDetails.getId()).get();

        com.example.blooddonation.entity.Donor donor = donorRepository.findByUserId(user.getId()).orElse(null);
        if (donor != null && donor.getLastDonationDate() != null) {
            LocalDate threeMonthsAgo = LocalDate.now().minusMonths(3);
            if (donor.getLastDonationDate().isAfter(threeMonthsAgo)) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: You can only donate once every 3 months."));
            }
        }

        Hospital hospital = hospitalRepository.findById(dto.getHospitalId())
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found"));

        Donation donation = Donation.builder()
                .user(user)
                .hospital(hospital)
                .bloodType(user.getBloodType())
                .quantity(dto.getQuantity())
                .donationDate(LocalDate.now())
                .status(DonationStatus.COMPLETED)
                .build();
        donationRepository.save(donation);

        if (donor != null) {
            donor.setLastDonationDate(LocalDate.now());
            donorRepository.save(donor);
        }

        // Auto update inventory
        Optional<BloodInventory> existingInv = inventoryRepository.findByHospitalIdAndBloodType(hospital.getId(), user.getBloodType());
        if(existingInv.isPresent()) {
            BloodInventory inv = existingInv.get();
            inv.setUnitsAvailable(inv.getUnitsAvailable() + dto.getQuantity());
            inventoryRepository.save(inv);
        } else {
            BloodInventory newInv = BloodInventory.builder()
                .hospital(hospital)
                .bloodType(user.getBloodType())
                .unitsAvailable(dto.getQuantity())
                .lastUpdated(LocalDateTime.now())
                .build();
            inventoryRepository.save(newInv);
        }

        return ResponseEntity.ok(new MessageResponse("Donation recorded and inventory updated"));
    }

}
