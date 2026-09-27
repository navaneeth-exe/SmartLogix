/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#123D2D',
        'brand-sidebar': '#153F30',
        'brand-primary': '#23834D',
        'brand-active': '#287B4B',
        'brand-soft': '#E1F1E5',
        'brand-sage': '#EEF4EC',
        'brand-bg': '#F5F3EC',
        'brand-card': '#FFFFFF',
        'brand-surface': '#F8F6F0',
        'brand-text': '#17231D',
        'brand-text-secondary': '#66716B',
        'brand-border': '#E5E6DF',
      }
    },
  },
  plugins: [],
}
