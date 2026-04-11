package com.example.blooddonation.controller;

import com.example.blooddonation.entity.Notification;
import com.example.blooddonation.repository.NotificationRepository;
import com.example.blooddonation.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    NotificationRepository notificationRepository;

    @GetMapping("/me")
    public List<Notification> getMyNotifications(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl)) {
            return List.of();
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        return notificationRepository.findByUserIdOrderBySentAtDesc(userDetails.getId());
    }
}
