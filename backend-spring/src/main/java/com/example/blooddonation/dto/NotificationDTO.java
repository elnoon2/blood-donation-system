package com.example.blooddonation.dto;

import com.example.blooddonation.entity.Notification;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationDTO {
    private Long id;
    private String message;
    private String type;
    private LocalDateTime time;
    private Boolean isRead;

    public static NotificationDTO from(Notification notification) {
        return NotificationDTO.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .type(notification.getType() != null ? notification.getType().name() : null)
                .time(notification.getSentAt())
                .isRead(Boolean.TRUE.equals(notification.getIsRead()))
                .build();
    }
}
