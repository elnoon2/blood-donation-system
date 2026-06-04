package com.example.blooddonation.service;

import com.example.blooddonation.dto.ActiveDonationRequestDTO;
import com.example.blooddonation.dto.BloodRequestDTO;
import com.example.blooddonation.dto.DonationHistoryDTO;
import com.example.blooddonation.dto.QrPayloadDTO;
import com.example.blooddonation.entity.*;
import com.example.blooddonation.enums.DonationStatus;
import com.example.blooddonation.enums.NotificationType;
import com.example.blooddonation.enums.RequestStatus;
import com.example.blooddonation.enums.Role;
import com.example.blooddonation.exception.ResourceNotFoundException;
import com.example.blooddonation.repository.*;
import com.example.blooddonation.util.BloodCompatibilityUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class DonationService {

    private static final Logger log = LoggerFactory.getLogger(DonationService.class);

    private static final Set<String> VALID_BLOOD_TYPES = com.example.blooddonation.enums.BloodType.LABELS;

    @Autowired
    private RequestRepository requestRepository;

    @Autowired
    private HospitalRepository hospitalRepository;

    @Autowired
    private DonorRepository donorRepository;

    @Autowired
    private DonorRequestRepository donorRequestRepository;

    @Autowired
    private DonationRepository donationRepository;

    @Autowired
    private DonationHistoryRepository donationHistoryRepository;

    @Autowired
    private com.example.blooddonation.repository.BloodInventoryRepository bloodInventoryRepository;

    @Autowired
    private com.example.blooddonation.repository.DonorHealthAssessmentRepository donorHealthAssessmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QRService qrService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Request createRequest(User patientUser, BloodRequestDTO dto) {
        List<RequestStatus> activeStatuses = List.of(RequestStatus.PENDING, RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS);
        boolean hasActive = requestRepository.existsByUserIdAndStatusIn(patientUser.getId(), activeStatuses);
        if (hasActive) {
            throw new IllegalStateException("You already have an active blood request.");
        }

        if (dto.getBagsNeeded() == null || dto.getBagsNeeded() <= 0) {
            throw new IllegalArgumentException("bagsNeeded must be greater than 0.");
        }
        if (dto.getHospitalId() == null) {
            throw new IllegalArgumentException("hospitalId is required for hospital-based donation.");
        }
        if (dto.getBloodType() == null || !VALID_BLOOD_TYPES.contains(dto.getBloodType())) {
            throw new IllegalArgumentException("bloodType must be one of " + VALID_BLOOD_TYPES);
        }

        Hospital hospital = hospitalRepository.findById(dto.getHospitalId())
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found"));

        int quantityNeeded = dto.getQuantityNeeded() != null ? dto.getQuantityNeeded() : dto.getBagsNeeded();

        Request request = Request.builder()
                .user(patientUser)
                .bloodType(dto.getBloodType())
                .quantityNeeded(quantityNeeded)
                .governorate(dto.getGovernorate())
                .phone(dto.getPhone())
                .requesterLatitude(dto.getRequesterLatitude())
                .requesterLongitude(dto.getRequesterLongitude())
                .requesterMapLink(dto.getRequesterMapLink())
                .status(RequestStatus.PENDING)
                .requestDate(LocalDate.now())
                .hospital(hospital)
                .patientName(dto.getPatientName())
                .bagsNeeded(dto.getBagsNeeded())
                .urgencyLevel(dto.getUrgencyLevel())
                .confirmedDonors(0)
                .build();

        request = requestRepository.save(request);
        notifyCompatibleDonors(request);
        return request;
    }

    public List<Request> getVisibleRequestsForUser(User user) {
        if (user.getRole() == Role.ADMIN) {
            return requestRepository.findAll().stream()
                    .sorted(this::sortByDateDescThenIdDesc)
                    .toList();
        }

        if (user.getRole() == Role.HOSPITAL) {
            if (user.getHospital() == null) {
                return List.of();
            }
            return requestRepository.findByHospitalIdOrderByRequestDateDesc(user.getHospital().getId()).stream()
                    .sorted(this::sortByDateDescThenIdDesc)
                    .toList();
        }

        if (user.getRole() == Role.PATIENT) {
            return requestRepository.findByUserIdOrderByRequestDateDesc(user.getId()).stream()
                    .sorted(this::sortByDateDescThenIdDesc)
                    .toList();
        }

        if (user.getRole() == Role.DONOR) {
            List<RequestStatus> activeStatuses = List.of(RequestStatus.PENDING, RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS);
            return requestRepository.findByStatusInOrderByRequestDateDesc(activeStatuses).stream()
                    .filter(request -> isVisibleToDonor(user, request))
                    .sorted(this::sortByDateDescThenIdDesc)
                    .toList();
        }

        return List.of();
    }

    @Transactional
    public ActiveDonationRequestDTO acceptRequest(Long requestId, User donorUser) {
        // Pessimistic lock: serialises concurrent donor-accept clicks on the
        // same PENDING request (security V11-1). Without this, two donors could
        // both pass the matchedDonor check and both create DonorRequest rows;
        // the loser would receive a QR token that never validates.
        Request request = requestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (request.getStatus() == RequestStatus.COMPLETED
                || request.getStatus() == RequestStatus.CANCELLED
                || request.getStatus() == RequestStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Request is not active.");
        }

        if (!BloodCompatibilityUtil.canDonate(donorUser.getBloodType(), request.getBloodType())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You are not compatible with this request.");
        }

        Donor donor = donorRepository.findByUserId(donorUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Donor profile not found"));

        if (donor.getAvailabilityStatus() != null
                && !"AVAILABLE".equalsIgnoreCase(donor.getAvailabilityStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Your donor profile is not AVAILABLE.");
        }

        if (donor.getLastDonationDate() != null && donor.getLastDonationDate().isAfter(LocalDate.now().minusMonths(3))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You must wait 3 months between donations.");
        }

        // Eligibility gate (audit Batch 3, business-logic finding 5.1).
        // Donor must have a recent (<=90 days) ELIGIBLE or NEEDS_REVIEW assessment.
        // TEMPORARILY_INELIGIBLE / INELIGIBLE donors are blocked here even if
        // their last assessment expired into the window.
        var eligibilityAllowed = java.util.List.of(
                com.example.blooddonation.enums.EligibilityResult.ELIGIBLE,
                com.example.blooddonation.enums.EligibilityResult.NEEDS_REVIEW);
        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusDays(90);
        boolean hasRecentAssessment = donorHealthAssessmentRepository
                .findFirstByDonorIdAndEligibilityResultInAndCreatedAtAfterOrderByCreatedAtDesc(
                        donor.getId(), eligibilityAllowed, cutoff)
                .isPresent();
        if (!hasRecentAssessment) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Please complete an eligibility assessment in the last 90 days before accepting requests.");
        }

        if (request.getMatchedDonor() != null
                && !request.getMatchedDonor().getId().equals(donorUser.getId())
                && request.getStatus() != RequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This request is already accepted by another donor.");
        }

        boolean firstAcceptance = !donorRequestRepository.existsByDonorIdAndRequestId(donorUser.getId(), request.getId());
        if (firstAcceptance) {
            DonorRequest donorRequest = DonorRequest.builder()
                    .donor(donorUser)
                    .request(request)
                    .acceptedAt(LocalDateTime.now())
                    .build();
            donorRequestRepository.save(donorRequest);

            request.setStatus(RequestStatus.IN_PROGRESS);
            request.setMatchedDonor(donorUser);
            request.setDonorConfirmed(true);
            request.setConfirmedDonors((request.getConfirmedDonors() == null ? 0 : request.getConfirmedDonors()) + 1);
            requestRepository.save(request);
        }

        QrPayloadDTO qrPayload = qrService.generateOrReuseSignedQrPayload(request, donorUser);

        if (firstAcceptance && request.getUser() != null) {
            notificationService.createNotificationIfNotDuplicate(
                    request.getUser(),
                    "A donor accepted your request and is heading to " + (request.getHospital() != null ? request.getHospital().getName() : "the hospital") + ".",
                    NotificationType.MATCH
            );
        }

        return buildActiveDonationDto(request, qrPayload);
    }

    public ActiveDonationRequestDTO getActiveDonationForDonor(User donorUser) {
        List<Request> active = requestRepository.findByMatchedDonorIdOrderByRequestDateDesc(donorUser.getId()).stream()
                .filter(r -> r.getStatus() == RequestStatus.ACCEPTED || r.getStatus() == RequestStatus.IN_PROGRESS)
                .sorted(this::sortByDateDescThenIdDesc)
                .toList();

        if (active.isEmpty()) {
            return null;
        }

        Request request = active.get(0);
        QrPayloadDTO payload = qrService.generateOrReuseSignedQrPayload(request, donorUser);
        if (request.getStatus() == RequestStatus.ACCEPTED) {
            request.setStatus(RequestStatus.IN_PROGRESS);
            requestRepository.save(request);
        }

        return buildActiveDonationDto(request, payload);
    }

    @Transactional
    public DonationHistoryDTO completeDonationWithQr(String secureSignedToken, User actingUser) {
        QRVerificationToken token = qrService.validateAndConsumeToken(secureSignedToken, actingUser);

        Request request = token.getRequest();
        if (request.getStatus() == RequestStatus.COMPLETED) {
            throw new IllegalStateException("Request is already completed.");
        }
        if (request.getStatus() != RequestStatus.ACCEPTED && request.getStatus() != RequestStatus.IN_PROGRESS) {
            throw new IllegalStateException("Request is not in a verifiable status.");
        }
        if (request.getHospital() == null) {
            throw new IllegalStateException("Request hospital is missing.");
        }

        request.setStatus(RequestStatus.COMPLETED);
        request.setPatientConfirmed(true);
        request.setDonorConfirmed(true);
        requestRepository.save(request);

        Donor donor = donorRepository.findByUserId(token.getDonor().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Donor profile not found"));
        donor.setLastDonationDate(LocalDate.now());
        donor.setTotalDonations((donor.getTotalDonations() == null ? 0 : donor.getTotalDonations()) + 1);
        donorRepository.save(donor);

        int quantity = request.getBagsNeeded() != null ? request.getBagsNeeded() : 1;
        Donation donation = Donation.builder()
                .user(token.getDonor())
                .hospital(request.getHospital())
                .bloodType(request.getBloodType())
                .quantity(quantity)
                .donationDate(LocalDate.now())
                .status(DonationStatus.COMPLETED)
                .build();
        donationRepository.save(donation);

        // Keep the hospital's blood inventory in sync. Previously only the
        // manual /api/donations POST path updated inventory; QR-verified
        // donations silently left the balance stale.
        Optional<com.example.blooddonation.entity.BloodInventory> existingInv =
                bloodInventoryRepository.findByHospitalIdAndBloodType(
                        request.getHospital().getId(), request.getBloodType());
        if (existingInv.isPresent()) {
            com.example.blooddonation.entity.BloodInventory inv = existingInv.get();
            Integer current = inv.getUnitsAvailable() == null ? 0 : inv.getUnitsAvailable();
            inv.setUnitsAvailable(current + quantity);
            inv.setLastUpdated(LocalDateTime.now());
            bloodInventoryRepository.save(inv);
        } else {
            com.example.blooddonation.entity.BloodInventory inv =
                    com.example.blooddonation.entity.BloodInventory.builder()
                            .hospital(request.getHospital())
                            .bloodType(request.getBloodType())
                            .unitsAvailable(quantity)
                            .lastUpdated(LocalDateTime.now())
                            .build();
            bloodInventoryRepository.save(inv);
        }

        DonationHistory history = DonationHistory.builder()
                .request(request)
                .donor(token.getDonor())
                .patient(token.getPatient())
                .hospital(request.getHospital())
                .bloodType(request.getBloodType())
                .bagsCount(request.getBagsNeeded() != null ? request.getBagsNeeded() : 1)
                .qrToken(token.getToken())
                .verifiedByUserId(actingUser.getId())
                .verifiedAt(LocalDateTime.now())
                .build();
        history = donationHistoryRepository.save(history);

        notificationService.createNotificationIfNotDuplicate(
                token.getDonor(),
                "Donation completed and verified by hospital.",
                NotificationType.SYSTEM
        );
        notificationService.createNotificationIfNotDuplicate(
                token.getPatient(),
                "Your request has been completed successfully.",
                NotificationType.SYSTEM
        );

        return DonationHistoryDTO.from(history);
    }

    public List<DonationHistoryDTO> getPatientHistory(Long patientId) {
        return donationHistoryRepository.findByPatientIdOrderByVerifiedAtDesc(patientId).stream()
                .map(DonationHistoryDTO::from)
                .toList();
    }

    public List<DonationHistoryDTO> getHospitalHistory(Long hospitalId) {
        return donationHistoryRepository.findByHospitalIdOrderByVerifiedAtDesc(hospitalId).stream()
                .map(DonationHistoryDTO::from)
                .toList();
    }

    public List<DonationHistoryDTO> getAllHistory() {
        return donationHistoryRepository.findAll().stream()
                .sorted((a, b) -> b.getVerifiedAt().compareTo(a.getVerifiedAt()))
                .map(DonationHistoryDTO::from)
                .toList();
    }

    private ActiveDonationRequestDTO buildActiveDonationDto(Request request, QrPayloadDTO qrPayload) {
        return ActiveDonationRequestDTO.builder()
                .requestId(request.getId())
                .bloodType(request.getBloodType())
                .patientName(request.getPatientName())
                .governorate(request.getGovernorate())
                .bagsNeeded(request.getBagsNeeded())
                .urgencyLevel(request.getUrgencyLevel())
                .status(request.getStatus().name())
                .hospitalName(request.getHospital() != null ? request.getHospital().getName() : null)
                .hospitalPhone(request.getHospital() != null ? request.getHospital().getPhone() : null)
                .hospitalLocation(request.getHospital() != null ? request.getHospital().getLocation() : null)
                .qrPayload(qrPayload)
                .patientId(request.getUser() != null ? request.getUser().getId() : null)
                .build();
    }

    private boolean isVisibleToDonor(User donorUser, Request request) {
        if (request.getStatus() == RequestStatus.PENDING) {
            return BloodCompatibilityUtil.canDonate(donorUser.getBloodType(), request.getBloodType());
        }
        return request.getMatchedDonor() != null && request.getMatchedDonor().getId().equals(donorUser.getId());
    }

    private int sortByDateDescThenIdDesc(Request a, Request b) {
        Comparator<Request> comparator = Comparator
                .comparing(Request::getRequestDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(Request::getId, Comparator.nullsLast(Comparator.naturalOrder()));
        return comparator.reversed().compare(a, b);
    }

    private void notifyCompatibleDonors(Request request) {
        List<String> compatibleTypes = BloodCompatibilityUtil.getCompatibleDonorTypes(request.getBloodType());
        List<Donor> matchingDonors = donorRepository.findByUserBloodTypeInAndUserGovernorateIgnoreCase(
                compatibleTypes,
                request.getGovernorate()
        );

        int notifiedCount = 0;
        for (Donor donor : matchingDonors) {
            if (!"AVAILABLE".equalsIgnoreCase(donor.getAvailabilityStatus())) {
                continue;
            }
            if (donor.getLastDonationDate() != null && donor.getLastDonationDate().isAfter(LocalDate.now().minusMonths(3))) {
                continue;
            }

            Notification created = notificationService.createNotificationIfNotDuplicate(
                    donor.getUser(),
                    "Urgent blood request in " + request.getGovernorate() + " for " + request.getBloodType() + ".",
                    NotificationType.URGENT
            );
            if (created != null) {
                notifiedCount++;
                try {
                    messagingTemplate.convertAndSend("/topic/notifications/" + donor.getUser().getId(), created);
                } catch (Exception e) {
                    log.warn("WebSocket push failed for donor user_id={}: {}", donor.getUser().getId(), e.getMessage());
                }
            }
        }

        if (request.getUser() != null) {
            notificationService.createNotificationIfNotDuplicate(
                    request.getUser(),
                    "Your request was created. " + notifiedCount + " compatible donors were notified.",
                    NotificationType.SYSTEM
            );
        }

        // Notify hospital staff (audit Batch 10 / business-logic finding 2.4):
        // any user with role=HOSPITAL whose `user.hospital` is the request's
        // hospital gets a REQUEST notification + STOMP push.
        if (request.getHospital() != null) {
            List<User> hospitalStaff = userRepository.findByRole(Role.HOSPITAL).stream()
                    .filter(u -> u.getHospital() != null
                            && u.getHospital().getId().equals(request.getHospital().getId()))
                    .toList();
            for (User staff : hospitalStaff) {
                Notification n = notificationService.createNotificationIfNotDuplicate(
                        staff,
                        "Incoming " + (request.getUrgencyLevel() != null ? request.getUrgencyLevel() : "request")
                                + " for " + request.getBloodType()
                                + " (" + request.getBagsNeeded() + " bag(s)) at your hospital.",
                        NotificationType.REQUEST
                );
                if (n != null) {
                    try {
                        messagingTemplate.convertAndSend("/topic/notifications/" + staff.getId(), n);
                    } catch (Exception e) {
                        log.warn("WebSocket push failed for hospital staff user_id={}: {}",
                                staff.getId(), e.getMessage());
                    }
                }
            }
        }
    }
}
