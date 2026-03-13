import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#1a1a19",
          surface: "#232322",
          card: "#2a2a28",
          border: "rgba(250, 249, 245, 0.08)",
        },
        terra: {
          DEFAULT: "#d97757",
          light: "#e08a6a",
          dark: "#c06545",
          bg: "rgba(217, 119, 87, 0.08)",
          ring: "rgba(217, 119, 87, 0.22)",
        },
        status: {
          green: "#22c55e",
          "green-glow": "rgba(34, 197, 94, 0.15)",
          "green-text": "#4ade80",
          amber: "#f59e0b",
          "amber-glow": "rgba(245, 158, 11, 0.12)",
          "amber-text": "#facc15",
        },
        text: {
          primary: "#faf9f5",
          secondary: "rgba(250, 249, 245, 0.72)",
          muted: "rgba(250, 249, 245, 0.40)",
          dim: "#b0aea5",
        },
        cream: "#faf9f5",
      },
      fontFamily: {
        serif: ["Lora", "Georgia", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        panel: "16px",
        card: "10px",
      },
      boxShadow: {
        panel: "0 24px 64px rgba(20, 20, 19, 0.40)",
      },
      keyframes: {
        "pulse-green": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(34, 197, 94, 0.15)" },
          "50%": { boxShadow: "0 0 14px rgba(34, 197, 94, 0.30)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-green": "pulse-green 2s ease-in-out infinite",
        "fade-in": "fade-in 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
