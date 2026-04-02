/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Rajdhani", "sans-serif"],
        mono: ["Share Tech Mono", "monospace"]
      },
      colors: {
        base: {
          900: "#030712",
          800: "#0B1320",
          700: "#142033",
          500: "#3A506B"
        },
        tech: {
          red: "#FF2A4D",
          orange: "#FF9E00",
          blue: "#00F0FF",
          green: "#00FF9D"
        }
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(0,240,255,0.3), 0 0 24px rgba(0,240,255,0.2)",
        alertRed: "0 0 35px rgba(255,42,77,0.5)",
        alertOrange: "0 0 35px rgba(255,158,0,0.5)",
        alertBlue: "0 0 35px rgba(0,240,255,0.5)"
      },
      keyframes: {
        pulseAlert: {
          "0%, 100%": { opacity: "0.7", boxShadow: "0 0 0 rgba(0, 240, 255, 0)" },
          "50%": { opacity: "1", boxShadow: "0 0 26px rgba(0, 240, 255, 0.5)" }
        },
        timerUrgent: {
          "0%, 100%": { color: "#FF2A4D", transform: "scale(1)" },
          "50%": { color: "#FF9E00", transform: "scale(1.05)" }
        },
        sweep: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" }
        }
      },
      animation: {
        pulseAlert: "pulseAlert 1.1s ease-in-out infinite",
        timerUrgent: "timerUrgent 0.9s ease-in-out infinite",
        sweep: "sweep 1.8s linear infinite"
      }
    }
  },
  plugins: []
};
