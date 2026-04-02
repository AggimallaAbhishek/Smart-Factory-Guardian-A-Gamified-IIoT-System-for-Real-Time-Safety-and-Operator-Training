import { useCallback, useEffect, useRef, useState } from "react";
import { bridgeEventSchema } from "@guardian/protocol";
import { DEFAULT_BRIDGE_PORT } from "../lib/constants";
export function useBridgeClient(onEvent) {
    const [state, setState] = useState({
        connected: false,
        connecting: false,
        lastMessage: "Not connected",
        lastError: null
    });
    const wsRef = useRef(null);
    const tokenRef = useRef("");
    const disconnect = useCallback(() => {
        if (!wsRef.current) {
            return;
        }
        console.debug("[bridge] disconnect requested");
        wsRef.current.close();
        wsRef.current = null;
        setState({
            connected: false,
            connecting: false,
            lastMessage: "Disconnected",
            lastError: null
        });
    }, []);
    const sendCommand = useCallback((command) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            setState((previous) => ({
                ...previous,
                lastError: "Cannot send command while disconnected."
            }));
            return;
        }
        const withToken = {
            ...command,
            token: tokenRef.current
        };
        console.debug("[bridge] command sent", withToken);
        wsRef.current.send(JSON.stringify(withToken));
    }, []);
    const connect = useCallback((params) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            disconnect();
        }
        tokenRef.current = params.token;
        setState({
            connected: false,
            connecting: true,
            lastMessage: "Connecting to bridge...",
            lastError: null
        });
        const bridgePort = params.bridgePort ?? DEFAULT_BRIDGE_PORT;
        const ws = new WebSocket(`ws://127.0.0.1:${bridgePort}/ws?token=${encodeURIComponent(params.token)}`);
        wsRef.current = ws;
        ws.addEventListener("open", () => {
            console.debug("[bridge] websocket open");
            setState((previous) => ({
                ...previous,
                connected: true,
                connecting: false,
                lastMessage: "Connected"
            }));
            sendCommand({
                type: "CONNECT_SOURCE",
                payload: {
                    source: params.source,
                    serialPath: params.serialPath,
                    simulatorIntervalMinMs: 2000,
                    simulatorIntervalMaxMs: 3000
                }
            });
        });
        ws.addEventListener("message", (rawEvent) => {
            try {
                const parsedUnknown = JSON.parse(rawEvent.data);
                const parsedEvent = bridgeEventSchema.safeParse(parsedUnknown);
                if (!parsedEvent.success) {
                    console.warn("[bridge] ignored malformed bridge event", parsedEvent.error.format());
                    setState((previous) => ({
                        ...previous,
                        lastError: "Received malformed event from bridge."
                    }));
                    return;
                }
                const event = parsedEvent.data;
                console.debug("[bridge] event received", event);
                if (event.type === "ERROR") {
                    setState((previous) => ({
                        ...previous,
                        lastError: event.payload.message,
                        lastMessage: `Error: ${event.payload.code}`
                    }));
                }
                else if (event.type === "BRIDGE_STATUS") {
                    setState((previous) => ({
                        ...previous,
                        lastMessage: event.payload.message,
                        lastError: null
                    }));
                }
                onEvent(event);
            }
            catch (error) {
                console.warn("[bridge] failed to process event", error);
                setState((previous) => ({
                    ...previous,
                    lastError: "Bridge event processing failed."
                }));
            }
        });
        ws.addEventListener("close", () => {
            console.debug("[bridge] websocket closed");
            setState((previous) => ({
                ...previous,
                connected: false,
                connecting: false,
                lastMessage: "Disconnected from bridge"
            }));
        });
        ws.addEventListener("error", () => {
            setState((previous) => ({
                ...previous,
                connecting: false,
                connected: false,
                lastError: "Bridge connection failed. Verify token and bridge availability.",
                lastMessage: "Connection failed"
            }));
        });
    }, [disconnect, onEvent, sendCommand]);
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);
    return {
        state,
        connect,
        disconnect,
        sendCommand
    };
}
