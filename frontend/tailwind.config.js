/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wine: {
          950: "#1A010B",
          900: "#2E0414",
          800: "#4A0820",
          700: "#6B0F2A",
          600: "#961535",
          500: "#C4294A",
          400: "#E53E5A",
          300: "#F06880",
          200: "#F8A8B5",
          100: "#FCDDE3",
          50:  "#FEF0F2",
        },
        dark: {
          950: "#07030A",
          900: "#0A0308",
          800: "#110509",
          700: "#1C0910",
          600: "#2A0F18",
          500: "#3D1622",
        },
      },
      fontFamily: {
        sans:    ["Outfit", "system-ui", "sans-serif"],
        display: ["DM Serif Display", "Georgia", "serif"],
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        "crimson-sm":  "0 2px 8px rgba(229,62,90,0.18)",
        "crimson-md":  "0 4px 20px rgba(229,62,90,0.25)",
        "crimson-lg":  "0 8px 40px rgba(229,62,90,0.3)",
        "crimson-xl":  "0 16px 64px rgba(229,62,90,0.35)",
        "crimson-glow":"0 0 0 3px rgba(229,62,90,0.2), 0 8px 32px rgba(229,62,90,0.25)",
        "dark-card":   "0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.4)",
      },
      animation: {
        "fade-in":  "fadeIn 0.35s ease-out",
        "slide-up": "slideUp 0.45s cubic-bezier(0.22,1,0.36,1)",
        "glow-pulse": "glowPulse 2.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" },                              to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        glowPulse: { "0%,100%": { opacity: "0.6" },                       "50%": { opacity: "1" } },
      },
    },
  },
  plugins: [],
};
