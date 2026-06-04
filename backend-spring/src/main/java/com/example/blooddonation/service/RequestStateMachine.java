package com.example.blooddonation.service;

import com.example.blooddonation.enums.RequestStatus;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Allowed transitions for a blood Request's lifecycle (audit Batch 4 /
 * business-logic finding 7.1). Terminal states (COMPLETED, REJECTED, CANCELLED)
 * are immutable from the normal API. AdminController exposes a logged
 * "override-status" endpoint that bypasses this matrix.
 */
public final class RequestStateMachine {

    private static final Map<RequestStatus, Set<RequestStatus>> ALLOWED = Map.of(
        RequestStatus.PENDING,     EnumSet.of(RequestStatus.ACCEPTED, RequestStatus.CANCELLED, RequestStatus.REJECTED),
        RequestStatus.ACCEPTED,    EnumSet.of(RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED),
        RequestStatus.IN_PROGRESS, EnumSet.of(RequestStatus.COMPLETED, RequestStatus.CANCELLED),
        RequestStatus.COMPLETED,   EnumSet.noneOf(RequestStatus.class),
        RequestStatus.REJECTED,    EnumSet.noneOf(RequestStatus.class),
        RequestStatus.CANCELLED,   EnumSet.noneOf(RequestStatus.class)
    );

    private RequestStateMachine() {}

    public static boolean isAllowed(RequestStatus from, RequestStatus to) {
        if (from == null || to == null) return false;
        if (from == to) return false; // no-op transitions are rejected to avoid silent no-ops
        return ALLOWED.getOrDefault(from, EnumSet.noneOf(RequestStatus.class)).contains(to);
    }

    public static Set<RequestStatus> allowedFrom(RequestStatus from) {
        return ALLOWED.getOrDefault(from, EnumSet.noneOf(RequestStatus.class));
    }

    public static boolean isTerminal(RequestStatus s) {
        return s == RequestStatus.COMPLETED || s == RequestStatus.REJECTED || s == RequestStatus.CANCELLED;
    }
}
