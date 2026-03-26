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
          bg: "#1A1A19",
          surface: "#232322",
          card: "#2a2a28",
          border: "rgba(250, 249, 245, 0.08)",
        },
        terra: {
          DEFAULT: "#D97757",
          light: "#e08a6a",
          dark: "#c06545",
          bg: "rgba(217, 119, 87, 0.08)",
          ring: "rgba(217, 119, 87, 0.22)",
        },
        cream: "#FAF9F5",
        ink: "#111110",
        brand: {
          green: "#4A7C59",
          "green-bg": "rgba(74, 124, 89, 0.08)",
          blue: "#4A6FA5",
          "blue-bg": "rgba(74, 111, 165, 0.08)",
          amber: "#C4943A",
          "amber-bg": "rgba(196, 148, 58, 0.08)",
          red: "#C25B56",
          purple: "#7B61A5",
          "purple-bg": "rgba(123, 97, 165, 0.08)",
        },
        text: {
          primary: "#FAF9F5",
          secondary: "rgba(250, 249, 245, 0.72)",
          muted: "#9A9590",
          dim: "rgba(250, 249, 245, 0.40)",
        },
        lterra: "#F5E6DE",
        lgrey: "#F0EFEB",
        "brand-border": "#E5E2DC",
      },
      fontFamily: {
        serif: ["DM Serif Display", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        panel: "16px",
        card: "12px",
      },
      boxShadow: {
        panel: "0 24px 64px rgba(20, 20, 19, 0.40)",
        "card-hover": "0 12px 32px rgba(20, 20, 19, 0.30)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(217, 119, 87, 0.08)" },
          "50%": { boxShadow: "0 0 40px rgba(217, 119, 87, 0.2)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "dot-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.7" },
          "50%": { transform: "scale(1.15)", opacity: "1" },
        },
      },
      animation: {
        breathe: "breathe 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "fade-in-up": "fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        shimmer: "shimmer 2.5s linear infinite",
        "dot-pulse": "dot-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
