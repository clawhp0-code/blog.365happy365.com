import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{md,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sunny: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        coral: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        cream: {
          50: "#fefdfb",
          100: "#fdf8f0",
          200: "#faf0e4",
          300: "#f5e6d3",
          400: "#efd5b8",
          500: "#e5c09a",
        },
        ink: {
          50: "#f8f8f8",
          100: "#f0f0f0",
          200: "#e4e4e4",
          300: "#d1d1d1",
          400: "#a8a8a8",
          500: "#737373",
          600: "#525252",
          700: "#3d3d3d",
          800: "#2a2a2a",
          900: "#1a1a1a",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
        mono: ["var(--font-fira-code)", "Menlo", "monospace"],
      },
      typography: (theme: any) => ({
        warm: {
          css: {
            "--tw-prose-body": theme("colors.ink.800"),
            "--tw-prose-headings": theme("colors.ink.900"),
            "--tw-prose-lead": theme("colors.ink.600"),
            "--tw-prose-links": theme("colors.coral.600"),
            "--tw-prose-bold": theme("colors.ink.900"),
            "--tw-prose-counters": theme("colors.ink.500"),
            "--tw-prose-bullets": theme("colors.sunny.400"),
            "--tw-prose-hr": theme("colors.cream.300"),
            "--tw-prose-quotes": theme("colors.ink.700"),
            "--tw-prose-quote-borders": theme("colors.sunny.400"),
            "--tw-prose-captions": theme("colors.ink.500"),
            "--tw-prose-code": theme("colors.coral.700"),
            "--tw-prose-pre-code": theme("colors.ink.100"),
            "--tw-prose-pre-bg": theme("colors.ink.800"),
            "--tw-prose-th-borders": theme("colors.cream.300"),
            "--tw-prose-td-borders": theme("colors.cream.200"),
          },
        },
      }),
      animation: {
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.4s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
