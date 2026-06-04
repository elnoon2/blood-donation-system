package com.example.blooddonation.service;

import com.example.blooddonation.entity.Hospital;
import com.example.blooddonation.entity.QRVerificationToken;
import com.example.blooddonation.entity.Request;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.repository.QRVerificationTokenRepository;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class QRServiceTest {

    private QRService service;
    private QRVerificationTokenRepository repo;
    private final List<QRVerificationToken> saved = new ArrayList<>();

    private static final String LOCAL_DEV_SECRET =
        "qr-service-unit-test-secret-at-least-64-bytes-long-replace-in-production-environments";

    @BeforeEach
    void setUp() throws Exception {
        service = new QRService();
        repo = Mockito.mock(QRVerificationTokenRepository.class);
        inject(service, "tokenRepository", repo);
        inject(service, "jwtSecret", LOCAL_DEV_SECRET);

        when(repo.save(any())).thenAnswer(inv -> {
            QRVerificationToken t = inv.getArgument(0);
            // Simulate JPA assigning created_at on persist if not already set.
            if (t.getCreatedAt() == null) {
                Field f = QRVerificationToken.class.getDeclaredField("createdAt");
                f.setAccessible(true);
                f.set(t, LocalDateTime.now());
            }
            saved.add(t);
            return t;
        });
        when(repo.saveAll(any())).thenAnswer(inv -> {
            Iterable<QRVerificationToken> all = inv.getArgument(0);
            for (QRVerificationToken t : all) saved.add(t);
            return all;
        });
    }

    @Test
    void mintsFreshTokenWhenNoneExists() {
        when(repo.findFirstByRequestIdAndDonorIdAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(any(), any(), any()))
            .thenReturn(Optional.empty());
        when(repo.findByRequestIdAndDonorIdAndIsUsedFalse(any(), any()))
            .thenReturn(List.of());

        Request req = sampleRequest();
        User donor = sampleUser(20L, "Donor", "O+");

        var payload = service.generateOrReuseSignedQrPayload(req, donor);

        assertNotNull(payload);
        assertNotNull(payload.getSecureSignedToken());
        verify(repo, times(1)).save(any());
        // Parse the token and confirm claims
        Claims claims = service.parseTokenClaims(payload.getSecureSignedToken());
        assertEquals(req.getId().longValue(), ((Number) claims.get("requestId")).longValue());
        assertEquals(donor.getId().longValue(), ((Number) claims.get("donorId")).longValue());
        assertEquals(req.getHospital().getId().longValue(), ((Number) claims.get("hospitalId")).longValue());
        assertEquals("DONATION_QR", claims.getSubject());
    }

    @Test
    void reusesExistingUnexpiredToken() {
        QRVerificationToken existing = QRVerificationToken.builder()
            .request(sampleRequest())
            .donor(sampleUser(20L, "Donor", "O+"))
            .patient(sampleUser(30L, "Patient", "O+"))
            .token("existing-token-value")
            .expiresAt(LocalDateTime.now().plusHours(20))
            .isUsed(false)
            .build();
        // Simulate created_at being set
        try {
            Field f = QRVerificationToken.class.getDeclaredField("createdAt");
            f.setAccessible(true);
            f.set(existing, LocalDateTime.now().minusHours(1));
        } catch (Exception e) { fail(e); }

        when(repo.findFirstByRequestIdAndDonorIdAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(any(), any(), any()))
            .thenReturn(Optional.of(existing));

        var payload = service.generateOrReuseSignedQrPayload(sampleRequest(), sampleUser(20L, "Donor", "O+"));

        assertEquals("existing-token-value", payload.getSecureSignedToken());
        verify(repo, Mockito.never()).save(any());
    }

    @Test
    void rejectsGenerationWhenHospitalMissing() {
        Request req = sampleRequest();
        req.setHospital(null);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
            () -> service.generateOrReuseSignedQrPayload(req, sampleUser(20L, "Donor", "O+")));
        assertTrue(ex.getMessage().contains("hospital"));
    }

    @Test
    void staleActiveTokensAreMarkedUsedBeforeMintingNew() {
        QRVerificationToken stale = QRVerificationToken.builder()
            .request(sampleRequest())
            .donor(sampleUser(20L, "Donor", "O+"))
            .patient(sampleUser(30L, "Patient", "O+"))
            .token("stale-token")
            .expiresAt(LocalDateTime.now().minusHours(1)) // expired
            .isUsed(false)
            .build();
        when(repo.findFirstByRequestIdAndDonorIdAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(any(), any(), any()))
            .thenReturn(Optional.empty());
        when(repo.findByRequestIdAndDonorIdAndIsUsedFalse(any(), any()))
            .thenReturn(List.of(stale));

        service.generateOrReuseSignedQrPayload(sampleRequest(), sampleUser(20L, "Donor", "O+"));

        ArgumentCaptor<Iterable<QRVerificationToken>> captor = ArgumentCaptor.forClass(Iterable.class);
        verify(repo).saveAll(captor.capture());
        QRVerificationToken markedStale = captor.getValue().iterator().next();
        assertTrue(markedStale.getIsUsed(), "Stale active token should be marked used before mint");
    }

    private Request sampleRequest() {
        Hospital h = new Hospital();
        try {
            Field idF = Hospital.class.getDeclaredField("id");
            idF.setAccessible(true);
            idF.set(h, 100L);
        } catch (Exception e) { throw new RuntimeException(e); }
        h.setName("Test Hospital");
        h.setPhone("+201000000000");
        h.setLocation("Cairo");

        Request r = Request.builder()
            .bloodType("O+")
            .bagsNeeded(1)
            .user(sampleUser(30L, "Patient", "O+"))
            .hospital(h)
            .build();
        try {
            Field idF = Request.class.getDeclaredField("id");
            idF.setAccessible(true);
            idF.set(r, 42L);
        } catch (Exception e) { throw new RuntimeException(e); }
        return r;
    }

    private User sampleUser(long id, String name, String bloodType) {
        User u = User.builder()
            .name(name)
            .email(name.toLowerCase() + "@test.local")
            .password("hash")
            .bloodType(bloodType)
            .role(com.example.blooddonation.enums.Role.DONOR)
            .build();
        try {
            Field idF = User.class.getDeclaredField("id");
            idF.setAccessible(true);
            idF.set(u, id);
        } catch (Exception e) { throw new RuntimeException(e); }
        return u;
    }

    private static void inject(Object target, String fieldName, Object value) throws Exception {
        Field f = target.getClass().getDeclaredField(fieldName);
        f.setAccessible(true);
        f.set(target, value);
    }
}
