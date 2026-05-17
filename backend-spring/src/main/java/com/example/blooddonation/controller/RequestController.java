package com.example.blooddonation.controller;

import com.example.blooddonation.dto.BloodRequestDTO;
import com.example.blooddonation.dto.MessageResponse;
import com.example.blooddonation.dto.RequestStatusUpdateDTO;
import com.example.blooddonation.dto.RequestResponseDTO;
import com.example.blooddonation.entity.Donor;
import com.example.blooddonation.entity.Notification;
import com.example.blooddonation.entity.Request;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.enums.NotificationType;
import com.example.blooddonation.enums.Role;
import com.example.blooddonation.enums.RequestStatus;
import com.example.blooddonation.exception.ResourceNotFoundException;
import com.example.blooddonation.repository.DonorRepository;
import com.example.blooddonation.repository.HospitalRepository;
import com.example.blooddonation.repository.NotificationRepository;
import com.example.blooddonation.repository.RequestRepository;
import com.example.blooddonation.repository.UserRepository;
import com.example.blooddonation.security.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/requests")
public class RequestController {

    @Autowired
    RequestRepository requestRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    DonorRepository donorRepository;

    @Autowired
    HospitalRepository hospitalRepository;

    @Autowired
    NotificationRepository notificationRepository;

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @PostMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> createRequest(@Valid @RequestBody BloodRequestDTO dto, Authentication auth) {
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        User user = userRepository.findById(userDetails.getId()).get();

        Request request = Request.builder()
                .user(user)
                .bloodType(dto.getBloodType())
                .quantityNeeded(dto.getQuantityNeeded())
                .governorate(dto.getGovernorate())
                .phone(dto.getPhone())
                .requesterLatitude(dto.getRequesterLatitude())
                .requesterLongitude(dto.getRequesterLongitude())
                .requesterMapLink(dto.getRequesterMapLink())
                .status(RequestStatus.PENDING)
                .requestDate(LocalDate.now())
                .hospital(dto.getHospitalId() != null ? hospitalRepository.findById(dto.getHospitalId())
                    .orElse(null) : null)
                .build();

        requestRepository.save(request);

        // Find matching donors and send notifications
        List<String> compatibleTypes = com.example.blooddonation.util.BloodCompatibilityUtil.getCompatibleDonorTypes(dto.getBloodType());
        List<Donor> matchingDonors = donorRepository.findByUserBloodTypeInAndUserGovernorateIgnoreCase(compatibleTypes, dto.getGovernorate());

        int notifiedCount = 0;
        boolean whatsappSent = false;
        for (Donor donor : matchingDonors) {
            // Only notify if donor is available
            if (!"AVAILABLE".equals(donor.getAvailabilityStatus())) continue;

            // Check if donor is eligible by 3-month rule
            boolean isEligible = true;
            if (donor.getLastDonationDate() != null) {
                LocalDate threeMonthsAgo = LocalDate.now().minusMonths(3);
                if (donor.getLastDonationDate().isAfter(threeMonthsAgo)) {
                    isEligible = false;
                }
            }

            if (isEligible) {
                Notification notification = Notification.builder()
                        .user(donor.getUser())
                        .message("Urgent: A patient in " + dto.getGovernorate() + " needs " + dto.getBloodType() + " blood.")
                        .type(NotificationType.URGENT)
                        .sentAt(java.time.LocalDateTime.now())
                        .build();
                notificationRepository.save(notification);
                
                try {
                    messagingTemplate.convertAndSend("/topic/notifications/" + donor.getUser().getId(), notification);
                } catch (Exception e) {
                    System.out.println("WebSocket message failed: " + e.getMessage());
                }
                
                // Trigger WhatsApp Notification - LIMIT TO ONLY ONE MESSAGE MAX
                if (!whatsappSent) {
                    sendWhatsAppNotification(donor.getUser().getPhone(), dto.getBloodType(), dto.getGovernorate());
                    whatsappSent = true;
                }

                notifiedCount++;
            }
        }

        return ResponseEntity.ok(new MessageResponse("Request created successfully. " + notifiedCount + " matching donors notified."));
    }

    private void sendWhatsAppNotification(String phone, String bloodType, String location) {
        if (phone == null || phone.isBlank()) {
            System.out.println("[WhatsApp] Skipping: Phone number is null or empty");
            return;
        }
        
        try {
            String message = "*Emergency Blood Request*\n" +
                             "Blood Type: *" + bloodType + "*\n" +
                             "Location: *" + location + "*\n\n" +
                             "A patient urgently needs blood donation. Please log in to the Smart Blood Donation System to help.";
                             
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            java.util.Map<String, String> body = new java.util.HashMap<>();
            body.put("phone", phone);
            body.put("message", message);
            
            System.out.println("[WhatsApp] Attempting to send message to: " + phone);
            
            // Run asynchronously so it doesn't block the main thread
            new Thread(() -> {
                try {
                    org.springframework.http.ResponseEntity<String> response = restTemplate.postForEntity("http://localhost:3001/api/whatsapp/send", body, String.class);
                    System.out.println("[WhatsApp] Success! Response: " + response.getBody());
                } catch (Exception e) {
                    System.err.println("[WhatsApp Error] Failed for " + phone + ": " + e.getMessage());
                    if (e.getCause() != null) System.err.println("Cause: " + e.getCause().getMessage());
                }
            }).start();
            
        } catch (Exception e) {
            System.err.println("Error constructing WhatsApp notification: " + e.getMessage());
        }
    }

    @GetMapping
    public List<RequestResponseDTO> getAllRequests(Authentication auth) {
        User currentUser = null;
        boolean isAdmin = false;
        boolean isHospital = false;
        Long currentUserId = null;

        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl) {
            UserDetailsImpl principal = (UserDetailsImpl) auth.getPrincipal();
            currentUserId = principal.getId();
            currentUser = userRepository.findById(currentUserId).orElse(null);
            isAdmin = currentUser != null && currentUser.getRole() == Role.ADMIN;
            isHospital = currentUser != null && currentUser.getRole() == Role.HOSPITAL;
        }

        final Long finalUserId = currentUserId;
        final boolean finalIsAdmin = isAdmin;
        final boolean finalIsHospital = isHospital;
        final User finalUser = currentUser;

        return requestRepository.findAll().stream()
                .filter(r -> {
                    if (r == null || r.getStatus() == null) return false;
                    if (finalIsAdmin || finalIsHospital) return true;
                    // Owners can see their own requests
                    if (finalUserId != null && r.getUser() != null && r.getUser().getId().equals(finalUserId)) return true;
                    
                    // Donors/Public can see Pending, Confirmed or Matched requests
                    RequestStatus s = r.getStatus();
                    return s == RequestStatus.PENDING ||
                           s == RequestStatus.HOSPITAL_CONFIRMED || 
                           s == RequestStatus.MATCHED_DONOR;
                })
                .map(r -> RequestResponseDTO.from(r, finalUser))
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public RequestResponseDTO getRequest(@PathVariable Long id, Authentication auth) {
        UserDetailsImpl principal = (UserDetailsImpl) auth.getPrincipal();
        User currentUser = userRepository.findById(principal.getId()).orElse(null);
        return RequestResponseDTO.from(
            requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found")),
            currentUser
        );
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        Request request = requestRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Request not found"));
            
        request.setStatus(RequestStatus.valueOf(status.toUpperCase()));
        requestRepository.save(request);
        return ResponseEntity.ok(new MessageResponse("Status updated"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','DONOR','PATIENT')")
    public ResponseEntity<?> updateRequestProgress(
            @PathVariable Long id,
            @RequestBody RequestStatusUpdateDTO dto,
            Authentication auth
    ) {
        Request request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        UserDetailsImpl principal = (UserDetailsImpl) auth.getPrincipal();
        User actingUser = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean isAdmin = actingUser.getRole() == Role.ADMIN;
        boolean isOwnerPatient = request.getUser() != null && request.getUser().getId().equals(actingUser.getId());

        if (!isAdmin && !isOwnerPatient && actingUser.getRole() != Role.DONOR) {
            return ResponseEntity.status(403).body(new MessageResponse("Not allowed to update this request"));
        }

        if (dto.getDonorConfirmed() != null) {
            request.setDonorConfirmed(dto.getDonorConfirmed());
        }
        if (dto.getPatientConfirmed() != null) {
            request.setPatientConfirmed(dto.getPatientConfirmed());
        }

        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            RequestStatus nextStatus;
            try {
                System.out.println("Updating status to: [" + dto.getStatus().toUpperCase() + "]");
                nextStatus = RequestStatus.valueOf(dto.getStatus().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(new MessageResponse("Invalid status constant: " + dto.getStatus()));
            }
            
            // Allow patient to cancel their request
            if (nextStatus == RequestStatus.CANCELLED && isOwnerPatient) {
                request.setStatus(nextStatus);
            } else if (!isAdmin) {
                // Donors can move to MATCHED_DONOR to start the QR flow
                boolean canMatch = actingUser.getRole() == Role.DONOR && 
                                  nextStatus == RequestStatus.MATCHED_DONOR && 
                                  (request.getStatus() == RequestStatus.HOSPITAL_CONFIRMED || request.getStatus() == RequestStatus.PENDING);
                
                if (canMatch) {
                    request.setStatus(nextStatus);
                    request.setDonorConfirmed(true);
                    request.setMatchedDonor(actingUser);
                    
                    if (request.getVerificationCode() == null || request.getVerificationCode().isBlank()) {
                        String code = String.format("%06d", new java.util.Random().nextInt(999999));
                        request.setVerificationCode(code);
                    }
                } else {
                    return ResponseEntity.status(403).body(new MessageResponse("Transition not allowed for your role. Status: " + request.getStatus()));
                }
            } else {
                request.setStatus(nextStatus);
            }
        }

        requestRepository.save(request);
        return ResponseEntity.ok(RequestResponseDTO.from(request, actingUser));
    }
}
