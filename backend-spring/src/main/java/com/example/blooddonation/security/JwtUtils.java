package com.example.blooddonation.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {

    private static final Logger log = LoggerFactory.getLogger(JwtUtils.class);
    private static final int MIN_SECRET_BYTES_HS512 = 64;
    private static final String PLACEHOLDER_MARKER = "CHANGE_ME";

    @Value("${custom.jwt.secret}")
    private String jwtSecret;

    @Value("${custom.jwt.expirationMs}")
    private int jwtExpirationMs;

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    @PostConstruct
    void validateSecretOrFailFast() {
        byte[] decoded = decodeSecret(jwtSecret);
        if (decoded.length < MIN_SECRET_BYTES_HS512) {
            throw new IllegalStateException(
                "JWT secret must decode to at least " + MIN_SECRET_BYTES_HS512 +
                " bytes for HS512. Got " + decoded.length + " bytes. Set the JWT_SECRET env var.");
        }
        if (jwtSecret.contains(PLACEHOLDER_MARKER) && !isLocalDevProfile()) {
            throw new IllegalStateException(
                "JWT secret looks like the development placeholder. " +
                "Set the JWT_SECRET env var before booting outside local dev.");
        }
    }

    private boolean isLocalDevProfile() {
        return activeProfile == null
            || activeProfile.isBlank()
            || "default".equalsIgnoreCase(activeProfile)
            || "dev".equalsIgnoreCase(activeProfile)
            || "local".equalsIgnoreCase(activeProfile);
    }

    public String generateJwtToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();
        return generateTokenFromUsername(userPrincipal.getUsername());
    }

    public String generateTokenFromUsername(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key(), SignatureAlgorithm.HS512)
                .compact();
    }

    private Key key() {
        return Keys.hmacShaKeyFor(decodeSecret(jwtSecret));
    }

    private byte[] decodeSecret(String secret) {
        // JJWT 0.11.x throws DecodingException (RuntimeException, NOT
        // IllegalArgumentException) for input with non-base64 characters.
        // Catch broadly so free-form ASCII secrets (hyphens / underscores / etc.)
        // fall through to UTF-8 bytes.
        try {
            return Decoders.BASE64.decode(secret);
        } catch (RuntimeException ex) {
            return secret.getBytes(StandardCharsets.UTF_8);
        }
    }

    public String getUserNameFromJwtToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key()).build()
                   .parseClaimsJws(token).getBody().getSubject();
    }

    /**
     * Returns a typed validation result so the filter can return a precise 401
     * reason instead of swallowing the failure.
     */
    public JwtValidationResult validateJwtToken(String authToken) {
        try {
            Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(authToken);
            return JwtValidationResult.VALID;
        } catch (ExpiredJwtException e) {
            return JwtValidationResult.EXPIRED;
        } catch (UnsupportedJwtException | MalformedJwtException e) {
            return JwtValidationResult.MALFORMED;
        } catch (io.jsonwebtoken.security.SecurityException e) {
            return JwtValidationResult.BAD_SIGNATURE;
        } catch (IllegalArgumentException e) {
            return JwtValidationResult.MALFORMED;
        } catch (JwtException e) {
            log.debug("Unexpected JWT validation error", e);
            return JwtValidationResult.MALFORMED;
        }
    }

    public enum JwtValidationResult {
        VALID, EXPIRED, MALFORMED, BAD_SIGNATURE;

        public boolean isValid() {
            return this == VALID;
        }
    }
}
