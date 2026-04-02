import type { SourceType } from "@guardian/protocol";

interface HomeScreenProps {
  playerName: string;
  token: string;
  serialPath: string;
  source: SourceType;
  bridgePort: number;
  loading: boolean;
  onPlayerNameChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onSerialPathChange: (value: string) => void;
  onSourceChange: (value: SourceType) => void;
  onBridgePortChange: (value: number) => void;
  onConnect: () => void;
}

export function HomeScreen(props: HomeScreenProps) {
  return (
    <section className="card card-home">
      <h1>Smart Factory Guardian</h1>
      <p className="muted">
        Join a safety training session, connect to HC-05 bridge, and respond quickly to industrial alerts.
      </p>

      <label>
        <span>Player Name</span>
        <input
          data-testid="player-name"
          value={props.playerName}
          onChange={(event) => props.onPlayerNameChange(event.target.value)}
          placeholder="Operator name"
        />
      </label>

      <label>
        <span>Bridge Token</span>
        <input
          data-testid="bridge-token"
          value={props.token}
          onChange={(event) => props.onTokenChange(event.target.value)}
          placeholder="Paste launch token from bridge logs"
        />
      </label>

      <label>
        <span>Bridge Port</span>
        <input
          type="number"
          value={props.bridgePort}
          onChange={(event) => props.onBridgePortChange(Number(event.target.value))}
          min={1}
          max={65535}
        />
      </label>

      <label>
        <span>Source</span>
        <select
          data-testid="source-select"
          value={props.source}
          onChange={(event) => props.onSourceChange(event.target.value as SourceType)}
        >
          <option value="simulator">Simulator</option>
          <option value="serial">HC-05 Serial</option>
        </select>
      </label>

      {props.source === "serial" ? (
        <label>
          <span>Serial Path</span>
          <input
            value={props.serialPath}
            onChange={(event) => props.onSerialPathChange(event.target.value)}
            placeholder="/dev/tty.HC-05-DevB"
          />
        </label>
      ) : null}

      <button
        className="primary"
        data-testid="connect-button"
        disabled={props.loading || props.token.trim().length < 8}
        onClick={props.onConnect}
      >
        {props.loading ? "Connecting..." : "Join and Connect"}
      </button>
    </section>
  );
}
