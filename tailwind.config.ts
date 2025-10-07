import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: { colors: { brand: { primary: "#FFFFFF", secondary: "#0A66FF" } } }
  },
  plugins: []
} satisfies Config;
