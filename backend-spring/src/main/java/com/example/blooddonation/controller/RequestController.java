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
                .build();

        requestRepository.save(request);

        // Broadcast to all active users
        messagingTemplate.convertAndSend("/topic/requests", "NEW_REQUEST");

        // Notify matching donors
        List<Donor> matchingDonors = donorRepository.findByUserBloodType(dto.getBloodType());
        for (Donor d : matchingDonors) {
            if ("AVAILABLE".equalsIgnoreCase(d.getAvailabilityStatus())) {
                Notification notification = Notification.builder()
                    .user(d.getUser())
                    .message("Urgent blood request for type " + dto.getBloodType())
                    .type(NotificationType.MATCH)
                    .build();
                notificationRepository.save(notification);
            }
        }

        return ResponseEntity.ok(new MessageResponse("Request created successfully"));
    }

    @GetMapping
    public List<RequestResponseDTO> getAllRequests() {
        return requestRepository.findAll().stream()
                .map(RequestResponseDTO::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public RequestResponseDTO getRequest(@PathVariable Long id) {
        return RequestResponseDTO.from(
            requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"))
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

        Set<String> roles = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
        boolean isAdmin = roles.contains("ROLE_ADMIN") || actingUser.getRole() == Role.ADMIN;
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
            RequestStatus nextStatus = RequestStatus.valueOf(dto.getStatus().toUpperCase());
            if (nextStatus == RequestStatus.COMPLETED &&
                    !(Boolean.TRUE.equals(request.getDonorConfirmed()) && Boolean.TRUE.equals(request.getPatientConfirmed()))) {
                return ResponseEntity.badRequest().body(new MessageResponse("Both donor and patient must confirm before completion"));
            }
            request.setStatus(nextStatus);
        }

        requestRepository.save(request);
        return ResponseEntity.ok(RequestResponseDTO.from(request));
    }
}
