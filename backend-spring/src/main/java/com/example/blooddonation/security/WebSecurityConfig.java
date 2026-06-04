package com.example.blooddonation.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class WebSecurityConfig {

    @Autowired
    UserDetailsServiceImpl userDetailsService;

    @Autowired
    RateLimitingFilter rateLimitingFilter;

    /**
     * Comma-separated origin allowlist driven by app.cors.allowed-origins
     * (env var CORS_ALLOWED_ORIGINS). Must be explicit -- no wildcards.
     */
    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String allowedOriginsRaw;

    @Bean
    public AuthTokenFilter authenticationJwtTokenFilter() {
        return new AuthTokenFilter();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        // Hide UsernameNotFoundException to prevent user enumeration via /login.
        authProvider.setHideUserNotFoundExceptions(true);
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> entries = Arrays.stream(allowedOriginsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        // Entries with no wildcard are exact origins; entries containing '*'
        // (e.g. http://192.168.*:5173 for mobile-on-LAN QR scanning) go into
        // allowedOriginPatterns. Production deploys keep wildcards out of the
        // env var; local dev sets CORS_ALLOWED_ORIGINS to include the LAN
        // pattern so a phone can hit the dev backend.
        List<String> exact = entries.stream().filter(s -> !s.contains("*")).toList();
        List<String> patterns = entries.stream().filter(s -> s.contains("*")).toList();
        if (!exact.isEmpty()) config.setAllowedOrigins(exact);
        if (!patterns.isEmpty()) config.setAllowedOriginPatterns(patterns);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                .contentTypeOptions(opts -> {})
                .frameOptions(frame -> frame.deny())
                .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
                .referrerPolicy(ref -> ref.policy(
                    org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
            )
            .authorizeHttpRequests(auth -> auth
                // Public endpoints - no token required
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/hospitals/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/donor-eligibility/check").permitAll()
                .requestMatchers("/ws-chat/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/error").permitAll()
                // QR verification: the signed token is itself the auth surface for
                // /validate, and /submit carries inline staff credentials. The page
                // must be reachable from a mobile device without a browser session.
                // See audit/11-qr-flow-rebuild.md for the security model.
                .requestMatchers(HttpMethod.GET, "/api/verify-donation/validate").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/verify-donation/submit").permitAll()
                // Everything else requires authentication
                .anyRequest().authenticated()
            );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);
        // Rate limiter runs first so denied requests never reach the auth filter
        // (matters for unauthenticated abuse on /login and /register).
        http.addFilterBefore(rateLimitingFilter, AuthTokenFilter.class);

        return http.build();
    }
}
