package com.example.blooddonation.dto;

import com.example.blooddonation.entity.DonationHistory;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DonationHistoryDTO {
    private Long id;
    private Long requestId;
    private Long donorId;
    private String donorName;
    private Long patientId;
    private String patientName;
    private Long hospitalId;
    private String hospitalName;
    private String bloodType;
    private Integer bagsCount;
    private LocalDateTime verifiedAt;

    public static DonationHistoryDTO from(DonationHistory history) {
        return DonationHistoryDTO.builder()
                .id(history.getId())
                .requestId(history.getRequest() != null ? history.getRequest().getId() : null)
                .donorId(history.getDonor() != null ? history.getDonor().getId() : null)
                .donorName(history.getDonor() != null ? history.getDonor().getName() : null)
                .patientId(history.getPatient() != null ? history.getPatient().getId() : null)
                .patientName(history.getPatient() != null ? history.getPatient().getName() : null)
                .hospitalId(history.getHospital() != null ? history.getHospital().getId() : null)
                .hospitalName(history.getHospital() != null ? history.getHospital().getName() : null)
                .bloodType(history.getBloodType())
                .bagsCount(history.getBagsCount())
                .verifiedAt(history.getVerifiedAt())
                .build();
    }
}
