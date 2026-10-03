/** @type {import('tailwindcss').Config} */
const brand = {
  50: '#E8F8FA',
  100: '#CFF0F3',
  200: '#A0E1E7',
  300: '#6CCFD8',
  400: '#3DBBC7',
  500: '#18A9B7',
  600: '#0E8F9B',
  700: '#0B737D',
  800: '#0A5A63',
  900: '#08444B',
};

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // পুরনো সব emerald/teal ক্লাস এখন নতুন ব্র্যান্ড টিল রঙে দেখাবে
        emerald: brand,
        teal: brand,
        brand,
        canvas: '#F4F5F7',
        ink: '#111827',
      },
      boxShadow: {
        soft: '0 4px 20px -6px rgba(15,23,42,.08), 0 1px 3px rgba(15,23,42,.04)',
        glow: '0 10px 24px -8px rgba(24,169,183,.55)',
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