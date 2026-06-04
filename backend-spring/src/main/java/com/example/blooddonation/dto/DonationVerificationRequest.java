package com.example.blooddonation.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class DonationVerificationRequest {
    private Long requestId;
    private Long donorId;
    private Long patientId;
    private String token;

    /**
     * Hospital-staff credentials, supplied inline because the QR-verify page
     * is intentionally public (the QR itself is the routing token; the staff
     * email + password authenticate the donation completion). The page does
     * NOT require a browser login — see audit/11-qr-flow-rebuild.md.
     */
    private String staffEmail;
    private String doctorPasswordOrOtp; // also serves as the staff login password

    private String hospitalName;
    private String doctorName;
    private String doctorMedicalId;
    private LocalDate donationDate;
    private Integer bagsCount;
    private String notes;
    private String idCardImage;
    private String questionnaireJson;
}
