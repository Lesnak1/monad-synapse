import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'var(--font-inter)'],
        display: ['var(--font-space)', 'Geist'],
      },
      colors: {
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
      },
      boxShadow: {
        glow: '0 0 40px 10px rgba(139,92,246,0.25), 0 0 80px 20px rgba(124,58,237,0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [animate],
};

export default config;


