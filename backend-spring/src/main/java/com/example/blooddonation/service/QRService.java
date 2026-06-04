package com.example.blooddonation.service;

import com.example.blooddonation.dto.QrPayloadDTO;
import com.example.blooddonation.entity.Hospital;
import com.example.blooddonation.entity.QRVerificationToken;
import com.example.blooddonation.entity.Request;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.enums.Role;
import com.example.blooddonation.exception.ResourceNotFoundException;
import com.example.blooddonation.repository.QRVerificationTokenRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Key;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
public class QRService {

    private static final int QR_TOKEN_VALIDITY_HOURS = 24;

    @Autowired
    private QRVerificationTokenRepository tokenRepository;

    @Value("${custom.jwt.secret}")
    private String jwtSecret;

    private Key key() {
        // Try base64 first; JJWT 0.11.x throws DecodingException (a RuntimeException
        // that is NOT IllegalArgumentException) when the input contains characters
        // outside the base64 alphabet. Catch the broader RuntimeException so
        // free-form ASCII secrets (with hyphens, underscores, etc.) still work.
        try {
            return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
        } catch (RuntimeException ex) {
            return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        }
    }

    @Transactional
    public QrPayloadDTO generateOrReuseSignedQrPayload(Request request, User donor) {
        if (request.getHospital() == null) {
            throw new IllegalStateException("Request must be assigned to a hospital before QR generation.");
        }

        LocalDateTime now = LocalDateTime.now();
        Optional<QRVerificationToken> activeToken = tokenRepository
                .findFirstByRequestIdAndDonorIdAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        request.getId(),
                        donor.getId(),
                        now
                );

        QRVerificationToken tokenEntity;
        if (activeToken.isPresent()) {
            tokenEntity = activeToken.get();
        } else {
            List<QRVerificationToken> staleActive = tokenRepository.findByRequestIdAndDonorIdAndIsUsedFalse(
                    request.getId(),
                    donor.getId()
            );
            staleActive.forEach(t -> {
                t.setIsUsed(true);
                t.setUsedAt(now);
            });
            tokenRepository.saveAll(staleActive);

            String secureSignedToken = generateSignedToken(request, donor, request.getUser(), request.getHospital(), now);

            tokenEntity = QRVerificationToken.builder()
                    .request(request)
                    .donor(donor)
                    .patient(request.getUser())
                    .token(secureSignedToken)
                    .expiresAt(now.plusHours(QR_TOKEN_VALIDITY_HOURS))
                    .isUsed(false)
                    .build();
            tokenRepository.save(tokenEntity);
        }

        return toPayload(request, donor, tokenEntity);
    }

    public QrPayloadDTO buildPayloadFromToken(QRVerificationToken tokenEntity, User donor) {
        return toPayload(tokenEntity.getRequest(), donor, tokenEntity);
    }

    public Claims parseTokenClaims(String secureSignedToken) {
        return Jwts.parserBuilder()
                .setSigningKey(key())
                .build()
                .parseClaimsJws(secureSignedToken)
                .getBody();
    }

    @Transactional
    public QRVerificationToken validateAndConsumeToken(String secureSignedToken, User actingUser) {
        if (actingUser.getRole() != Role.HOSPITAL && actingUser.getRole() != Role.ADMIN) {
            throw new SecurityException("Only HOSPITAL or ADMIN can verify QR tokens.");
        }

        Claims claims = parseTokenClaims(secureSignedToken);
        Long requestId = claims.get("requestId", Number.class).longValue();
        Long donorId = claims.get("donorId", Number.class).longValue();
        Long patientId = claims.get("patientId", Number.class).longValue();
        Long hospitalId = claims.get("hospitalId", Number.class).longValue();

        // Pessimistic lock: serialises concurrent QR-submit calls on the same
        // token (security V11-2). Without this, two parallel calls could both
        // pass the isUsed=false check, both reach completeDonationWithQr, and
        // both insert separate Donation + DonationHistory rows.
        QRVerificationToken token = tokenRepository.findByTokenForUpdate(secureSignedToken)
                .orElseThrow(() -> new ResourceNotFoundException("QR token not found"));

        if (Boolean.TRUE.equals(token.getIsUsed())) {
            throw new IllegalStateException("QR token already used.");
        }
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("QR token expired.");
        }

        if (!token.getRequest().getId().equals(requestId)
                || !token.getDonor().getId().equals(donorId)
                || !token.getPatient().getId().equals(patientId)) {
            throw new SecurityException("QR token payload does not match persisted verification token.");
        }

        if (token.getRequest().getHospital() == null || !token.getRequest().getHospital().getId().equals(hospitalId)) {
            throw new SecurityException("QR token hospital mismatch.");
        }

        if (actingUser.getRole() == Role.HOSPITAL) {
            if (actingUser.getHospital() == null || !actingUser.getHospital().getId().equals(hospitalId)) {
                throw new SecurityException("Hospital user cannot verify tokens for another hospital.");
            }
        }

        token.setIsUsed(true);
        token.setUsedAt(LocalDateTime.now());
        return tokenRepository.save(token);
    }

    private String generateSignedToken(Request request, User donor, User patient, Hospital hospital, LocalDateTime issuedAt) {
        Date issued = Date.from(issuedAt.toInstant(ZoneOffset.UTC));
        Date expiry = Date.from(issuedAt.plusHours(QR_TOKEN_VALIDITY_HOURS).toInstant(ZoneOffset.UTC));

        return Jwts.builder()
                .setSubject("DONATION_QR")
                .claim("requestId", request.getId())
                .claim("donorId", donor.getId())
                .claim("patientId", patient.getId())
                .claim("hospitalId", hospital.getId())
                .claim("timestamp", issuedAt.toString())
                .setIssuedAt(issued)
                .setExpiration(expiry)
                .signWith(key(), SignatureAlgorithm.HS512)
                .compact();
    }

    private QrPayloadDTO toPayload(Request request, User donor, QRVerificationToken tokenEntity) {
        Hospital hospital = request.getHospital();
        return QrPayloadDTO.builder()
                .hospitalName(hospital.getName())
                .hospitalPhone(hospital.getPhone())
                .hospitalLocation(hospital.getLocation())
                .requestId(request.getId())
                .donorId(donor.getId())
                .timestamp(tokenEntity.getCreatedAt().toString())
                .secureSignedToken(tokenEntity.getToken())
                .patientId(request.getUser() != null ? request.getUser().getId() : null)
                .build();
    }
}
