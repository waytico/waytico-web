import type { Config } from "tailwindcss"
import tailwindcssAnimate from "tailwindcss-animate"

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAF8F5",
        foreground: "#2C2420",
        card: { DEFAULT: "#FFFFFE", foreground: "#2C2420" },
        primary: { DEFAULT: "#C4622D", foreground: "#FFFFFE" },
        secondary: { DEFAULT: "#F5F1EB", foreground: "#2C2420" },
        muted: { DEFAULT: "#D9D0C8", foreground: "#8B7F78" },
        accent: { DEFAULT: "#C4622D", foreground: "#FFFFFE" },
        // Warm neutral for hover/selected backgrounds on outline/ghost UI
        highlight: { DEFAULT: "#F0E4DA", foreground: "#2C2420" },
        // Brand-aligned semantic statuses
        success: { DEFAULT: "#6B8E5A", foreground: "#FFFFFE" },
        destructive: { DEFAULT: "#B54848", foreground: "#FFFFFE" },
        border: "#E8DFD5",
        input: "#FFFFFE",
        ring: "#C4622D",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "0.625rem",
        md: "calc(0.625rem - 2px)",
        sm: "calc(0.625rem - 4px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config
