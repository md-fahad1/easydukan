/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 2px 12px -2px rgba(15,23,42,.07), 0 1px 3px rgba(15,23,42,.04)',
        glow: '0 10px 24px -8px rgba(5,150,105,.55)',
        'glow-red': '0 10px 24px -8px rgba(244,63,94,.5)',
      },
      animation: {
        'fade-up': 'fade-up .5s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .25s ease-out both',
        pop: 'pop .35s cubic-bezier(.34,1.56,.64,1) both',
        'slide-up': 'slide-up .35s cubic-bezier(.22,1,.36,1) both',
        float: 'float 3s ease-in-out infinite',
        ring: 'ring 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};