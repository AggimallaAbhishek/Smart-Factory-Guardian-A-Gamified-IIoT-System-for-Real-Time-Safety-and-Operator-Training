/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        factory: {
          bg: "#070b14",
          panel: "#101828",
          panelSoft: "#142033",
          line: "#213147",
          text: "#dce8ff",
          muted: "#90a7c9",
          neonCyan: "#22d3ee",
          neonOrange: "#fb923c",
          neonBlue: "#3b82f6",
          neonRed: "#ef4444",
          neonGreen: "#22c55e"
        }
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(34,211,238,0.3), 0 0 24px rgba(34,211,238,0.18)",
        alertRed: "0 0 28px rgba(239,68,68,0.45)",
        alertOrange: "0 0 28px rgba(251,146,60,0.45)",
        alertBlue: "0 0 28px rgba(59,130,246,0.45)"
      },
      keyframes: {
        pulseNeon: {
          "0%, 100%": { opacity: "0.75", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.03)" }
        },
        timerUrgent: {
          "0%, 100%": { color: "#ef4444", transform: "scale(1)" },
          "50%": { color: "#f97316", transform: "scale(1.06)" }
        }
      },
      animation: {
        pulseNeon: "pulseNeon 1s ease-in-out infinite",
        timerUrgent: "timerUrgent 900ms ease-in-out infinite"
      }
    }
  },
  plugins: []
};
