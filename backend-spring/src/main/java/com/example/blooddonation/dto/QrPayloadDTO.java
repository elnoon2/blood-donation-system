package com.example.blooddonation.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QrPayloadDTO {
    private String hospitalName;
    private String hospitalPhone;
    private String hospitalLocation;
    private Long requestId;
    private Long donorId;
    private String timestamp;
    private String secureSignedToken;
    private Long patientId;
}
