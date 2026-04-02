export function formatMsAsSeconds(valueMs) {
    return `${(valueMs / 1000).toFixed(3)} sec`;
}
export function formatDurationSec(durationSec) {
    const mins = Math.floor(durationSec / 60);
    const sec = durationSec % 60;
    return `${mins.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
export function formatDate(timestampMs) {
    return new Date(timestampMs).toLocaleString();
}
