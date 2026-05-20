package com.example.blooddonation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DonorRecommendationDTO {
    private Long donorId;
    private String donorName;
    private String bloodType;
    private Double distanceKm;
    private Integer totalDonations;
    private Double recommendationScore;
    private String recommendationReason;
    private String availabilityStatus;
}
