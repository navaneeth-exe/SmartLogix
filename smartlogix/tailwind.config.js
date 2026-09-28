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
        'brand-lime': '#84CC16',
        'brand-lime-hover': '#65A30D',
        'brand-lime-soft': '#F4FCE3',
        'brand-lime-glow': 'rgba(132, 204, 22, 0.25)',
      },
      boxShadow: {
        'soft-sm': '0 2px 8px -1px rgba(18, 61, 45, 0.05), 0 1px 3px 0 rgba(18, 61, 45, 0.03)',
        'soft': '0 4px 20px -2px rgba(18, 61, 45, 0.06), 0 2px 6px -1px rgba(18, 61, 45, 0.04)',
        'soft-lg': '0 10px 32px -4px rgba(18, 61, 45, 0.08), 0 4px 14px -2px rgba(18, 61, 45, 0.05)',
        'soft-inset': 'inset 0 2px 4px 0 rgba(18, 61, 45, 0.04), inset 0 1px 2px 0 rgba(18, 61, 45, 0.02)',
        'soft-tactile': '0 2px 0 0 rgba(255, 255, 255, 0.8) inset, 0 4px 16px -2px rgba(18, 61, 45, 0.06)',
        'glass': '0 8px 32px 0 rgba(18, 61, 45, 0.08)',
        'lime-glow': '0 0 20px -3px rgba(132, 204, 22, 0.35)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
