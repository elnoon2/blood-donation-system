package com.example.blooddonation.service;

import com.example.blooddonation.enums.RequestStatus;
import org.junit.jupiter.api.Test;

import static com.example.blooddonation.enums.RequestStatus.*;
import static org.junit.jupiter.api.Assertions.*;

class RequestStateMachineTest {

    @Test
    void pendingCanGoToAcceptedCancelledRejected() {
        assertTrue(RequestStateMachine.isAllowed(PENDING, ACCEPTED));
        assertTrue(RequestStateMachine.isAllowed(PENDING, CANCELLED));
        assertTrue(RequestStateMachine.isAllowed(PENDING, REJECTED));
    }

    @Test
    void pendingCannotJumpToCompleted() {
        assertFalse(RequestStateMachine.isAllowed(PENDING, COMPLETED));
        assertFalse(RequestStateMachine.isAllowed(PENDING, IN_PROGRESS));
    }

    @Test
    void acceptedFlowsToInProgressOrCancelled() {
        assertTrue(RequestStateMachine.isAllowed(ACCEPTED, IN_PROGRESS));
        assertTrue(RequestStateMachine.isAllowed(ACCEPTED, CANCELLED));
        assertFalse(RequestStateMachine.isAllowed(ACCEPTED, COMPLETED));
        assertFalse(RequestStateMachine.isAllowed(ACCEPTED, PENDING));
    }

    @Test
    void inProgressFlowsToCompletedOrCancelled() {
        assertTrue(RequestStateMachine.isAllowed(IN_PROGRESS, COMPLETED));
        assertTrue(RequestStateMachine.isAllowed(IN_PROGRESS, CANCELLED));
        assertFalse(RequestStateMachine.isAllowed(IN_PROGRESS, ACCEPTED));
        assertFalse(RequestStateMachine.isAllowed(IN_PROGRESS, PENDING));
    }

    @Test
    void terminalStatesAreImmutable() {
        for (RequestStatus target : RequestStatus.values()) {
            assertFalse(RequestStateMachine.isAllowed(COMPLETED, target),
                "COMPLETED must not transition to " + target);
            assertFalse(RequestStateMachine.isAllowed(REJECTED, target),
                "REJECTED must not transition to " + target);
            assertFalse(RequestStateMachine.isAllowed(CANCELLED, target),
                "CANCELLED must not transition to " + target);
        }
    }

    @Test
    void noOpTransitionsRejected() {
        for (RequestStatus s : new RequestStatus[]{PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED}) {
            assertFalse(RequestStateMachine.isAllowed(s, s), s + " -> " + s + " should be rejected");
        }
    }

    @Test
    void nullsAreRejected() {
        assertFalse(RequestStateMachine.isAllowed(null, PENDING));
        assertFalse(RequestStateMachine.isAllowed(PENDING, null));
    }

    @Test
    void terminalDetection() {
        assertTrue(RequestStateMachine.isTerminal(COMPLETED));
        assertTrue(RequestStateMachine.isTerminal(REJECTED));
        assertTrue(RequestStateMachine.isTerminal(CANCELLED));
        assertFalse(RequestStateMachine.isTerminal(PENDING));
        assertFalse(RequestStateMachine.isTerminal(ACCEPTED));
        assertFalse(RequestStateMachine.isTerminal(IN_PROGRESS));
    }
}
