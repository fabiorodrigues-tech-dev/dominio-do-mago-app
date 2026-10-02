/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: "#050508",
        foreground: "#F8F9FA",
        border: "rgba(139, 92, 246, 0.2)",
        
        btn: {
          primary: "#9D4EDD",
          hover: "#7B2CBF",
          foreground: "#FFFFFF",
        },

        void: {
          DEFAULT: "#050508",
          light: "#120F1A",
        },
        mystic: {
          purple: "#1A1025",
          blue: "#0D1420",
          gold: "#FFD700",
          arcane: "#9D4EDD",
          cyan: "#00D9FF",
        },
        terra: { DEFAULT: "#3E5F44", light: "#4CAF50", dark: "#1A2B20" },
        fogo: { DEFAULT: "#D14900", light: "#FF6B35", dark: "#4A1A00" },
        agua: { DEFAULT: "#1B4965", light: "#48CAE4", dark: "#0A1F2E" },
        ar: { DEFAULT: "#A8DADC", light: "#E0F7FA", dark: "#3A6366" },
        mana: { DEFAULT: "#FFD700", dim: "#B8860B" },
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        "glass-hover": "0 12px 40px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 20px rgba(157, 78, 221, 0.2)",
        "glow-terra":  "0 0 20px rgba(76, 175, 80, 0.25), 0 0 50px rgba(62, 95, 68, 0.12)",
        "glow-fogo":   "0 0 20px rgba(209, 73, 0, 0.35), 0 0 50px rgba(255, 107, 53, 0.12)",
        "glow-agua":   "0 0 20px rgba(72, 202, 228, 0.30), 0 0 50px rgba(27, 73, 101, 0.12)",
        "glow-ar":     "0 0 20px rgba(168, 218, 220, 0.25), 0 0 50px rgba(224, 247, 250, 0.10)",
        "glow-arcane": "0 0 25px rgba(157, 78, 221, 0.35), 0 0 60px rgba(0, 217, 255, 0.12)",
        "glow-gold":   "0 0 25px rgba(255, 215, 0, 0.35), 0 0 60px rgba(255, 215, 0, 0.12)",
      },
      fontFamily: {
        mystic:  ['Cinzel', 'serif'],
        display: ['Cinzel Decorative', 'cursive'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      backgroundImage: {
        'gradient-arcane': 'linear-gradient(135deg, #1A1025 0%, #050508 100%)',
        'gradient-radial-magic': 'radial-gradient(circle at 50% 0%, rgba(157, 78, 221, 0.15), transparent 60%)',
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'pulse-magic': 'pulse-magic 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-magic': {
          '0%, 100%': { opacity: 0.8, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.02)' },
        }
      }
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
        '.scrollbar-hide::-webkit-scrollbar': {
          'display': 'none',
        },
      });
    },
  ],
}
