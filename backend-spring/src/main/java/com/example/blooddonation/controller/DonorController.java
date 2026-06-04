package com.example.blooddonation.controller;

import com.example.blooddonation.dto.DonorDTO;
import com.example.blooddonation.entity.Donor;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.exception.ResourceNotFoundException;
import com.example.blooddonation.repository.DonorRepository;
import com.example.blooddonation.repository.UserRepository;
import com.example.blooddonation.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/donors")
public class DonorController {

    @Autowired
    DonorRepository donorRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    com.example.blooddonation.repository.DonationRepository donationRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','HOSPITAL')")
    public List<Donor> getAllDonors() {
        return donorRepository.findAll();
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN','HOSPITAL')")
    public List<Donor> searchDonors(@RequestParam(required = false) String bloodType, @RequestParam(required = false) String governorate) {
        if (bloodType == null || bloodType.isBlank() || bloodType.equalsIgnoreCase("all") || bloodType.equalsIgnoreCase("Not Set")) {
             if (governorate != null && !governorate.isBlank() && !governorate.equalsIgnoreCase("all")) {
                 return donorRepository.findByUserGovernorateIgnoreCase(governorate);
             }
             return donorRepository.findAll();
        }

        List<String> compatibleTypes = com.example.blooddonation.util.BloodCompatibilityUtil.getCompatibleDonorTypes(bloodType);
        
        if (governorate != null && !governorate.isBlank() && !governorate.equalsIgnoreCase("all")) {
            return donorRepository.findByUserBloodTypeInAndUserGovernorateIgnoreCase(compatibleTypes, governorate);
        }
        return donorRepository.findByUserBloodTypeIn(compatibleTypes);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HOSPITAL')")
    public ResponseEntity<Donor> getDonorById(@PathVariable Long id) {
        Donor donor = donorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Donor not found with id: " + id));
        return ResponseEntity.ok(donor);
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @jakarta.transaction.Transactional
    public ResponseEntity<Donor> getMyDonorProfile(Authentication auth) {
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
        Donor donor = donorRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Donor profile not found"));
        return ResponseEntity.ok(donor);
    }

    @GetMapping("/stats")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<com.example.blooddonation.dto.DonorStatsDTO> getMyStats(Authentication auth) {
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        Long userId = userDetails.getId();
        
        long totalDonations = donationRepository.countByUserId(userId);
        long livesSaved = totalDonations * 3;
        
        Donor donor = donorRepository.findByUserId(userId).orElse(null);
        String nextEligibleDate = "Available Now";
        int daysUntilEligible = 0;
        
        if (donor != null && donor.getLastDonationDate() != null) {
            java.time.LocalDate nextDate = donor.getLastDonationDate().plusMonths(3);
            if (nextDate.isAfter(java.time.LocalDate.now())) {
                nextEligibleDate = nextDate.toString();
                daysUntilEligible = (int) java.time.temporal.ChronoUnit.DAYS.between(java.time.LocalDate.now(), nextDate);
            }
        }
        
        int impactScore = (int) (totalDonations * 100);
        
        com.example.blooddonation.dto.DonorStatsDTO stats = com.example.blooddonation.dto.DonorStatsDTO.builder()
                .totalDonations(totalDonations)
                .livesSaved(livesSaved)
                .nextEligibleDate(nextEligibleDate)
                .daysUntilEligible(daysUntilEligible)
                .impactScore(impactScore)
                .build();
                
        return ResponseEntity.ok(stats);
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @jakarta.transaction.Transactional
    public ResponseEntity<Donor> updateMyDonorProfile(@RequestBody DonorDTO dto, Authentication auth) {
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
        
        // Update user fields (governorate and phone are now in User)
        if(dto.getGovernorate() != null) user.setGovernorate(dto.getGovernorate());
        if(dto.getPhone() != null) user.setPhone(dto.getPhone());
        userRepository.save(user);

        // Auto-create donor record if it doesn't exist
        Donor donor = donorRepository.findByUser(user)
                .orElseGet(() -> {
                    Donor newDonor = Donor.builder()
                            .user(user)
                            .availabilityStatus("AVAILABLE")
                            .build();
                    return donorRepository.save(newDonor);
                });

        if(dto.getAvailabilityStatus() != null) donor.setAvailabilityStatus(dto.getAvailabilityStatus());
        if(dto.getLastDonationDate() != null && !dto.getLastDonationDate().isEmpty()) {
            donor.setLastDonationDate(java.time.LocalDate.parse(dto.getLastDonationDate()));
        }

        return ResponseEntity.ok(donorRepository.save(donor));
    }

    @PostMapping("/register-me")
    @PreAuthorize("hasAnyRole('PATIENT','ADMIN')")
    @jakarta.transaction.Transactional
    public ResponseEntity<?> registerAsDonor(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));

        // 1. Upgrade Role if needed
        if (user.getRole() != com.example.blooddonation.enums.Role.DONOR) {
            user.setRole(com.example.blooddonation.enums.Role.DONOR);
            userRepository.save(user);
        }

        // 2. Create Donor entity ONLY if it doesn't exist
        if (donorRepository.findByUser(user).isEmpty()) {
            Donor donor = Donor.builder()
                    .user(user)
                    .availabilityStatus("AVAILABLE")
                    .build();
            donorRepository.save(donor);
        }

        return ResponseEntity.ok(new com.example.blooddonation.dto.MessageResponse("Now you are a donor!"));
    }

    @Autowired
    com.example.blooddonation.repository.RequestRepository requestRepository;

    @DeleteMapping("/unregister-me")
    @PreAuthorize("hasAnyRole('DONOR','ADMIN')")
    @jakarta.transaction.Transactional
    public ResponseEntity<?> unregisterAsDonor(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));

        // Guard: refuse to unregister while the donor is matched to a request
        // that is still being fulfilled. Otherwise the request ends up pointing
        // to a user whose role is now PATIENT, leaving the QR/donation flow
        // in an undefined state.
        java.util.List<com.example.blooddonation.enums.RequestStatus> blockingStatuses = java.util.List.of(
                com.example.blooddonation.enums.RequestStatus.ACCEPTED,
                com.example.blooddonation.enums.RequestStatus.IN_PROGRESS
        );
        boolean hasActive = requestRepository
                .findByMatchedDonorIdOrderByRequestDateDesc(user.getId())
                .stream()
                .anyMatch(r -> blockingStatuses.contains(r.getStatus()));
        if (hasActive) {
            return ResponseEntity.status(409).body(new com.example.blooddonation.dto.MessageResponse(
                    "Cannot unregister: you have an ACCEPTED or IN_PROGRESS request. " +
                    "Complete or cancel the donation first."));
        }

        // 1. Revert Role
        user.setRole(com.example.blooddonation.enums.Role.PATIENT);
        userRepository.save(user);

        // 2. Remove Donor entity
        donorRepository.findByUser(user).ifPresent(d -> donorRepository.delete(d));

        return ResponseEntity.ok(new com.example.blooddonation.dto.MessageResponse("Role reverted to patient."));
    }
}
