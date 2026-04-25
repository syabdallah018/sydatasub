import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "selector",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        primary: "#2563EB",
        text: "#0F172A",
        subtext: "#64748B",
        "card-bg": "#F8FAFF",
        "bg-subtle": "#F5F7FF",
      },
      borderRadius: {
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "20px",
        xl: "24px",
        "2xl": "28px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        base: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
      },
    },
  },
  plugins: [],
};

export default config;
