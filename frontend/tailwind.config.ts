import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // -----------------------------------------------------------------------
      // Lifesaver palette — "calm competence under deadline pressure"
      // Derived from the brief, not from generic AI app defaults.
      // -----------------------------------------------------------------------
      colors: {
        // Primary background and text
        slate: {
          deep: "#1E2A3A",
        },
        // Primary action / links
        sky: {
          confident: "#2D7DD2",
        },
        // Success / scheduled states
        teal: {
          calm: "#38B2AC",
        },
        // At-risk — warm urgency, NOT alarm red
        amber: {
          warm: "#F6AE2D",
        },
        // Surface / card backgrounds
        surface: "#F7F9FC",
        // Secondary text, borders
        mid: "#6B7A8D",

        // Semantic aliases used in components
        brand: {
          DEFAULT: "#2D7DD2",
          dark: "#1E2A3A",
          light: "#F7F9FC",
        },
        success: "#38B2AC",
        warning: "#F6AE2D",
        muted: "#6B7A8D",
      },

      fontFamily: {
        // Inter for UI — clean, readable at small sizes
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        // Mono for task IDs, timestamps
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },

      borderRadius: {
        card: "12px",
        pill: "9999px",
      },

      boxShadow: {
        card: "0 1px 3px 0 rgba(30,42,58,0.08), 0 1px 2px -1px rgba(30,42,58,0.06)",
        "card-hover": "0 4px 12px 0 rgba(30,42,58,0.12)",
        focus: "0 0 0 3px rgba(45,125,210,0.35)",
      },

      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
