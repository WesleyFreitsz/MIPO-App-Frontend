// tailwind.config.js (no projeto mobile)
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "hsl(var(--primary))", // Use os valores HSL do seu tailwind.config.ts original
        background: "hsl(var(--background))",
        card: "hsl(var(--card))",
      },
    },
  },
  plugins: [],
};
