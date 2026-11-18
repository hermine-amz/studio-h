import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        avocado: {
          DEFAULT: '#568203',
          dark: '#2B4101',
          deep: '#1E2E01',
          abyss: '#141F01',
          light: '#6D9F0A',
        },
        chiffon: {
          DEFAULT: '#FFF8B9',
          muted: '#E8E09D',
          soft: '#FFFCE0',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(10, 18, 0, 0.45)',
        'glass-hover': '0 12px 40px 0 rgba(86, 130, 3, 0.28)',
        glow: '0 0 24px rgba(255, 248, 185, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;

