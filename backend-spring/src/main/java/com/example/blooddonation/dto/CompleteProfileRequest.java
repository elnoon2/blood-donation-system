package com.example.blooddonation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Payload for the first-login phone-capture flow (Phase 17).
 *
 * Egyptian mobile format. Accepts:
 *   01XXXXXXXXX   (11 digits, local)
 *   +201XXXXXXXXX (international with +)
 *    201XXXXXXXXX (international without +)
 *
 * The 4th digit (the carrier prefix) is restricted to 0/1/2/5 which covers
 * Vodafone (010), Etisalat (011), Orange (012), and WE (015). Reject anything
 * else early to surface obviously-wrong input before it reaches WhatsApp.
 */
@Data
public class CompleteProfileRequest {

    @NotBlank(message = "phone is required")
    @Pattern(
        regexp = "^(?:\\+?20|0)?1[0-2,5]\\d{8}$",
        message = "Phone must be a valid Egyptian mobile number (e.g. 01012345678)."
    )
    private String phone;
}
