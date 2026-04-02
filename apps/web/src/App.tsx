import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AlertType, BridgeEvent, PlayerSession, SourceType } from "@guardian/protocol";
import { DEFAULT_SESSION_DURATION_SEC, DEFAULT_BRIDGE_PORT } from "./lib/constants";
import { appendSession, loadSessionHistory } from "./lib/storage";
import { downloadSessionsCsv } from "./lib/csv";
import { HomeScreen } from "./components/HomeScreen";
import { GameScreen } from "./components/GameScreen";
import { ResultScreen } from "./components/ResultScreen";
import { useBridgeClient } from "./hooks/useBridgeClient";
import { useGameSession } from "./hooks/useGameSession";

type AppView = "home" | "game" | "result";

export function App() {
  const [view, setView] = useState<AppView>("home");
  const [playerName, setPlayerName] = useState("Operator");
  const [token, setToken] = useState("test-token");
  const [source, setSource] = useState<SourceType>("simulator");
  const [serialPath, setSerialPath] = useState("");
  const [bridgePort, setBridgePort] = useState(DEFAULT_BRIDGE_PORT);
  const [currentResult, setCurrentResult] = useState<PlayerSession | null>(null);
  const [history, setHistory] = useState<PlayerSession[]>(() => loadSessionHistory());

  const finishedRef = useRef(false);
  const game = useGameSession(playerName);
  const {
    state: gameState,
    ingestAlert,
    start,
    stop,
    respond,
    reset,
    buildSessionSummary
  } = game;
  const gameStatusRef = useRef(gameState.status);

  useEffect(() => {
    gameStatusRef.current = gameState.status;
  }, [gameState.status]);

  const onBridgeEvent = useCallback(
    (event: BridgeEvent) => {
      if (event.type === "ALERT") {
        ingestAlert(event.payload);
        return;
      }

      if (event.type === "SESSION_STATE") {
        if (event.payload.status === "running" && gameStatusRef.current !== "running") {
          start(event.payload.durationSec, event.payload.startedAtMs ?? Date.now());
        }

        if (event.payload.status === "stopped") {
          stop(event.payload.endedAtMs ?? Date.now());
        }
      }
    },
    [ingestAlert, start, stop]
  );

  const bridge = useBridgeClient(onBridgeEvent);

  const onConnect = useCallback(() => {
    bridge.connect({
      token,
      source,
      serialPath: source === "serial" ? serialPath : undefined,
      bridgePort
    });

    setView("game");
  }, [bridge, token, source, serialPath, bridgePort]);

  const onStartSession = useCallback(() => {
    bridge.sendCommand({
      type: "START_SESSION",
      payload: {
        durationSec: DEFAULT_SESSION_DURATION_SEC
      }
    });
  }, [bridge]);

  useEffect(() => {
    if (view === "game" && bridge.state.connected && gameState.status === "idle") {
      onStartSession();
    }
  }, [view, bridge.state.connected, gameState.status, onStartSession]);

  useEffect(() => {
    if (gameState.status === "running") {
      finishedRef.current = false;
      return;
    }

    if (gameState.status === "stopped" && !finishedRef.current) {
      finishedRef.current = true;

      const summary = buildSessionSummary();
      const updatedHistory = appendSession(summary);
      setHistory(updatedHistory);
      setCurrentResult(summary);
      setView("result");
    }
  }, [buildSessionSummary, gameState.status]);

  const onRespond = useCallback((alertType: AlertType) => {
    respond(alertType);
  }, [respond]);

  const onStopSession = useCallback(() => {
    bridge.sendCommand({
      type: "STOP_SESSION",
      payload: {}
    });
  }, [bridge]);

  const onPlayAgain = useCallback(() => {
    reset();
    setCurrentResult(null);
    setView("home");
  }, [reset]);

  const statusText = useMemo(() => {
    const status = bridge.state.connected ? "Connected" : bridge.state.connecting ? "Connecting" : "Offline";
    return `${status}: ${bridge.state.lastMessage}`;
  }, [bridge.state.connected, bridge.state.connecting, bridge.state.lastMessage]);

  return (
    <main className="app-shell">
      <aside className="status-pill" data-testid="bridge-status">
        {statusText}
      </aside>

      {bridge.state.lastError ? <p className="error-text">{bridge.state.lastError}</p> : null}

      {view === "home" ? (
        <HomeScreen
          playerName={playerName}
          token={token}
          serialPath={serialPath}
          source={source}
          bridgePort={bridgePort}
          loading={bridge.state.connecting}
          onPlayerNameChange={setPlayerName}
          onTokenChange={setToken}
          onSerialPathChange={setSerialPath}
          onSourceChange={setSource}
          onBridgePortChange={setBridgePort}
          onConnect={onConnect}
        />
      ) : null}

      {view === "game" ? (
        <GameScreen
          score={gameState.score}
          remainingSec={gameState.remainingSec}
          activeAlert={gameState.activeAlert?.alertType ?? null}
          onRespond={onRespond}
          onStop={onStopSession}
        />
      ) : null}

      {view === "result" && currentResult ? (
        <ResultScreen
          current={currentResult}
          history={history}
          onPlayAgain={onPlayAgain}
          onExportCsv={() => downloadSessionsCsv(history)}
        />
      ) : null}
    </main>
  );
}
