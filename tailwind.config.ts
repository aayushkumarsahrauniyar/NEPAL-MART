import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf2f3",
          100: "#fbe3e5",
          200: "#f6c7cb",
          300: "#ee9ea5",
          400: "#e26a77",
          500: "#d03d4f",
          600: "#b62a3d",
          700: "#972033",
          800: "#7d1e2e",
          900: "#6a1d2b",
          950: "#3a0b13",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5dae3",
          300: "#b0bacb",
          400: "#8493ae",
          500: "#647596",
          600: "#4f5e7d",
          700: "#414d65",
          800: "#394255",
          900: "#333a49",
          950: "#22262f",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 24 40 / 0.06), 0 1px 3px 0 rgb(16 24 40 / 0.1)",
        lift: "0 12px 24px -8px rgb(16 24 40 / 0.18)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        marquee: "marquee 30s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
