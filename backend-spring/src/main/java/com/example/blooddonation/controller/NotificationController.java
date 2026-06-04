package com.example.blooddonation.controller;

import com.example.blooddonation.dto.MessageResponse;
import com.example.blooddonation.dto.NotificationDTO;
import com.example.blooddonation.exception.ResourceNotFoundException;
import com.example.blooddonation.repository.UserRepository;
import com.example.blooddonation.security.UserDetailsImpl;
import com.example.blooddonation.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<NotificationDTO>> getMyNotifications(Authentication auth,
                                                                    @RequestParam(defaultValue = "5") int limit) {
        Long userId = resolveUserId(auth);
        return ResponseEntity.ok(notificationService.getMyNotifications(userId, limit));
    }

    @GetMapping("/me")
    public ResponseEntity<List<NotificationDTO>> getMyNotificationsLegacy(Authentication auth) {
        Long userId = resolveUserId(auth);
        return ResponseEntity.ok(notificationService.getMyNotifications(userId, 5));
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> readAll(Authentication auth) {
        Long userId = resolveUserId(auth);
        int updated = notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(new MessageResponse("Marked " + updated + " notifications as read."));
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<?> clearAll(Authentication auth) {
        Long userId = resolveUserId(auth);
        long deleted = notificationService.clearAll(userId);
        return ResponseEntity.ok(new MessageResponse("Cleared " + deleted + " notifications."));
    }

    private Long resolveUserId(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl principal)) {
            throw new ResourceNotFoundException("User authentication not found");
        }

        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"))
                .getId();
    }
}
