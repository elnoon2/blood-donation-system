package com.example.blooddonation.controller;

import com.example.blooddonation.dto.*;
import com.example.blooddonation.entity.Request;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.enums.RequestStatus;
import com.example.blooddonation.enums.Role;
import com.example.blooddonation.exception.ResourceNotFoundException;
import com.example.blooddonation.repository.RequestRepository;
import com.example.blooddonation.repository.UserRepository;
import com.example.blooddonation.security.UserDetailsImpl;
import com.example.blooddonation.service.DonationService;
import com.example.blooddonation.service.RecommendationService;
import com.example.blooddonation.util.BloodCompatibilityUtil;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requests")
public class RequestController {

    @Autowired
    private RequestRepository requestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DonationService donationService;

    @Autowired
    private RecommendationService recommendationService;

    @PostMapping
    @PreAuthorize("hasAnyRole('PATIENT','ADMIN')")
    public ResponseEntity<?> createRequest(@Valid @RequestBody BloodRequestDTO dto, Authentication auth) {
        User user = requireUser(auth);
        if (user.getRole() != Role.PATIENT && user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).body(new MessageResponse("Only PATIENT users can create requests."));
        }

        try {
            Request request = donationService.createRequest(user, dto);
            return ResponseEntity.ok(RequestResponseDTO.from(request, user));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new MessageResponse(ex.getMessage()));
        }
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<RequestResponseDTO> getRequests(Authentication auth) {
        User currentUser = requireUser(auth);
        return donationService.getVisibleRequestsForUser(currentUser).stream()
                .map(r -> RequestResponseDTO.from(r, currentUser))
                .toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getRequest(@PathVariable Long id, Authentication auth) {
        User currentUser = requireUser(auth);
        Request request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (!canAccessRequest(currentUser, request)) {
            return ResponseEntity.status(403).body(new MessageResponse("Not allowed to view this request."));
        }

        return ResponseEntity.ok(RequestResponseDTO.from(request, currentUser));
    }

    @PostMapping("/{id}/accept")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<?> acceptRequest(@PathVariable Long id, Authentication auth) {
        User donorUser = requireUser(auth);
        try {
            ActiveDonationRequestDTO activeDonation = donationService.acceptRequest(id, donorUser);
            return ResponseEntity.ok(activeDonation);
        } catch (IllegalStateException | IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new MessageResponse(ex.getMessage()));
        } catch (SecurityException ex) {
            return ResponseEntity.status(403).body(new MessageResponse(ex.getMessage()));
        }
    }

    @GetMapping("/active-donation")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<?> getActiveDonation(Authentication auth) {
        User donorUser = requireUser(auth);
        ActiveDonationRequestDTO activeDonation = donationService.getActiveDonationForDonor(donorUser);
        if (activeDonation == null) {
            return ResponseEntity.ok().body(null);
        }
        return ResponseEntity.ok(activeDonation);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','PATIENT')")
    public ResponseEntity<?> updateRequestStatus(@PathVariable Long id,
                                                 @RequestBody RequestStatusUpdateDTO dto,
                                                 Authentication auth) {
        User actingUser = requireUser(auth);
        Request request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (dto.getStatus() == null || dto.getStatus().isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("status is required."));
        }

        RequestStatus nextStatus;
        try {
            nextStatus = RequestStatus.valueOf(dto.getStatus().toUpperCase());
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid status value."));
        }

        if (actingUser.getRole() == Role.ADMIN) {
            request.setStatus(nextStatus);
            requestRepository.save(request);
            return ResponseEntity.ok(RequestResponseDTO.from(request, actingUser));
        }

        boolean isOwner = request.getUser() != null && request.getUser().getId().equals(actingUser.getId());
        if (!isOwner || nextStatus != RequestStatus.CANCELLED) {
            return ResponseEntity.status(403).body(new MessageResponse("Patients can only cancel their own requests."));
        }

        request.setStatus(RequestStatus.CANCELLED);
        requestRepository.save(request);
        return ResponseEntity.ok(RequestResponseDTO.from(request, actingUser));
    }

    @GetMapping("/{id}/recommended-donors")
    @PreAuthorize("hasAnyRole('ADMIN','HOSPITAL')")
    public ResponseEntity<?> getRecommendedDonors(@PathVariable Long id) {
        return ResponseEntity.ok(recommendationService.getTopRecommendedDonors(id));
    }

    /**
     * Phase 12: Soft-delete a request owned by the caller.
     *
     *  Ownership: caller must be `request.user` (patient who created it) OR
     *             `request.matchedDonor` (donor who accepted it).
     *  Status guard:
     *    - PENDING                   → freely deletable.
     *    - ACCEPTED / IN_PROGRESS    → deletable, requires `?confirmed=true`
     *                                  (frontend dialog gives the strong warning).
     *    - COMPLETED / REJECTED / CANCELLED → not deletable (409).
     *    - Already soft-deleted      → 404 (acts as "not found" to the user).
     *
     *  Admin's hard-delete endpoint at `/api/admin/requests/{id}` is
     *  unaffected by this change.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> softDeleteRequest(@PathVariable Long id,
                                               @RequestParam(name = "confirmed", required = false, defaultValue = "false") boolean confirmed,
                                               Authentication auth) {
        User actingUser = requireUser(auth);
        Request request = requestRepository.findById(id).orElse(null);
        if (request == null || request.getDeletedAt() != null) {
            return ResponseEntity.status(404).body(new MessageResponse("Request not found."));
        }

        boolean isOwningPatient = request.getUser() != null
                && request.getUser().getId().equals(actingUser.getId());
        boolean isMatchedDonor = request.getMatchedDonor() != null
                && request.getMatchedDonor().getId().equals(actingUser.getId());
        if (!isOwningPatient && !isMatchedDonor && actingUser.getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).body(new MessageResponse(
                "You can only delete your own requests."));
        }

        RequestStatus status = request.getStatus();
        if (status == RequestStatus.COMPLETED
                || status == RequestStatus.REJECTED
                || status == RequestStatus.CANCELLED) {
            return ResponseEntity.status(409).body(new MessageResponse(
                "Requests in status " + status + " cannot be deleted."));
        }
        if ((status == RequestStatus.ACCEPTED || status == RequestStatus.IN_PROGRESS) && !confirmed) {
            return ResponseEntity.status(409).body(new MessageResponse(
                "This request has a matched donor. Re-call with ?confirmed=true to delete."));
        }

        request.setDeletedAt(java.time.LocalDateTime.now());
        requestRepository.save(request);
        return ResponseEntity.ok(new MessageResponse("Request deleted."));
    }

    private User requireUser(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl principal)) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private boolean canAccessRequest(User user, Request request) {
        if (user.getRole() == Role.ADMIN) {
            return true;
        }
        if (user.getRole() == Role.HOSPITAL) {
            return user.getHospital() != null
                    && request.getHospital() != null
                    && user.getHospital().getId().equals(request.getHospital().getId());
        }
        if (user.getRole() == Role.PATIENT) {
            return request.getUser() != null && request.getUser().getId().equals(user.getId());
        }
        if (user.getRole() == Role.DONOR) {
            if (request.getMatchedDonor() != null && request.getMatchedDonor().getId().equals(user.getId())) {
                return true;
            }
            return request.getStatus() == RequestStatus.PENDING
                    && BloodCompatibilityUtil.canDonate(user.getBloodType(), request.getBloodType());
        }
        return false;
    }
}
