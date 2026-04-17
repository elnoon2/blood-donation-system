package com.example.blooddonation.controller;

import com.example.blooddonation.enums.Role;
import com.example.blooddonation.enums.RequestStatus;
import com.example.blooddonation.dto.MessageResponse;
import com.example.blooddonation.dto.RequestResponseDTO;
import com.example.blooddonation.entity.*;
import com.example.blooddonation.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    UserRepository userRepository;

    @Autowired
    DonorRepository donorRepository;

    @Autowired
    RequestRepository requestRepository;

    @Autowired
    HospitalRepository hospitalRepository;

    @Autowired
    DonationRepository donationRepository;

    @GetMapping("/dashboard")
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalDonors", userRepository.findByRole(Role.DONOR).size());
        stats.put("totalPatients", userRepository.findByRole(Role.PATIENT).size());
        stats.put("totalRequests", requestRepository.count());
        stats.put("totalHospitals", hospitalRepository.count());
        stats.put("totalDonations", donationRepository.count());
        
        return stats;
    }

    @GetMapping("/donors")
    public List<Donor> getAllDonors(
            @RequestParam(required = false) String governorate,
            @RequestParam(required = false) String bloodType) {
        
        if (governorate != null && !"all".equals(governorate) && bloodType != null && !"all".equals(bloodType)) {
            return donorRepository.findByUserBloodTypeAndUserGovernorateIgnoreCase(bloodType, governorate);
        } else if (governorate != null && !"all".equals(governorate)) {
            return donorRepository.findByUserGovernorateIgnoreCase(governorate);
        } else if (bloodType != null && !"all".equals(bloodType)) {
            return donorRepository.findByUserBloodType(bloodType);
        }
        return donorRepository.findAll();
    }

    @GetMapping("/patients")
    public List<User> getAllPatients(
            @RequestParam(required = false) String governorate,
            @RequestParam(required = false) String bloodType) {
        
        List<User> patients = userRepository.findByRole(Role.PATIENT);
        
        return patients.stream()
                .filter(p -> (governorate == null || "all".equals(governorate) || governorate.equalsIgnoreCase(p.getGovernorate())))
                .filter(p -> (bloodType == null || "all".equals(bloodType) || bloodType.equals(p.getBloodType())))
                .toList();
    }

    @GetMapping("/requests")
    public List<RequestResponseDTO> getAllRequests(
            @RequestParam(required = false) String governorate,
            @RequestParam(required = false) String bloodType,
            org.springframework.security.core.Authentication auth) {
        
        User currentUser = null;
        if (auth != null && auth.getPrincipal() instanceof com.example.blooddonation.security.UserDetailsImpl) {
            com.example.blooddonation.security.UserDetailsImpl principal = (com.example.blooddonation.security.UserDetailsImpl) auth.getPrincipal();
            currentUser = userRepository.findById(principal.getId()).orElse(null);
        }

        List<Request> requests;
        if (governorate != null && !"all".equals(governorate) && bloodType != null && !"all".equals(bloodType)) {
            requests = requestRepository.findByGovernorateAndBloodType(governorate, bloodType);
        } else if (governorate != null && !"all".equals(governorate)) {
            requests = requestRepository.findByGovernorate(governorate);
        } else if (bloodType != null && !"all".equals(bloodType)) {
            requests = requestRepository.findByBloodType(bloodType);
        } else {
            requests = requestRepository.findAll();
        }
        final User finalCurrentUser = currentUser;
        return requests.stream().map(r -> RequestResponseDTO.from(r, finalCurrentUser)).collect(Collectors.toList());
    }

    @GetMapping("/hospitals")
    public List<Hospital> getAllHospitals(@RequestParam(required = false) String governorate) {
        if (governorate != null && !"all".equals(governorate)) {
            return hospitalRepository.findByGovernorate(governorate);
        }
        return hospitalRepository.findAll();
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        donorRepository.findByUserId(id).ifPresent(d -> donorRepository.delete(d));
        userRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/requests/{id}")
    @Transactional
    public ResponseEntity<?> deleteRequest(@PathVariable Long id) {
        requestRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/hospitals/{id}")
    @Transactional
    public ResponseEntity<?> deleteHospital(@PathVariable Long id) {
        hospitalRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/hospitals")
    @Transactional
    public ResponseEntity<Hospital> addHospital(@RequestBody Hospital hospital) {
        return ResponseEntity.ok(hospitalRepository.save(hospital));
    }

    @PatchMapping("/requests/{id}/status")
    @Transactional
    public ResponseEntity<Request> updateRequestStatus(
            @PathVariable Long id, 
            @RequestParam String status) {
        return requestRepository.findById(id).map(request -> {
            request.setStatus(RequestStatus.valueOf(status.toUpperCase()));
            return ResponseEntity.ok(requestRepository.save(request));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/hospitals/pending")
    public List<User> getPendingHospitals() {
        return userRepository.findByRole(Role.HOSPITAL).stream()
                .filter(u -> !Boolean.TRUE.equals(u.getIsApproved()))
                .collect(Collectors.toList());
    }

    @PatchMapping("/users/{id}/approve")
    @Transactional
    public ResponseEntity<?> approveUser(@PathVariable Long id, @RequestParam boolean approve) {
        return userRepository.findById(id).map(user -> {
            user.setIsApproved(approve);
            userRepository.save(user);
            return ResponseEntity.ok(new MessageResponse("User " + (approve ? "approved" : "disapproved") + " successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }
}
