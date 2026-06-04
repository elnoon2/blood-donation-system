package com.example.blooddonation.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

public class AuthTokenFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AuthTokenFilter.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    /**
     * Paths that don't require authentication. Must stay in sync with
     * WebSecurityConfig's permitAll() rules.
     */
    private static final List<String> PUBLIC_PATTERNS = List.of(
            "/api/auth/**",
            "/api/public/**",
            "/ws-chat/**",
            "/error"
    );

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String jwt = parseJwt(request);

        if (jwt == null) {
            filterChain.doFilter(request, response);
            return;
        }

        JwtUtils.JwtValidationResult validation = jwtUtils.validateJwtToken(jwt);
        if (!validation.isValid()) {
            // Token was supplied but did not validate. Only reject hard on protected
            // routes; public routes still proceed (allowing logged-out access to /login etc.)
            if (isPublicPath(request)) {
                filterChain.doFilter(request, response);
                return;
            }
            writeUnauthorized(response, validation);
            return;
        }

        try {
            String username = jwtUtils.getUserNameFromJwtToken(jwt);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (UsernameNotFoundException e) {
            log.debug("Token subject does not match any user");
            if (!isPublicPath(request)) {
                writeUnauthorized(response, JwtUtils.JwtValidationResult.MALFORMED);
                return;
            }
        } catch (Exception e) {
            log.warn("Unexpected error setting authentication context", e);
            if (!isPublicPath(request)) {
                writeUnauthorized(response, JwtUtils.JwtValidationResult.MALFORMED);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isPublicPath(HttpServletRequest request) {
        String path = request.getServletPath();
        for (String pattern : PUBLIC_PATTERNS) {
            if (PATH_MATCHER.match(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    private void writeUnauthorized(HttpServletResponse response, JwtUtils.JwtValidationResult reason) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> body = Map.of(
                "error", "invalid_token",
                "reason", reason.name().toLowerCase()
        );
        response.getWriter().write(MAPPER.writeValueAsString(body));
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }
        return null;
    }
}
