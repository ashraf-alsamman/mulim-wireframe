import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef5ff",
          100: "#d8e8ff",
          500: "#2868a8",
          700: "#173d69",
          900: "#0b1e34"
        },
        burgundy: {
          50: "#fff0f4",
          500: "#9f2446",
          700: "#741932"
        },
        gulf: {
          green: "#1f7a53",
          blue: "#56a6d6",
          red: "#c84a4a",
          gold: "#b88a2f"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(11, 30, 52, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
