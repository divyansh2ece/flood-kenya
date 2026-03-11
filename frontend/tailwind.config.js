/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sev1: '#22c55e',
        sev2: '#eab308',
        sev3: '#f97316',
        sev4: '#ef4444',
        sev5: '#7f1d1d',
      },
    },
  },
  plugins: [],
}
