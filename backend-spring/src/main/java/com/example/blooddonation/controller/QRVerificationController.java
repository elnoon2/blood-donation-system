package com.example.blooddonation.controller;

import com.example.blooddonation.dto.DonationVerificationRequest;
import com.example.blooddonation.entity.*;
import com.example.blooddonation.enums.RequestStatus;
import com.example.blooddonation.enums.Role;
import com.example.blooddonation.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.example.blooddonation.repository.DonationFormRepository;
import java.util.List;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/verify-donation")
@CrossOrigin(origins = "*", maxAge = 3600)
public class QRVerificationController {

    @Autowired
    private QRVerificationTokenRepository tokenRepository;

    @Autowired
    private DonationVerificationRepository verificationRepository;

    @Autowired
    private RequestRepository requestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DonationFormRepository donationFormRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private com.example.blooddonation.service.QRService qrService;

    @GetMapping("/token/{requestId}")
    public ResponseEntity<?> getToken(@PathVariable Long requestId, org.springframework.security.core.Authentication auth) {
        com.example.blooddonation.security.UserDetailsImpl principal = (com.example.blooddonation.security.UserDetailsImpl) auth.getPrincipal();
        User actingUser = userRepository.findById(principal.getId()).orElse(null);
        
        if (actingUser == null) return ResponseEntity.status(401).build();

        // Find existing valid token for this specific donor/request
        Optional<QRVerificationToken> existing = tokenRepository.findAll().stream()
                .filter(t -> t.getRequest().getId().equals(requestId) && 
                            t.getDonor().getId().equals(actingUser.getId()) &&
                            !t.getIsUsed() && 
                            t.getExpiresAt().isAfter(LocalDateTime.now()))
                .findFirst();

        if (existing.isPresent()) {
            return ResponseEntity.ok(Map.of("token", existing.get().getToken()));
        }

        Optional<Request> requestOpt = requestRepository.findById(requestId);
        if (requestOpt.isEmpty()) return ResponseEntity.notFound().build();
        
        Request request = requestOpt.get();
        if (request.getUser() == null) return ResponseEntity.badRequest().body(Map.of("message", "Request has no patient."));
        
        String token = java.util.UUID.randomUUID().toString();
        QRVerificationToken newToken = QRVerificationToken.builder()
                .request(request)
                .donor(actingUser) 
                .patient(request.getUser()) 
                .token(token)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();
        
        tokenRepository.save(newToken);
        return ResponseEntity.ok(Map.of("token", token));
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validateToken(
            @RequestParam Long request_id,
            @RequestParam Long donor_id,
            @RequestParam Long patient_id,
            @RequestParam String token) {

        System.out.println("Validating Token: [" + token + "] for Request: " + request_id + ", Donor: " + donor_id + ", Patient: " + patient_id);

        System.out.println("Validating Token: [" + token + "] for Request: " + request_id);

        Optional<QRVerificationToken> tokenOpt = tokenRepository.findAll().stream()
                .filter(t -> t.getToken().equals(token) && t.getRequest().getId().equals(request_id))
                .findFirst();

        if (tokenOpt.isEmpty()) {
            System.out.println("❌ TOKEN VALIDATION FAILED: No token found for token=" + token + " and requestId=" + request_id);
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid QR code (Token/Request mismatch)."));
        }

        QRVerificationToken verificationToken = tokenOpt.get();
        
        // Manual ID Checks with Logging
        if (!verificationToken.getDonor().getId().equals(donor_id)) {
            System.out.println("❌ DONOR MISMATCH: Token expects Donor " + verificationToken.getDonor().getId() + " but received " + donor_id);
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid QR code (Donor identity mismatch)."));
        }
        
        if (!verificationToken.getPatient().getId().equals(patient_id)) {
            System.out.println("❌ PATIENT MISMATCH: Token expects Patient " + verificationToken.getPatient().getId() + " but received " + patient_id);
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid QR code (Patient identity mismatch)."));
        }

        if (verificationToken.getIsUsed()) {
            return ResponseEntity.badRequest().body(Map.of("message", "This QR code has already been used."));
        }

        if (verificationToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "This QR code has expired."));
        }

        // Fetch display data
        Request request = verificationToken.getRequest();
        User donor = verificationToken.getDonor();
        User patient = verificationToken.getPatient();

        Map<String, Object> response = new HashMap<>();
        response.put("requestId", request.getId());
        response.put("donorId", donor.getId());
        response.put("patientId", patient.getId());
        response.put("donorName", donor.getName());
        response.put("patientName", patient.getName());
        response.put("bloodType", request.getBloodType());
        response.put("valid", true);

        System.out.println("✅ TOKEN VALIDATED SUCCESSFULLY for " + donor.getName());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submitVerification(@RequestBody DonationVerificationRequest form) {
        // 1. Validate Token
        Optional<QRVerificationToken> tokenOpt = tokenRepository.findByTokenAndRequestIdAndDonorIdAndPatientId(
                form.getToken(), form.getRequestId(), form.getDonorId(), form.getPatientId());

        if (tokenOpt.isEmpty() || tokenOpt.get().getIsUsed() || tokenOpt.get().getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired token."));
        }

        QRVerificationToken qrToken = tokenOpt.get();

        // 2. Authenticate Doctor
        Optional<User> doctorOpt = userRepository.findByMedicalId(form.getDoctorMedicalId());
        if (doctorOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Doctor authentication failed: Medical ID not found."));
        }

        User doctor = doctorOpt.get();
        if (!encoder.matches(form.getDoctorPasswordOrOtp(), doctor.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Doctor authentication failed: Incorrect password."));
        }

        // 3. Save Verification Record
        DonationVerification verification = DonationVerification.builder()
                .request(qrToken.getRequest())
                .donor(qrToken.getDonor())
                .patient(qrToken.getPatient())
                .hospitalName(form.getHospitalName())
                .doctorName(form.getDoctorName())
                .doctorMedicalId(form.getDoctorMedicalId())
                .donationDate(form.getDonationDate())
                .bagsCount(form.getBagsCount())
                .notes(form.getNotes())
                .idCardImage(form.getIdCardImage())
                .questionnaireJson(form.getQuestionnaireJson())
                .verifiedByDoctor(doctor)
                .verifiedAt(LocalDateTime.now())
                .build();

        verificationRepository.save(verification);

        // 4. Update Token
        qrToken.setIsUsed(true);
        qrToken.setUsedAt(LocalDateTime.now());
        tokenRepository.save(qrToken);

        // 5. Update Request Status
        Request request = qrToken.getRequest();
        request.setStatus(RequestStatus.DONATION_COMPLETED); // Or whatever the final state is
        requestRepository.save(request);

        return ResponseEntity.ok(Map.of("message", "Verification successful. Donation has been recorded."));
    }

    @PostMapping("/form-submit")
    public ResponseEntity<?> submitDonationForm(@RequestBody DonationForm form) {
        form.setCreatedAt(LocalDateTime.now());
        donationFormRepository.save(form);
        return ResponseEntity.ok(Map.of("message", "Donation form submitted successfully."));
    }

    @GetMapping("/forms")
    public List<DonationForm> getAllForms() {
        return donationFormRepository.findAll();
    }
}
