package com.example.blooddonation.service;

import com.example.blooddonation.entity.QRVerificationToken;
import com.example.blooddonation.entity.Request;
import com.example.blooddonation.repository.QRVerificationTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class QRService {

    @Autowired
    private QRVerificationTokenRepository tokenRepository;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public String generateVerificationUrl(Request request) {
        String token = UUID.randomUUID().toString();
        
        QRVerificationToken verificationToken = QRVerificationToken.builder()
                .request(request)
                .donor(request.getMatchedDonor() != null ? request.getMatchedDonor() : request.getUser()) 
                .patient(request.getUser()) 
                .token(token)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .isUsed(false)
                .build();
        
        // In a real scenario, we'd know who the donor is. 
        // For now, I'll use the request's IDs to build the URL as requested.
        
        tokenRepository.save(verificationToken);

        return String.format("%s/verify-donation?request_id=%d&token=%s", 
                frontendUrl, request.getId(), token);
    }
    
    public String generateTokenForDonation(Long requestId, Long donorId, Long patientId) {
        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        
        // We need the entities to save. This logic should be in the controller/service 
        // that has access to the full request state.
        return token;
    }
}
