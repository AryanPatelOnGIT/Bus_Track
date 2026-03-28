/**
 * BusTrack - Shared Tailwind Utilities / Design Tokens
 * Custom CSS variables for the BusTrack color palette and typography.
 * Extends the default Tailwind config for all portals.
 */
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
        // Brand
        brand: {
          primary: "#0F4C81",   // Deep BRTS blue
          accent: "#F5A623",    // Ahmedabad amber
          dark: "#0A1628",      // Near-black background
          surface: "#121E30",   // Card/panel background
          muted: "#1E2D45",     // Secondary surface
        },
        status: {
          active: "#22C55E",    // Green – bus moving
          idle: "#F59E0B",      // Amber – bus stopped
          maintenance: "#EF4444", // Red – out of service
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Outfit'", "Inter", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(16px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
