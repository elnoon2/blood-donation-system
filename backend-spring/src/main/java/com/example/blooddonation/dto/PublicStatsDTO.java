package com.example.blooddonation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicStatsDTO {
    private long totalDonors;
    private long totalHospitals;
    private long totalLivesSaved;
}
