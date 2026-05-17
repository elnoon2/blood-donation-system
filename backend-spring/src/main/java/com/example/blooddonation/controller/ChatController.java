package com.example.blooddonation.controller;

import com.example.blooddonation.dto.ChatMessage;
import com.example.blooddonation.entity.Message;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.repository.MessageRepository;
import com.example.blooddonation.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @MessageMapping("/chat.send")
    public void sendMessage(@org.springframework.messaging.handler.annotation.Payload ChatMessage chatMessage) {
        User sender = userRepository.findById(chatMessage.getSenderId()).orElse(null);
        User receiver = userRepository.findById(chatMessage.getReceiverId()).orElse(null);

        if (sender != null && receiver != null) {
            Message message = Message.builder()
                    .sender(sender)
                    .receiver(receiver)
                    .content(chatMessage.getContent())
                    .timestamp(LocalDateTime.now())
                    .isRead(false)
                    .build();

            messageRepository.save(message);

            chatMessage.setId(message.getId());
            chatMessage.setTimestamp(message.getTimestamp());
            chatMessage.setSenderName(sender.getName());

            // Send to receiver's private queue
            messagingTemplate.convertAndSendToUser(
                    receiver.getEmail().toLowerCase(), "/queue/messages", chatMessage);
            
            // Mirror back to sender's private queue
            messagingTemplate.convertAndSendToUser(
                    sender.getEmail().toLowerCase(), "/queue/messages", chatMessage);
        }
    }

    @GetMapping("/history/{userId}/{otherUserId}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<List<ChatMessage>> getChatHistory(@PathVariable Long userId, @PathVariable Long otherUserId) {
        User user1 = userRepository.findById(userId).orElse(null);
        User user2 = userRepository.findById(otherUserId).orElse(null);

        if (user1 == null || user2 == null) {
            return ResponseEntity.badRequest().build();
        }

        List<Message> history = messageRepository.findChatHistory(user1, user2);
        List<ChatMessage> dtos = history.stream().map(m -> ChatMessage.builder()
                .id(m.getId())
                .senderId(m.getSender().getId())
                .receiverId(m.getReceiver().getId())
                .senderName(m.getSender().getName())
                .content(m.getContent())
                .timestamp(m.getTimestamp())
                .build()).collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }
}
