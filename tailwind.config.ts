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
        heading: ["Clash Display", "sans-serif"],
        subheading: ["Cabinet Grotesk", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        sans: ["DM Sans", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "hsl(var(--brand))",
          dark: "hsl(var(--brand-dark))",
          light: "hsl(var(--brand-light))",
        },
        status: {
          success: "hsl(var(--success))",
          warning: "hsl(var(--warning))",
          error: "hsl(var(--error))",
          info: "hsl(var(--info))",
        },
        network: {
          mtn: "hsl(var(--network-mtn))",
          airtel: "hsl(var(--network-airtel))",
          glo: "hsl(var(--network-glo))",
          "9mobile": "hsl(var(--network-9mobile))",
        },
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #00C896 0%, #1FF5A8 100%)",
        "gradient-dark": "linear-gradient(135deg, #1A1A1F 0%, #0C0C0F 100%)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        base: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        card: "0 4px 12px rgba(0, 0, 0, 0.15)",
        "card-hover": "0 8px 24px rgba(0, 0, 0, 0.25)",
        brand: "var(--shadow-brand)",
        "brand-glow": "0 0 20px rgba(0, 200, 150, 0.3)",
        button: "0 2px 8px rgba(0, 200, 150, 0.2)",
        "inner-shadow": "inset 0 1px 3px rgba(0, 0, 0, 0.3)",
      },
      spacing: {
        xs: "var(--spacing-xs)",
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
        xl: "var(--spacing-xl)",
        "2xl": "var(--spacing-2xl)",
        "3xl": "var(--spacing-3xl)",
        "4xl": "var(--spacing-4xl)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
    },
  },
  plugins: [],
};

export default config;
