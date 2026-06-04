package com.example.blooddonation.controller;

import com.example.blooddonation.dto.DonationHistoryDTO;
import com.example.blooddonation.dto.HospitalQrScanRequest;
import com.example.blooddonation.dto.MessageResponse;
import com.example.blooddonation.dto.RequestResponseDTO;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.enums.RequestStatus;
import com.example.blooddonation.enums.Role;
import com.example.blooddonation.exception.ResourceNotFoundException;
import com.example.blooddonation.repository.UserRepository;
import com.example.blooddonation.security.UserDetailsImpl;
import com.example.blooddonation.service.DonationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hospital")
@PreAuthorize("hasRole('HOSPITAL') or hasRole('ADMIN')")
public class HospitalVerifyController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DonationService donationService;

    @GetMapping("/requests")
    public List<RequestResponseDTO> getHospitalRequests(Authentication auth) {
        User actingUser = requireUser(auth);

        return donationService.getVisibleRequestsForUser(actingUser).stream()
                .filter(r -> r.getStatus() == RequestStatus.PENDING
                        || r.getStatus() == RequestStatus.ACCEPTED
                        || r.getStatus() == RequestStatus.IN_PROGRESS)
                .map(r -> RequestResponseDTO.from(r, actingUser))
                .toList();
    }

    @GetMapping("/pending")
    public List<RequestResponseDTO> getPendingVerifications(Authentication auth) {
        User actingUser = requireUser(auth);
        return donationService.getVisibleRequestsForUser(actingUser).stream()
                .filter(r -> r.getStatus() == RequestStatus.IN_PROGRESS || r.getStatus() == RequestStatus.ACCEPTED)
                .map(r -> RequestResponseDTO.from(r, actingUser))
                .toList();
    }

    @PostMapping("/scan-qr")
    public ResponseEntity<?> scanQrAndComplete(@Valid @RequestBody HospitalQrScanRequest scanRequest,
                                               Authentication auth) {
        User actingUser = requireUser(auth);
        try {
            DonationHistoryDTO history = donationService.completeDonationWithQr(scanRequest.getSecureSignedToken(), actingUser);
            return ResponseEntity.ok(history);
        } catch (SecurityException ex) {
            return ResponseEntity.status(403).body(new MessageResponse(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.badRequest().body(new MessageResponse(ex.getMessage()));
        }
    }

    @GetMapping("/history")
    public List<DonationHistoryDTO> getHospitalHistory(Authentication auth) {
        User actingUser = requireUser(auth);
        if (actingUser.getRole() == Role.ADMIN) {
            return donationService.getAllHistory();
        }

        if (actingUser.getHospital() == null) {
            return List.of();
        }
        return donationService.getHospitalHistory(actingUser.getHospital().getId());
    }

    private User requireUser(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl principal)) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
