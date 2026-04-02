import { useCallback, useEffect, useState } from "react";
import { connectAlert, createInitialGameState, startSession, stopSession, tickSession, submitResponse, toPlayerSession } from "@guardian/domain";
import { DEFAULT_SESSION_DURATION_SEC } from "../lib/constants";
export function useGameSession(playerName) {
    const [state, setState] = useState(createInitialGameState(DEFAULT_SESSION_DURATION_SEC));
    const start = useCallback((durationSec = DEFAULT_SESSION_DURATION_SEC, startedAtMs = Date.now()) => {
        console.debug("[game] start requested", { durationSec, startedAtMs });
        setState((previous) => startSession(previous, startedAtMs, durationSec));
    }, []);
    const ingestAlert = useCallback((payload) => {
        console.debug("[game] alert ingested", payload);
        setState((previous) => connectAlert(previous, {
            eventId: payload.eventId,
            alertType: payload.alertType,
            deviceTsMs: payload.deviceTsMs,
            receivedTsMs: payload.receivedTsMs,
            source: payload.source
        }));
    }, []);
    const respond = useCallback((alertType) => {
        setState((previous) => submitResponse(previous, alertType, Date.now()));
    }, []);
    const stop = useCallback((endedAtMs = Date.now()) => {
        setState((previous) => stopSession(previous, endedAtMs));
    }, []);
    const reset = useCallback(() => {
        setState(createInitialGameState(DEFAULT_SESSION_DURATION_SEC));
    }, []);
    const buildSessionSummary = useCallback(() => {
        const id = `session-${Date.now()}`;
        const name = playerName.trim() || "Operator";
        return toPlayerSession(state, id, name);
    }, [playerName, state]);
    useEffect(() => {
        if (state.status !== "running") {
            return;
        }
        const intervalId = window.setInterval(() => {
            setState((previous) => tickSession(previous, Date.now()));
        }, 100);
        return () => {
            window.clearInterval(intervalId);
        };
    }, [state.status]);
    return {
        state,
        start,
        ingestAlert,
        respond,
        stop,
        reset,
        buildSessionSummary
    };
}
