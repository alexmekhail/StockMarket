import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'Courier New', 'monospace'],
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      colors: {
        bg: {
          primary: '#0a0a0a',
          secondary: '#111111',
          tertiary: '#1a1a1a',
          hover: '#222222',
        },
        border: {
          DEFAULT: '#2a2a2a',
          subtle: '#1f1f1f',
        },
        text: {
          primary: '#e8e8e8',
          secondary: '#888888',
          muted: '#555555',
        },
        gain: '#22c55e',
        loss: '#ef4444',
        accent: '#3b82f6',
      },
      animation: {
        'ticker-scroll': 'ticker-scroll 60s linear infinite',
      },
      keyframes: {
        'ticker-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
