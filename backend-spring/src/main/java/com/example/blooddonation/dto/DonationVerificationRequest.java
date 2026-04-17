package com.example.blooddonation.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class DonationVerificationRequest {
    private Long requestId;
    private Long donorId;
    private Long patientId;
    private String token;
    private String hospitalName;
    private String doctorName;
    private String doctorMedicalId;
    private String doctorPasswordOrOtp;
    private LocalDate donationDate;
    private Integer bagsCount;
    private String notes;
    private String idCardImage;
    private String questionnaireJson;
}
