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
import jakarta.persistence.EntityManager;
import java.util.Optional;

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

    @Autowired
    private EntityManager entityManager;

    @GetMapping("/dashboard")
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalDonors", userRepository.findByRole(Role.DONOR).size());
        stats.put("totalPatients", userRepository.findByRole(Role.PATIENT).size());
        stats.put("totalRequests", requestRepository.count());
        stats.put("totalHospitals", hospitalRepository.count());
        stats.put("totalDonations", donationRepository.count());

        // Real Blood Type Distribution
        List<Map<String, Object>> bloodTypeData = new java.util.ArrayList<>();
        String[] types = {"O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"};
        String[] colors = {"hsl(0, 84%, 41%)", "hsl(0, 100%, 24%)", "hsl(33, 100%, 91%)", "hsl(200, 100%, 14%)", "hsl(203, 39%, 57%)", "hsl(0, 84%, 41%)", "hsl(0, 100%, 24%)", "hsl(33, 100%, 91%)"};
        
        for (int i = 0; i < types.length; i++) {
            long count = userRepository.countByBloodType(types[i]);
            Map<String, Object> item = new HashMap<>();
            item.put("name", types[i]);
            item.put("value", count);
            item.put("color", colors[i]);
            bloodTypeData.add(item);
        }
        stats.put("bloodTypeData", bloodTypeData);
        
        return stats;
    }

    @GetMapping("/donors")
    @Transactional(readOnly = true)
    public List<Donor> getAllDonors(
            @RequestParam(required = false) String governorate,
            @RequestParam(required = false) String bloodType) {
        
        List<Donor> donors;
        if (governorate != null && !"all".equals(governorate) && bloodType != null && !"all".equals(bloodType)) {
            donors = donorRepository.findByUserBloodTypeAndUserGovernorateIgnoreCase(bloodType, governorate);
        } else if (governorate != null && !"all".equals(governorate)) {
            donors = donorRepository.findByUserGovernorateIgnoreCase(governorate);
        } else if (bloodType != null && !"all".equals(bloodType)) {
            donors = donorRepository.findByUserBloodType(bloodType);
        } else {
            donors = donorRepository.findAll();
        }
        
        // Touch the user object to force loading (fix LazyInitializationException)
        donors.forEach(d -> {
            if (d.getUser() != null) {
                d.getUser().getName();
            }
        });
        
        return donors;
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
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        // 1. Get donor ID if exists, and clear donor-dependent records
        Optional<Donor> donorOptional = donorRepository.findByUserId(id);
        if (donorOptional.isPresent()) {
            Long donorId = donorOptional.get().getId();
            entityManager.createNativeQuery("DELETE FROM donor_health_assessments WHERE donor_id = :donorId")
                    .setParameter("donorId", donorId).executeUpdate();
            entityManager.createNativeQuery("DELETE FROM home_collection_requests WHERE donor_id = :donorId")
                    .setParameter("donorId", donorId).executeUpdate();
            entityManager.createNativeQuery("DELETE FROM donors WHERE id = :donorId")
                    .setParameter("donorId", donorId).executeUpdate();
        }

        // 2. Clear all user-dependent records across the system
        entityManager.createNativeQuery("DELETE FROM donor_request WHERE donor_id = :userId")
                .setParameter("userId", id).executeUpdate();

        entityManager.createNativeQuery("DELETE FROM qr_verification_tokens WHERE donor_id = :userId OR patient_id = :userId")
                .setParameter("userId", id).executeUpdate();
        
        entityManager.createNativeQuery("DELETE FROM donation_verifications WHERE donor_id = :userId OR patient_id = :userId OR verified_by_doctor_id = :userId")
                .setParameter("userId", id).executeUpdate();
                
        entityManager.createNativeQuery("DELETE FROM donations WHERE user_id = :userId")
                .setParameter("userId", id).executeUpdate();

        entityManager.createNativeQuery("DELETE FROM messages WHERE sender_id = :userId OR receiver_id = :userId")
                .setParameter("userId", id).executeUpdate();

        entityManager.createNativeQuery("DELETE FROM notifications WHERE user_id = :userId")
                .setParameter("userId", id).executeUpdate();

        entityManager.createNativeQuery("DELETE FROM admin_actions WHERE admin_id = :userId")
                .setParameter("userId", id).executeUpdate();

        entityManager.createNativeQuery("DELETE FROM request_audits WHERE changed_by_user_id = :userId")
                .setParameter("userId", id).executeUpdate();

        // 3. Delete request audits for requests created by this user
        entityManager.createNativeQuery("DELETE FROM request_audits WHERE request_id IN (SELECT id FROM requests WHERE user_id = :userId)")
                .setParameter("userId", id).executeUpdate();

        // 4. Update or delete requests
        entityManager.createNativeQuery("UPDATE requests SET matched_donor_id = NULL WHERE matched_donor_id = :userId")
                .setParameter("userId", id).executeUpdate();

        entityManager.createNativeQuery("DELETE FROM requests WHERE user_id = :userId")
                .setParameter("userId", id).executeUpdate();

        // 5. Finally delete the user
        entityManager.createNativeQuery("DELETE FROM users WHERE id = :userId")
                .setParameter("userId", id).executeUpdate();

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/requests/{id}")
    @Transactional
    public ResponseEntity<?> deleteRequest(@PathVariable Long id) {
        if (!requestRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        // 1. Delete dependent tokens and audits
        entityManager.createNativeQuery("DELETE FROM donor_request WHERE request_id = :requestId")
                .setParameter("requestId", id).executeUpdate();

        entityManager.createNativeQuery("DELETE FROM qr_verification_tokens WHERE request_id = :requestId")
                .setParameter("requestId", id).executeUpdate();
                
        entityManager.createNativeQuery("DELETE FROM donation_verifications WHERE request_id = :requestId")
                .setParameter("requestId", id).executeUpdate();

        entityManager.createNativeQuery("DELETE FROM request_audits WHERE request_id = :requestId")
                .setParameter("requestId", id).executeUpdate();

        // 2. Finally delete the request itself
        entityManager.createNativeQuery("DELETE FROM requests WHERE id = :requestId")
                .setParameter("requestId", id).executeUpdate();

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/hospitals/{id}")
    @Transactional
    public ResponseEntity<?> deleteHospital(@PathVariable Long id) {
        if (!hospitalRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        // 1. Unlink hospital from users
        entityManager.createNativeQuery("UPDATE users SET hospital_id = NULL WHERE hospital_id = :hospitalId")
                .setParameter("hospitalId", id).executeUpdate();
                
        // 2. Clear donations and requests tied to this hospital
        entityManager.createNativeQuery("DELETE FROM donations WHERE hospital_id = :hospitalId")
                .setParameter("hospitalId", id).executeUpdate();
                
        entityManager.createNativeQuery("DELETE FROM requests WHERE hospital_id = :hospitalId")
                .setParameter("hospitalId", id).executeUpdate();

        // 3. Delete the hospital itself
        entityManager.createNativeQuery("DELETE FROM hospitals WHERE id = :hospitalId")
                .setParameter("hospitalId", id).executeUpdate();
                
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
