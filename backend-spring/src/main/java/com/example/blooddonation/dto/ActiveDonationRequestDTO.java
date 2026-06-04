package com.example.blooddonation.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ActiveDonationRequestDTO {
    private Long requestId;
    private String bloodType;
    private String patientName;
    private String governorate;
    private Integer bagsNeeded;
    private String urgencyLevel;
    private String status;
    private String hospitalName;
    private String hospitalPhone;
    private String hospitalLocation;
    private QrPayloadDTO qrPayload;
    private Long patientId;
}
