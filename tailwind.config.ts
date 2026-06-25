import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tear: {
          bg:      "#FDFAF6",
          primary: "#C2451E",
          "primary-dark": "#A83918",
          text:    "#1C1412",
          muted:   "#7C6E68",
          border:  "#E8DDD2",
          chip:    "#B0A49E",
          "chip-border": "#D6CEC8",
        },
      },
      fontFamily: {
        lora:   ["var(--font-lora)", "Georgia", "serif"],
        "dm-sans": ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
      animation: {
        "fade-up":   "fadeUp 0.6s ease both",
        "fade-up-1": "fadeUp 0.6s ease 0.05s both",
        "fade-up-2": "fadeUp 0.6s ease 0.12s both",
        "fade-up-3": "fadeUp 0.6s ease 0.20s both",
        "fade-up-4": "fadeUp 0.6s ease 0.28s both",
        "fade-in":   "fadeIn 0.5s ease both",
        "fade-in-5": "fadeIn 0.7s ease 0.5s both",
      },
    },
  },
  plugins: [],
};
export default config;
