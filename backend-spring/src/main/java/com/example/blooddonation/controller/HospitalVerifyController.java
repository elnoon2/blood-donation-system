package com.example.blooddonation.controller;

import com.example.blooddonation.dto.MessageResponse;
import com.example.blooddonation.dto.RequestResponseDTO;
import com.example.blooddonation.entity.Donor;
import com.example.blooddonation.entity.Notification;
import com.example.blooddonation.entity.Request;
import com.example.blooddonation.entity.RequestAudit;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.enums.NotificationType;
import com.example.blooddonation.enums.RequestStatus;
import com.example.blooddonation.exception.ResourceNotFoundException;
import com.example.blooddonation.repository.DonorRepository;
import com.example.blooddonation.repository.NotificationRepository;
import com.example.blooddonation.repository.RequestAuditRepository;
import com.example.blooddonation.repository.RequestRepository;
import com.example.blooddonation.repository.UserRepository;
import com.example.blooddonation.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/hospital")
@PreAuthorize("hasRole('HOSPITAL') or hasRole('ADMIN')")
public class HospitalVerifyController {

    @Autowired
    RequestRepository requestRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RequestAuditRepository requestAuditRepository;

    @Autowired
    DonorRepository donorRepository;

    @Autowired
    NotificationRepository notificationRepository;

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @GetMapping("/requests")
    public List<RequestResponseDTO> getHospitalRequests(Authentication auth) {
        UserDetailsImpl principal = (UserDetailsImpl) auth.getPrincipal();
        User hospitalUser = userRepository.findById(principal.getId()).get();
        Long hospitalId = (hospitalUser.getHospital() != null) ? hospitalUser.getHospital().getId() : null;

        return requestRepository.findAll().stream()
                .filter(r -> r.getHospital() != null && r.getHospital().getId().equals(hospitalId))
                .map(r -> RequestResponseDTO.from(r, hospitalUser))
                .collect(Collectors.toList());
    }

    @PutMapping("/requests/{id}/review")
    public ResponseEntity<?> reviewRequest(
            @PathVariable Long id,
            @RequestParam String decision,
            Authentication auth) {

        Request request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        UserDetailsImpl principal = (UserDetailsImpl) auth.getPrincipal();
        User hospitalUser = userRepository.findById(principal.getId()).get();

        if (request.getHospital() == null || hospitalUser.getHospital() == null ||
            !request.getHospital().getId().equals(hospitalUser.getHospital().getId())) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: This request is not assigned to your hospital"));
        }

        String oldStatus = request.getStatus().name();
        RequestStatus newStatus;

        if ("APPROVE".equalsIgnoreCase(decision)) {
            newStatus = RequestStatus.HOSPITAL_CONFIRMED;
        } else if ("REJECT".equalsIgnoreCase(decision)) {
            newStatus = RequestStatus.REJECTED;
        } else if ("UNDER_REVIEW".equalsIgnoreCase(decision)) {
            newStatus = RequestStatus.UNDER_REVIEW;
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid decision"));
        }

        request.setStatus(newStatus);
        requestRepository.save(request);

        // Save Audit log
        RequestAudit audit = RequestAudit.builder()
                .request(request)
                .oldStatus(oldStatus)
                .newStatus(newStatus.name())
                .changedBy(hospitalUser)
                .changedAt(LocalDateTime.now())
                .actionNote("Hospital " + decision)
                .build();
        requestAuditRepository.save(audit);

        // If Approved, then notify donors and websocket
        if (newStatus == RequestStatus.HOSPITAL_CONFIRMED && !oldStatus.equals("HOSPITAL_CONFIRMED")) {
            messagingTemplate.convertAndSend("/topic/requests", "NEW_REQUEST");

            List<Donor> matchingDonors = donorRepository.findByUserBloodType(request.getBloodType());
            for (Donor d : matchingDonors) {
                if ("AVAILABLE".equalsIgnoreCase(d.getAvailabilityStatus())) {
                    Notification notification = Notification.builder()
                        .user(d.getUser())
                        .message("Urgent blood request confirmed by hospital for type " + request.getBloodType())
                        .type(NotificationType.MATCH)
                        .build();
                    notificationRepository.save(notification);
                }
            }
        }

        return ResponseEntity.ok(new MessageResponse("Request status updated to " + newStatus));
    }

    @GetMapping("/pending")
    public List<RequestResponseDTO> getPendingVerifications(Authentication auth) {
        UserDetailsImpl principal = (UserDetailsImpl) auth.getPrincipal();
        User hospitalUser = userRepository.findById(principal.getId()).get();
        Long hospitalId = (hospitalUser.getHospital() != null) ? hospitalUser.getHospital().getId() : null;

        return requestRepository.findAll().stream()
                .filter(r -> r.getHospital() != null && r.getHospital().getId().equals(hospitalId))
                .filter(r -> r.getStatus() == RequestStatus.MATCHED_DONOR || r.getStatus() == RequestStatus.HOSPITAL_CONFIRMED)
                .map(r -> RequestResponseDTO.from(r, hospitalUser))
                .collect(Collectors.toList());
    }

    @PostMapping("/verify/{requestId}")
    public ResponseEntity<?> verifyDonation(
            @PathVariable Long requestId,
            @RequestParam String code,
            Authentication auth) {
        
        Request request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        UserDetailsImpl principal = (UserDetailsImpl) auth.getPrincipal();
        User hospitalUser = userRepository.findById(principal.getId()).get();

        if (request.getHospital() == null || hospitalUser.getHospital() == null ||
            !request.getHospital().getId().equals(hospitalUser.getHospital().getId())) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: This request is not assigned to your hospital"));
        }

        if (code == null || !code.equals(request.getVerificationCode())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Invalid verification code"));
        }

        String oldStatus = request.getStatus().name();
        request.setStatus(RequestStatus.DONATION_COMPLETED);
        request.setDonorConfirmed(true);
        request.setPatientConfirmed(true);
        requestRepository.save(request);

        RequestAudit audit = RequestAudit.builder()
                .request(request)
                .oldStatus(oldStatus)
                .newStatus(RequestStatus.DONATION_COMPLETED.name())
                .changedBy(hospitalUser)
                .changedAt(LocalDateTime.now())
                .actionNote("Code Verified")
                .build();
        requestAuditRepository.save(audit);

        return ResponseEntity.ok(new MessageResponse("Donation verified successfully! Status updated to DONATION_COMPLETED."));
    }
}
