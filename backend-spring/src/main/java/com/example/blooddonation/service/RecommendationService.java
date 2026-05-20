package com.example.blooddonation.service;

import com.example.blooddonation.dto.DonorRecommendationDTO;
import com.example.blooddonation.entity.Donor;
import com.example.blooddonation.entity.Request;
import com.example.blooddonation.repository.DonorRepository;
import com.example.blooddonation.repository.RequestRepository;
import com.example.blooddonation.util.BloodCompatibilityUtil;
import com.example.blooddonation.util.GeoUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    @Autowired
    private RequestRepository requestRepository;

    @Autowired
    private DonorRepository donorRepository;

    public List<DonorRecommendationDTO> getTopRecommendedDonors(Long requestId) {
        Optional<Request> requestOpt = requestRepository.findById(requestId);
        if (requestOpt.isEmpty()) {
            throw new IllegalArgumentException("Request not found");
        }
        Request request = requestOpt.get();

        List<Donor> allDonors = donorRepository.findAll();
        List<DonorRecommendationDTO> recommendations = new ArrayList<>();

        for (Donor donor : allDonors) {
            // 1. Filter Suspended / Inactive / Ineligible
            if (donor.getSuspended() != null && donor.getSuspended()) continue;
            if (donor.getActive() != null && !donor.getActive()) continue;
            if (donor.getAge() != null && donor.getAge() < 18) continue;
            if (donor.getWeight() != null && donor.getWeight() < 50) continue;

            // Cooldown check (90 days)
            if (donor.getLastDonationDate() != null) {
                long daysSinceDonation = ChronoUnit.DAYS.between(donor.getLastDonationDate(), LocalDate.now());
                if (daysSinceDonation < 90) {
                    continue;
                }
            }

            // 2. Blood Compatibility
            String donorBlood = donor.getUser().getBloodType();
            String receiverBlood = request.getBloodType();
            if (!BloodCompatibilityUtil.canDonate(donorBlood, receiverBlood)) {
                continue;
            }

            double score = 0;
            List<String> reasons = new ArrayList<>();
            reasons.add("Compatible blood type");

            // Compatibility Boost
            score += 50;

            // 3. Distance Score
            Double distanceKm = null;
            if (donor.getLatitude() != null && donor.getLongitude() != null &&
                request.getRequesterLatitude() != null && request.getRequesterLongitude() != null) {
                distanceKm = GeoUtils.calculateDistanceKm(
                        donor.getLatitude(), donor.getLongitude(),
                        request.getRequesterLatitude(), request.getRequesterLongitude()
                );

                if (distanceKm < 5) {
                    score += 30;
                    reasons.add(String.format("only %.1f km away", distanceKm));
                } else if (distanceKm < 15) {
                    score += 20;
                    reasons.add(String.format("%.1f km away", distanceKm));
                } else if (distanceKm < 30) {
                    score += 10;
                    reasons.add(String.format("%.1f km away", distanceKm));
                } else {
                    reasons.add(String.format("%.1f km away", distanceKm));
                }
            }

            // 4. Donation Activity
            int totalDonations = donor.getTotalDonations() != null ? donor.getTotalDonations() : 0;
            if (totalDonations > 0) {
                score += totalDonations * 2;
                reasons.add("active donor (" + totalDonations + " donations)");
            } else {
                reasons.add("new donor");
            }

            // 5. Availability
            if ("AVAILABLE".equalsIgnoreCase(donor.getAvailabilityStatus())) {
                score += 10;
                reasons.add("currently available");
            }

            // 6. Emergency Boost
            if ("EMERGENCY".equalsIgnoreCase(request.getUrgencyLevel()) || "CRITICAL".equalsIgnoreCase(request.getUrgencyLevel())) {
                score += 20;
            }

            reasons.add("eligible to donate");

            String recommendationReason = String.join(", ", reasons);

            DonorRecommendationDTO dto = DonorRecommendationDTO.builder()
                    .donorId(donor.getId())
                    .donorName(donor.getUser().getName())
                    .bloodType(donorBlood)
                    .distanceKm(distanceKm)
                    .totalDonations(totalDonations)
                    .recommendationScore(score)
                    .recommendationReason(recommendationReason)
                    .availabilityStatus(donor.getAvailabilityStatus())
                    .build();

            recommendations.add(dto);
        }

        // Sort by Score DESC, Distance ASC, Donations DESC
        recommendations.sort(Comparator
                .comparing(DonorRecommendationDTO::getRecommendationScore).reversed()
                .thenComparing(dto -> dto.getDistanceKm() == null ? Double.MAX_VALUE : dto.getDistanceKm())
                .thenComparing(DonorRecommendationDTO::getTotalDonations, Comparator.reverseOrder())
        );

        return recommendations;
    }
}
