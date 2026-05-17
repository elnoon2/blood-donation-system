package com.example.blooddonation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonorStatsDTO {
    private long totalDonations;
    private long livesSaved;
    private String nextEligibleDate;
    private int daysUntilEligible;
    private int impactScore;
}
