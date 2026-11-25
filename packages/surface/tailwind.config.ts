import type { Config as TailwindConfig } from "tailwindcss";

const themeColor = (name: string) =>
  `rgb(var(--color-${name}) / <alpha-value>)`;

const config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: themeColor("surface"),
        subtle: themeColor("subtle"),
        control: themeColor("control"),
        ink: {
          DEFAULT: themeColor("ink"),
          muted: themeColor("ink-muted"),
        },
        onink: themeColor("on-ink"),
        briefing: themeColor("briefing"),
        line: themeColor("line"),
        teal: {
          DEFAULT: themeColor("teal"),
          soft: themeColor("teal-soft"),
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["SFMono-Regular", "Consolas", "Liberation Mono", "monospace"],
      },
      borderRadius: {
        card: "1.125rem",
      },
    },
  },
  plugins: [],
} satisfies TailwindConfig;

export default config;
