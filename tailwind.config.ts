import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        spotify: {
          green: "#1DB954",
          dark: "#191414",
          black: "#0a0a0a",
        },
        surface: {
          900: "#0b0b10",
          800: "#13131a",
          700: "#1c1c26",
          600: "#262633",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(1200px 600px at 10% 0%, rgba(29,185,84,0.18), transparent 60%), radial-gradient(900px 600px at 90% 10%, rgba(99,102,241,0.18), transparent 60%), linear-gradient(180deg, #0b0b10 0%, #0b0b10 100%)",
        "card-gradient":
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(29,185,84,0.25), 0 10px 40px -10px rgba(29,185,84,0.45)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        pulse_soft: "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.7" } },
      },
    },
  },
  plugins: [],
};
export default config;
