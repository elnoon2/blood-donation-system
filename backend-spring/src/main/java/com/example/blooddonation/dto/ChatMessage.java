package com.example.blooddonation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {
    private Long id;
    private Long senderId;
    private Long receiverId;
    private String senderName;
    private String content;
    private LocalDateTime timestamp;
}
