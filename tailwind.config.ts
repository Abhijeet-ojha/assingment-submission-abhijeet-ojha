import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08111f',
          900: '#0b1729',
          800: '#12223d'
        },
        accent: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb'
        }
      },
      boxShadow: {
        soft: '0 18px 60px rgba(2, 8, 23, 0.35)'
      }
    }
  },
  plugins: []
};

export default config;
