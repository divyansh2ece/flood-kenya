/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Chakra Petch', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        sev1: '#22c55e',
        sev2: '#eab308',
        sev3: '#f97316',
        sev4: '#ef4444',
        sev5: '#7f1d1d',
        navy: {
          900: '#0b1221',
          800: '#101d33',
          700: '#132038',
          600: '#1a2d4a',
          500: '#1e3455',
        },
        cyan: { ops: '#38bdf8' },
      },
      animation: {
        'breathe': 'breathe 2s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}
