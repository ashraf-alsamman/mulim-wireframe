import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f5f5f5",
          100: "#eeeeee",
          500: "#707070",
          700: "#242424",
          900: "#000000"
        },
        burgundy: {
          50: "#f5f5f5",
          500: "#4d4d4d",
          700: "#000000"
        },
        gulf: {
          green: "#000000",
          blue: "#242424",
          red: "#000000",
          gold: "#4d4d4d"
        }
      },
      boxShadow: {
        soft: "none"
      }
    }
  },
  plugins: []
};

export default config;
