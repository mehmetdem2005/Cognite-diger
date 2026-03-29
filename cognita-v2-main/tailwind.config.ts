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
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-placeholder': 'var(--text-placeholder)',
        'bg-soft': 'var(--bg-soft)',
        'bg-card': 'var(--bg-card)',
        'bg-secondary': 'var(--bg-secondary)',
        'border': 'var(--border-default)',
        'border-light': 'var(--border-light)',
        'border-strong': 'var(--border-strong)',
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
        18: '4.5rem',
        22: '5.5rem',
        88: '22rem',
        112: '28rem',
        128: '32rem',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
        ui: ['var(--font-body)'],
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
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
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease',
        shimmer: 'shimmer 1.4s infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
export default config
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
