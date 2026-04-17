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

        return ResponseEntity.ok(new MessageResponse("Request created successfully. Awaiting hospital confirmation."));
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
