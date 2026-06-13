/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#160B2E",       // deep ink-violet base
        ink2: "#241046",      // raised surface
        lime: "#C6FF3D",      // reward accent — scoreboard lighting up
        coral: "#FF5C72",     // error
        mist: "#B9A9E0",      // muted lavender text
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"Space Mono"', "ui-monospace", "monospace"],
      },
      keyframes: {
        rollIn: {
          "0%": { transform: "translateY(60%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pop: {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "60%": { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(198,255,61,0.55)" },
          "50%": { boxShadow: "0 0 0 18px rgba(198,255,61,0)" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%,60%": { transform: "translateX(-6px)" },
          "40%,80%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        rollIn: "rollIn 420ms cubic-bezier(.2,.9,.2,1) both",
        pop: "pop 360ms cubic-bezier(.2,.9,.2,1) both",
        pulseGlow: "pulseGlow 1.8s ease-out infinite",
        shake: "shake 420ms ease-in-out both",
      },
    },
  },
  plugins: [],
};
