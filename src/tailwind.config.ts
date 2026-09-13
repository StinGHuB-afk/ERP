import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Strict 70/20/10 Color System
        // 70% Canvas Background: slate-50 (#f8fafc)
        // 20% Card/Panel Content: pure white (#ffffff) with deep slate text (slate-800, slate-900)
        // 10% Primary Accent: solid blue-600 (#2563eb)
        border: "hsl(214.3 31.8% 91.4%)", // slate-200
        input: "hsl(214.3 31.8% 91.4%)",
        ring: "hsl(221.2 83.2% 53.3%)", // blue-600
        background: "hsl(210 40% 98%)", // slate-50
        foreground: "hsl(222.2 84% 4.9%)", // slate-950
        primary: {
          DEFAULT: "hsl(221.2 83.2% 53.3%)", // solid blue-600
          foreground: "hsl(210 40% 98%)",
        },
        secondary: {
          DEFAULT: "hsl(210 40% 96.1%)", // slate-100
          foreground: "hsl(222.2 47.4% 11.2%)", // slate-900
        },
        destructive: {
          DEFAULT: "hsl(0 84.2% 60.2%)", // red-600
          foreground: "hsl(210 40% 98%)",
        },
        muted: {
          DEFAULT: "hsl(210 40% 96.1%)", // slate-100
          foreground: "hsl(215.4 16.3% 46.9%)", // slate-500
        },
        accent: {
          DEFAULT: "hsl(210 40% 96.1%)",
          foreground: "hsl(222.2 47.4% 11.2%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)", // pure white
          foreground: "hsl(222.2 84% 4.9%)", // slate-950
        },
        popover: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(222.2 84% 4.9%)",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      boxShadow: {
        // Flat, crisp enterprise borders/shadows - NO muddy blur shadows
        card: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        subtle: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
    },
  },
  plugins: [],
}

export default config
