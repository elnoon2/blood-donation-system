package com.example.blooddonation.controller;

import com.example.blooddonation.dto.JwtResponse;
import com.example.blooddonation.dto.LoginRequest;
import com.example.blooddonation.dto.MessageResponse;
import com.example.blooddonation.dto.RegisterRequest;
import com.example.blooddonation.entity.Donor;
import com.example.blooddonation.entity.User;
import com.example.blooddonation.enums.Role;
import com.example.blooddonation.repository.DonorRepository;
import com.example.blooddonation.repository.HospitalRepository;
import com.example.blooddonation.repository.UserRepository;
import com.example.blooddonation.security.JwtUtils;
import com.example.blooddonation.security.UserDetailsImpl;
import jakarta.validation.Valid;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    DonorRepository donorRepository;

    @Autowired
    HospitalRepository hospitalRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        return ResponseEntity.ok(new JwtResponse(jwt,
                                                 userDetails.getId(),
                                                 userDetails.getName(),
                                                 userDetails.getEmail(),
                                                 userDetails.getAuthorities().iterator().next().getAuthority()));
    }

    @PostMapping("/register")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest signUpRequest) {
        // Phase 14: case-insensitive duplicate check. Prevents two accounts
        // with the same email in different casing -- which would also make
        // future case-insensitive login/QR-submit lookups ambiguous.
        if (userRepository.existsByEmailIgnoreCase(signUpRequest.getEmail())) {
            log.debug("Registration rejected: email already in use");
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already in use!"));
        }

        Role roleEnum;
        try {
            roleEnum = Role.valueOf(signUpRequest.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            log.debug("Registration rejected: invalid role value");
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Invalid role"));
        }

        if(roleEnum == Role.ADMIN) {
             return ResponseEntity.badRequest().body(new MessageResponse("Error: Cannot register as ADMIN via this endpoint"));
        }

        User user = User.builder()
                .name(signUpRequest.getName())
                .email(signUpRequest.getEmail())
                .password(encoder.encode(signUpRequest.getPassword()))
                .bloodType(signUpRequest.getBloodType())
                .governorate(signUpRequest.getGovernorate())
                .phone(signUpRequest.getPhone())
                .role(roleEnum)
                .isApproved(roleEnum != Role.HOSPITAL) // Hospital needs approval
                .build();

        if (roleEnum == Role.HOSPITAL) {
            if (signUpRequest.getHospitalId() == null) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: Hospital ID is required for hospital role"));
            }
            user.setHospital(hospitalRepository.findById(signUpRequest.getHospitalId())
                .orElseThrow(() -> new RuntimeException("Hospital not found")));
        }

        User savedUser = userRepository.save(user);
        log.info("User registered id={} role={}", savedUser.getId(), roleEnum);

        if (roleEnum == Role.DONOR) {
            Donor donor = Donor.builder()
                .user(savedUser)
                .availabilityStatus("AVAILABLE")
                .build();
            donorRepository.save(donor);
        }

        if (roleEnum == Role.HOSPITAL) {
            return ResponseEntity.ok(new MessageResponse("Hospital registered successfully! Please wait for admin approval before logging in."));
        }

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(Authentication authentication) {
        if(authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(401).body(new MessageResponse("Unauthorized"));
        }
        try {
            if (!(authentication.getPrincipal() instanceof UserDetailsImpl)) {
                return ResponseEntity.status(401).body(new MessageResponse("Invalid authentication principal"));
            }
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Optional<User> userOpt = userRepository.findById(userDetails.getId());
            if (userOpt.isPresent()) {
                return ResponseEntity.ok(userOpt.get());
            } else {
                return ResponseEntity.status(404).body(new MessageResponse("User not found"));
            }
        } catch (Exception e) {
            log.warn("getMe failed: {}", e.getMessage());
            return ResponseEntity.status(500).body(new MessageResponse("Error retrieving user"));
        }
    }
}
