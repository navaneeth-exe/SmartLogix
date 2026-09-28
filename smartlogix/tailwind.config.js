/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-ivory': '#FAF8F5',
        'brand-cream': '#F4F0E6',
        'brand-bg': '#FAF8F5',
        'brand-card': '#FFFFFF',
        'brand-surface': '#F6F3EB',
        'brand-sage-light': '#E8EFE9',
        'brand-sage': '#C2D1C7',
        'brand-sage-deep': '#5C7A6B',
        'brand-soft': '#E6EFE8',
        'brand-primary': '#1E5644',
        'brand-active': '#276E57',
        'brand-sidebar': '#133B2D',
        'brand-dark': '#0E2E23',
        'brand-text': '#18241E',
        'brand-text-secondary': '#5E6D65',
        'brand-text-muted': '#8A9990',
        'brand-border': '#E2E4DC',
        'brand-border-light': '#ECEEE7',
        'brand-lime': '#84CC16',
        'brand-lime-soft': '#F4FCE3',
      },
      boxShadow: {
        'soft-xs': '0 1px 2px rgba(18, 50, 36, 0.03)',
        'soft-sm': '0 1px 3px rgba(18, 50, 36, 0.04), 0 1px 2px rgba(18, 50, 36, 0.02)',
        'soft': '0 4px 16px -2px rgba(18, 50, 36, 0.05), 0 2px 6px -1px rgba(18, 50, 36, 0.03)',
        'soft-lg': '0 12px 28px -4px rgba(18, 50, 36, 0.07), 0 4px 12px -2px rgba(18, 50, 36, 0.04)',
        'soft-inset': 'inset 0 1px 3px 0 rgba(18, 50, 36, 0.04), inset 0 1px 2px 0 rgba(18, 50, 36, 0.02)',
        'soft-neumorphic': '0 1px 0 0 rgba(255, 255, 255, 0.9) inset, 0 4px 16px -2px rgba(18, 50, 36, 0.05)',
        'glass': '0 8px 30px 0 rgba(18, 50, 36, 0.06)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      backdropBlur: {
        'xs': '2px',
        'md': '10px',
      }
    },
  },
  plugins: [],
}
