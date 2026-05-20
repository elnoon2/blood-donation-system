package com.example.blooddonation.controller;

import com.example.blooddonation.dto.EligibilityAssessmentDto;
import com.example.blooddonation.dto.HomeCollectionRequestDto;
import com.example.blooddonation.entity.Donor;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.repository.DonorRepository;
import com.example.blooddonation.repository.UserRepository;
import com.example.blooddonation.service.EligibilityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class DonorExtensionController {

    @Autowired
    private EligibilityService eligibilityService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DonorRepository donorRepository;

    private Long getDonorIdFromAuthentication(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null; // Guest user or unauthenticated
        }
        Optional<User> userOptional = userRepository.findByEmail(authentication.getName());
        if (userOptional.isPresent()) {
            Optional<Donor> donorOptional = donorRepository.findByUser(userOptional.get());
            if (donorOptional.isPresent()) {
                return donorOptional.get().getId();
            }
        }
        return null;
    }

    @PostMapping("/donor-eligibility/check")
    public ResponseEntity<?> checkEligibility(
            @RequestBody EligibilityAssessmentDto dto, 
            Authentication authentication) {
        try {
            Long donorId = getDonorIdFromAuthentication(authentication);
            EligibilityAssessmentDto result = eligibilityService.evaluateAndSaveAssessment(donorId, dto);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            java.util.Map<String, String> errorBody = new java.util.HashMap<>();
            errorBody.put("error", e.getClass().getSimpleName() + ": " + e.getMessage());
            Throwable cause = e.getCause();
            if (cause != null) {
                errorBody.put("cause", cause.getClass().getSimpleName() + ": " + cause.getMessage());
            }
            return ResponseEntity.status(500).body(errorBody);
        }
    }

    @PostMapping("/home-collection-request/create")
    public ResponseEntity<HomeCollectionRequestDto> createHomeCollectionRequest(
            @RequestBody HomeCollectionRequestDto dto, 
            Authentication authentication) {
        Long donorId = getDonorIdFromAuthentication(authentication);
        if (donorId == null) {
            return ResponseEntity.status(401).build(); // Home collection requires authentication
        }
        HomeCollectionRequestDto result = eligibilityService.createHomeCollectionRequest(donorId, dto);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/home-collection-requests")
    public ResponseEntity<List<HomeCollectionRequestDto>> getHomeCollectionRequests(
            Authentication authentication) {
        Long donorId = getDonorIdFromAuthentication(authentication);
        if (donorId == null) {
            return ResponseEntity.status(401).build();
        }
        List<HomeCollectionRequestDto> requests = eligibilityService.getHomeCollectionRequests(donorId);
        return ResponseEntity.ok(requests);
    }
}
