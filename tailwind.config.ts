import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Bricolage Grotesque", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        sans: ["DM Sans", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#145231",
          950: "#0d3f23",
        },
        teal: {
          600: "#0d9488",
          700: "#0f7963",
          800: "#115e59",
          900: "#134e4a",
        },
      },
      spacing: {
        "app-bg": "var(--app-bg)",
        "card-bg": "var(--card-bg)",
        "border-subtle": "var(--border-subtle)",
      },
    },
  },
  plugins: [],
};

export default config;
