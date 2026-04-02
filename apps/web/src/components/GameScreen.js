import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatDurationSec } from "../lib/format";
const ALERTS = [
    { key: "gas", label: "Gas Leak" },
    { key: "temperature", label: "Temperature" },
    { key: "maintenance", label: "Maintenance" }
];
export function GameScreen(props) {
    return (_jsxs("section", { className: "card card-game", children: [_jsxs("header", { className: "game-header", children: [_jsxs("div", { children: [_jsx("p", { className: "label", children: "Timer" }), _jsx("p", { className: "value", "data-testid": "timer-value", children: formatDurationSec(props.remainingSec) })] }), _jsxs("div", { children: [_jsx("p", { className: "label", children: "Score" }), _jsx("p", { className: "value", "data-testid": "score-value", children: props.score })] })] }), _jsxs("div", { className: "alert-panel", "data-testid": "active-alert-panel", children: [_jsx("p", { className: "label", children: "Current Alert" }), _jsx("p", { className: "value", children: props.activeAlert ? props.activeAlert.toUpperCase() : "Waiting for signal" })] }), _jsx("div", { className: "alert-grid", children: ALERTS.map((item) => (_jsx("button", { className: props.activeAlert === item.key ? "alert-button active" : "alert-button", "data-testid": `alert-${item.key}`, onClick: () => props.onRespond(item.key), children: item.label }, item.key))) }), _jsx("button", { className: "secondary", onClick: props.onStop, children: "Stop Session" })] }));
}
