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
        // ─── Global palette (home, dashboard, auth, static pages) ───
        background: "#FAF8F5",
        foreground: "#2C2420",
        card: { DEFAULT: "#FFFFFE", foreground: "#2C2420" },
        primary: { DEFAULT: "#C4622D", foreground: "#FFFFFE" },
        secondary: { DEFAULT: "#F5F1EB", foreground: "#2C2420" },
        muted: { DEFAULT: "#D9D0C8", foreground: "#8B7F78" },
        accent: { DEFAULT: "#C4622D", foreground: "#FFFFFE" },
        highlight: { DEFAULT: "#F0E4DA", foreground: "#2C2420" },
        success: { DEFAULT: "#6B8E5A", foreground: "#FFFFFE" },
        destructive: { DEFAULT: "#B54848", foreground: "#FFFFFE" },
        border: "#E8DFD5",
        input: "#FFFFFE",
        ring: "#C4622D",

        // ─── Trip page — themed content palette ───
        // Driven by the active theme's `--theme-*` CSS vars, which are
        // declared inside `.theme-root[data-theme="..."]`. Shared blocks use
        // these utilities (e.g. `text-theme-fg`, `bg-theme-paper`) so they
        // render correctly on Journal / Expedition / Atelier without branching.
        theme: {
          bg: "var(--theme-bg)",
          "bg-deep": "var(--theme-bg-deep)",
          paper: "var(--theme-paper)",
          fg: "var(--theme-fg)",
          "fg-soft": "var(--theme-fg-soft)",
          "fg-mute": "var(--theme-fg-mute)",
          rule: "var(--theme-rule)",
          accent: "var(--theme-accent)",
          "accent-deep": "var(--theme-accent-deep)",
          "accent-soft": "var(--theme-accent-soft)",
        },

        // ─── Owner chrome — theme-independent ───
        // For owner-only surfaces (eye toggles, delete buttons, drop-zones,
        // command bar) that must stay legible on any theme, including
        // Expedition's dark background.
        chrome: {
          bg: "var(--owner-chrome-bg)",
          fg: "var(--owner-chrome-fg)",
          "fg-soft": "var(--owner-chrome-fg-soft)",
          border: "var(--owner-chrome-border)",
          accent: "var(--owner-chrome-accent)",
          "accent-fg": "var(--owner-chrome-accent-fg)",
        },
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
