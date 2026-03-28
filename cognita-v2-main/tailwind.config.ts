import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px',
        '3xl': '1920px',
      },
      colors: {
        brand: {
          50: 'hsl(var(--brand-50, 228 100% 97%))',
          100: 'hsl(var(--brand-100, 228 95% 93%))',
          200: 'hsl(var(--brand-200, 228 92% 86%))',
          300: 'hsl(var(--brand-300, 228 88% 76%))',
          400: 'hsl(var(--brand-400, 228 84% 66%))',
          500: 'hsl(var(--brand-500, 228 78% 58%))',
          600: 'hsl(var(--brand-600, 228 73% 50%))',
          700: 'hsl(var(--brand-700, 228 67% 42%))',
          800: 'hsl(var(--brand-800, 228 60% 34%))',
          900: 'hsl(var(--brand-900, 228 54% 27%))',
        },
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        88: '22rem',
        112: '28rem',
        128: '32rem',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        ui: ['var(--font-ui)'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glow: '0 0 24px rgba(99, 102, 241, 0.35)',
        'glow-lg': '0 0 36px rgba(99, 102, 241, 0.45)',
        card: '0 8px 30px rgba(15, 23, 42, 0.08)',
        'card-hover': '0 14px 40px rgba(15, 23, 42, 0.12)',
      },
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
        90: '90',
        100: '100',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.65' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .3s ease-out',
        'slide-up': 'slide-up .35s ease-out',
        'slide-down': 'slide-down .35s ease-out',
        shimmer: 'shimmer 1.4s linear infinite',
        'bounce-soft': 'bounce-soft 1.8s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 2.4s ease-in-out infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
