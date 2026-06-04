package com.example.blooddonation.security;

import com.example.blooddonation.entity.User;
import com.example.blooddonation.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(UserDetailsServiceImpl.class);

    @Autowired
    UserRepository userRepository;

    /**
     * Phase 14: case-insensitive + trim. Previously this was a strict
     * findByEmail which is case-sensitive on Oracle. A user registered with
     * "Doctor@Cairo.com" who later typed "doctor@cairo.com" (phones auto-
     * lowercase email fields by default) got "Bad credentials" even with the
     * right password. The behavior now matches the QR-submit path
     * (QRVerificationController) so login and QR verification authenticate
     * identically.
     */
    @Override
    @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        String normalised = email == null ? "" : email.trim();
        User user = userRepository.findByEmailIgnoreCase(normalised)
                .orElseThrow(() -> {
                    log.info("login: no user found for email '{}' (case-insensitive lookup)", normalised);
                    return new UsernameNotFoundException("User Not Found with email: " + normalised);
                });
        return UserDetailsImpl.build(user);
    }
}
