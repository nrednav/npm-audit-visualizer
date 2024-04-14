import type { Config as TailwindConfig } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        light: "#f2f4f6",
        dark: "#162026",
      },
    },
  },
  plugins: [],
} satisfies TailwindConfig;

export default config;
