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

    @GetMapping
    public List<Donor> getAllDonors() {
        return donorRepository.findAll();
    }

    @GetMapping("/search")
    public List<Donor> searchDonors(@RequestParam String bloodType, @RequestParam(required = false) String governorate) {
        List<String> compatibleTypes = com.example.blooddonation.util.BloodCompatibilityUtil.getCompatibleDonorTypes(bloodType);
        
        if (governorate != null && !governorate.isBlank() && !governorate.equalsIgnoreCase("all")) {
            return donorRepository.findByUserBloodTypeInAndUserGovernorateIgnoreCase(compatibleTypes, governorate);
        }
        return donorRepository.findByUserBloodTypeIn(compatibleTypes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Donor> getDonorById(@PathVariable Long id) {
        Donor donor = donorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Donor not found with id: " + id));
        return ResponseEntity.ok(donor);
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<Donor> updateMyDonorProfile(@RequestBody DonorDTO dto, Authentication auth) {
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        User user = userRepository.findById(userDetails.getId()).get();
        
        // Update user fields (governorate and phone are now in User)
        if(dto.getGovernorate() != null) user.setGovernorate(dto.getGovernorate());
        if(dto.getPhone() != null) user.setPhone(dto.getPhone());
        userRepository.save(user);

        Donor donor = donorRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Donor profile not found"));

        if(dto.getAvailabilityStatus() != null) donor.setAvailabilityStatus(dto.getAvailabilityStatus());
        if(dto.getLastDonationDate() != null && !dto.getLastDonationDate().isEmpty()) {
            donor.setLastDonationDate(java.time.LocalDate.parse(dto.getLastDonationDate()));
        }

        return ResponseEntity.ok(donorRepository.save(donor));
    }
}
