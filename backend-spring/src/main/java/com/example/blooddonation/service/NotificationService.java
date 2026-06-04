package com.example.blooddonation.service;

import com.example.blooddonation.dto.NotificationDTO;
import com.example.blooddonation.entity.Notification;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.enums.NotificationType;
import com.example.blooddonation.repository.NotificationRepository;
import com.example.blooddonation.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    public List<NotificationDTO> getMyNotifications(Long userId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return List.of();
        }

        List<Notification> allNotifications = notificationRepository.findByUserIdOrderBySentAtDesc(userId, PageRequest.of(0, 100));

        return allNotifications.stream()
                .filter(n -> isNotificationAllowedForRole(n.getType(), user.getRole()))
                .limit(safeLimit)
                .map(NotificationDTO::from)
                .toList();
    }

    private boolean isNotificationAllowedForRole(NotificationType type, com.example.blooddonation.enums.Role role) {
        if (role == com.example.blooddonation.enums.Role.ADMIN) {
            return true;
        }
        if (type == null) {
            return true;
        }
        return switch (role) {
            case DONOR -> type == NotificationType.SYSTEM || type == NotificationType.ALERT || type == NotificationType.URGENT;
            case PATIENT -> type == NotificationType.SYSTEM || type == NotificationType.ALERT || type == NotificationType.MATCH || type == NotificationType.REQUEST;
            case HOSPITAL, DOCTOR -> type == NotificationType.SYSTEM || type == NotificationType.ALERT;
            default -> false;
        };
    }

    @Transactional
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllReadByUserId(userId);
    }

    @Transactional
    public long clearAll(Long userId) {
        // Phase 12: soft-clear instead of hard-delete. Rows stay in the DB
        // for audit/history; the user's panel hides them via the
        // `cleared_at IS NULL` filter on findByUserIdOrderBySentAtDesc.
        return notificationRepository.softClearByUserId(userId, LocalDateTime.now());
    }

    @Transactional
    public Notification createNotificationIfNotDuplicate(User user, String message, NotificationType type) {
        LocalDateTime duplicateWindow = LocalDateTime.now().minusMinutes(5);
        boolean duplicateExists = notificationRepository.existsDuplicateNotification(
                user.getId(),
                message,
                type,
                duplicateWindow
        );

        if (duplicateExists) {
            return null;
        }

        Notification notification = Notification.builder()
                .user(user)
                .message(message)
                .type(type)
                .sentAt(LocalDateTime.now())
                .isRead(false)
                .build();

        return notificationRepository.save(notification);
    }
}
