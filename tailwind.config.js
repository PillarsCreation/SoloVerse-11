/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 应急蓝主色
        primary: {
          DEFAULT: "#005288",
          light: "#0070B8",
          dark: "#003D66",
        },
        // 浅蓝辅助色
        accent: {
          DEFAULT: "#2E7DFF",
          light: "#5B9BFF",
          dark: "#1A5DD9",
        },
        // 国标预警色
        warn: {
          red: "#E62020",
          orange: "#F57C00",
          yellow: "#FBC000",
          blue: "#1976D2",
        },
        // 安全色
        safe: "#27AE60",
        // 中性色
        bg: "#F5F7FA",
        card: "#FFFFFF",
        ink: {
          DEFAULT: "#1D2129",
          sub: "#4E5969",
        },
        border: "#E5E6EB",
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Roboto"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        btn: "6px",
        card: "8px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.08)",
        "card-lg": "0 4px 16px rgba(0,0,0,0.12)",
      },
      keyframes: {
        "warn-flash": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "slide-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "warn-flash": "warn-flash 1s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
