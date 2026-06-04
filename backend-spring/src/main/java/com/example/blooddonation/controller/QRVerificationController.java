package com.example.blooddonation.controller;

import com.example.blooddonation.dto.DonationVerificationRequest;
import com.example.blooddonation.dto.MessageResponse;
import com.example.blooddonation.entity.DonationForm;
import com.example.blooddonation.entity.QRVerificationToken;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.enums.Role;
import com.example.blooddonation.exception.ResourceNotFoundException;
import com.example.blooddonation.repository.DonationFormRepository;
import com.example.blooddonation.repository.QRVerificationTokenRepository;
import com.example.blooddonation.repository.UserRepository;
import com.example.blooddonation.security.UserDetailsImpl;
import com.example.blooddonation.service.DonationService;
import com.example.blooddonation.service.QRService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * QR-based donation verification controller.
 *
 * Design (audit/11-qr-flow-rebuild.md):
 *
 *   * /token/{requestId}  — DONOR-only (existing).
 *   * /validate           — PUBLIC. The signed JWT in the QR is the auth
 *                           token; signature + expiry + db-row are validated.
 *                           Response returns minimal info needed by the
 *                           hospital form (donor + patient name, hospital).
 *   * /submit             — PUBLIC. The body carries the staff email +
 *                           password; the endpoint authenticates them
 *                           inline, then completes the donation. No browser
 *                           login is required on the hospital's scanning
 *                           device.
 *   * /form-submit, /forms — staff-authenticated admin operations (unchanged).
 *
 * Security model: the QR token is signed HS512 by the same secret as JWT
 * auth, expires after 24h, is consumed atomically, and stores donor+patient+
 * hospital IDs. A stolen QR cannot be used without the corresponding hospital-
 * staff password.
 */
@RestController
@RequestMapping("/api/verify-donation")
public class QRVerificationController {

    private static final Logger log = LoggerFactory.getLogger(QRVerificationController.class);

    @Autowired private DonationService donationService;
    @Autowired private QRService qrService;
    @Autowired private QRVerificationTokenRepository tokenRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DonationFormRepository donationFormRepository;
    @Autowired private com.example.blooddonation.repository.RequestRepository requestRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @GetMapping("/token/{requestId}")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<?> getToken(@PathVariable Long requestId, Authentication auth) {
        User donor = requireUser(auth);

        LocalDateTime now = LocalDateTime.now();
        Optional<QRVerificationToken> existing = tokenRepository
                .findFirstByRequestIdAndDonorIdAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        requestId, donor.getId(), now);

        if (existing.isPresent()) {
            QRVerificationToken tokenEntity = existing.get();
            com.example.blooddonation.dto.QrPayloadDTO payload = qrService.buildPayloadFromToken(tokenEntity, donor);
            return ResponseEntity.ok(Map.of(
                    "token", tokenEntity.getToken(),
                    "payload", payload
            ));
        }

        com.example.blooddonation.entity.Request request = requestRepository.findById(requestId).orElse(null);
        if (request == null) {
            return ResponseEntity.status(404).body(new MessageResponse(
                "Request #" + requestId + " not found in the database."));
        }
        // Surface specific, actionable preconditions instead of letting them
        // bubble out as opaque 500s.
        if (request.getHospital() == null) {
            return ResponseEntity.status(400).body(new MessageResponse(
                "This request has no hospital assigned yet, so a QR cannot be generated. " +
                "Pick a hospital on the request first."));
        }
        // Only the donor matched to this request may mint its QR (or, if the
        // request is still PENDING and they're compatible, the act of fetching
        // the QR is interpreted as accepting -- which DonationService gates
        // separately. Here we just block obviously-wrong donors).
        if (request.getMatchedDonor() != null
                && !request.getMatchedDonor().getId().equals(donor.getId())) {
            return ResponseEntity.status(403).body(new MessageResponse(
                "This request is matched to a different donor. You cannot generate its QR."));
        }
        try {
            com.example.blooddonation.dto.QrPayloadDTO payload = qrService.generateOrReuseSignedQrPayload(request, donor);
            return ResponseEntity.ok(Map.of(
                    "token", payload.getSecureSignedToken(),
                    "payload", payload
            ));
        } catch (IllegalStateException badPrecondition) {
            // QRService throws IllegalStateException for things like missing
            // hospital. Convert to 400 with the message so the frontend can show it.
            return ResponseEntity.status(400).body(new MessageResponse(badPrecondition.getMessage()));
        }
    }

    /**
     * PUBLIC endpoint. The QR token alone authenticates the lookup. Returns
     * just enough for the hospital scanner UI to render the verification form
     * (donor name, patient name, hospital, expiry). The signed JWT prevents
     * forgery; a stolen token still requires staff credentials at /submit.
     */
    @GetMapping("/validate")
    public ResponseEntity<?> validateToken(@RequestParam String token) {
        QRVerificationToken stored = tokenRepository.findByToken(token).orElse(null);
        if (stored == null) {
            return ResponseEntity.status(404).body(Map.of("valid", false, "reason", "not_found"));
        }
        if (Boolean.TRUE.equals(stored.getIsUsed())) {
            return ResponseEntity.ok(Map.of("valid", false, "reason", "used"));
        }
        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.ok(Map.of("valid", false, "reason", "expired"));
        }
        // Also validate the JWT signature so a tampered token-string is rejected.
        try {
            qrService.parseTokenClaims(token);
        } catch (Exception sig) {
            return ResponseEntity.ok(Map.of("valid", false, "reason", "signature"));
        }

        String donorName = stored.getDonor() != null ? stored.getDonor().getName() : "";
        String patientName = stored.getPatient() != null
                ? stored.getPatient().getName()
                : (stored.getRequest() != null ? stored.getRequest().getPatientName() : "");
        String hospitalName = stored.getRequest() != null && stored.getRequest().getHospital() != null
                ? stored.getRequest().getHospital().getName() : "";
        Long hospitalId = stored.getRequest() != null && stored.getRequest().getHospital() != null
                ? stored.getRequest().getHospital().getId() : null;

        return ResponseEntity.ok(Map.of(
                "valid", true,
                "donorName", donorName,
                "patientName", patientName,
                "hospitalName", hospitalName,
                "hospitalId", hospitalId == null ? "" : hospitalId,
                "bloodType", stored.getRequest() != null && stored.getRequest().getBloodType() != null
                        ? stored.getRequest().getBloodType() : "",
                "bagsNeeded", stored.getRequest() != null && stored.getRequest().getBagsNeeded() != null
                        ? stored.getRequest().getBagsNeeded() : 0,
                "expiresAt", stored.getExpiresAt().toString()
        ));
    }

    /**
     * PUBLIC endpoint with INLINE staff credentials.
     *
     * Sequence:
     *   1. Token must be present + unused + unexpired + signature-valid.
     *   2. staffEmail + password are looked up in `users`; password compared
     *      with BCrypt.
     *   3. Staff role must be HOSPITAL or ADMIN.
     *   4. If HOSPITAL, staff.hospital.id must equal token.request.hospital.id.
     *   5. completeDonationWithQr consumes the token, marks the request
     *      COMPLETED, inserts the Donation, increments BloodInventory, etc.
     *   6. The full DonationForm (survey, ID image, doctor info) is persisted
     *      separately for audit.
     */
    @PostMapping("/submit")
    public ResponseEntity<?> submitVerification(@RequestBody DonationVerificationRequest form) {
        if (form == null || form.getToken() == null || form.getToken().isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("token is required"));
        }
        if (form.getStaffEmail() == null || form.getStaffEmail().isBlank()
                || form.getDoctorPasswordOrOtp() == null || form.getDoctorPasswordOrOtp().isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Staff email and password are required."));
        }

        QRVerificationToken stored = tokenRepository.findByToken(form.getToken()).orElse(null);
        if (stored == null) {
            return ResponseEntity.status(404).body(new MessageResponse("QR token not found."));
        }
        if (Boolean.TRUE.equals(stored.getIsUsed())) {
            return ResponseEntity.status(409).body(new MessageResponse("QR token already used."));
        }
        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(410).body(new MessageResponse("QR token expired."));
        }
        try {
            qrService.parseTokenClaims(form.getToken());
        } catch (Exception sig) {
            return ResponseEntity.status(401).body(new MessageResponse("QR token signature invalid."));
        }

        // Inline staff authentication (no @PreAuthorize -- the token + form
        // creds are the auth surface for this endpoint).
        User staff = userRepository.findByEmail(form.getStaffEmail().trim()).orElse(null);
        if (staff == null || !passwordEncoder.matches(form.getDoctorPasswordOrOtp(), staff.getPassword())) {
            // Constant-ish response time isn't reachable here without further work;
            // intentionally not differentiating wrong-email vs wrong-password.
            log.info("QR submit auth rejected for email '{}'", form.getStaffEmail());
            return ResponseEntity.status(401).body(new MessageResponse("Invalid staff credentials."));
        }
        if (staff.getRole() != Role.HOSPITAL && staff.getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).body(new MessageResponse(
                    "Only HOSPITAL or ADMIN accounts can submit donation verification."));
        }
        // Hospital scoping: the staff member must belong to the request's hospital.
        if (staff.getRole() == Role.HOSPITAL) {
            Long staffHospitalId = staff.getHospital() != null ? staff.getHospital().getId() : null;
            Long tokenHospitalId = stored.getRequest() != null && stored.getRequest().getHospital() != null
                    ? stored.getRequest().getHospital().getId() : null;
            if (staffHospitalId == null || !staffHospitalId.equals(tokenHospitalId)) {
                return ResponseEntity.status(403).body(new MessageResponse(
                        "This QR belongs to a different hospital than your account."));
            }
        }

        // Persist the audit form (survey, image, doctor info). Best-effort:
        // do not block the donation completion if this fails.
        try {
            DonationForm dform = new DonationForm();
            dform.setCreatedAt(LocalDateTime.now());
            dform.setRequestId(form.getRequestId());
            dform.setPatientName(stored.getPatient() != null ? stored.getPatient().getName()
                    : (stored.getRequest() != null ? stored.getRequest().getPatientName() : ""));
            dform.setPatientNationalId("");
            dform.setBloodType(stored.getRequest() != null ? stored.getRequest().getBloodType() : "");
            dform.setPatientPhone(stored.getRequest() != null ? stored.getRequest().getPhone() : "");
            dform.setPatientGovernorate(stored.getRequest() != null ? stored.getRequest().getGovernorate() : "");
            dform.setNotes(form.getNotes());
            dform.setDoctorName(form.getDoctorName());
            dform.setDoctorIdNumber(form.getDoctorMedicalId());
            dform.setDoctorIdImage(form.getIdCardImage());
            donationFormRepository.save(dform);
        } catch (Exception persistErr) {
            log.warn("DonationForm audit save failed (non-fatal): {}", persistErr.getMessage());
        }

        return ResponseEntity.ok(donationService.completeDonationWithQr(form.getToken(), staff));
    }

    @PostMapping("/form-submit")
    @PreAuthorize("hasAnyRole('HOSPITAL','ADMIN')")
    public ResponseEntity<?> submitDonationForm(@RequestBody DonationForm form) {
        form.setCreatedAt(LocalDateTime.now());
        donationFormRepository.save(form);
        return ResponseEntity.ok(Map.of("message", "Donation form submitted successfully."));
    }

    @GetMapping("/forms")
    @PreAuthorize("hasAnyRole('HOSPITAL','ADMIN')")
    public List<DonationForm> getAllForms() {
        return donationFormRepository.findAll();
    }

    private User requireUser(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl principal)) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
