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
        // Neon Dark Palette
        'n-bg': '#0a0a0f',
        'n-bg-surface': '#0d0d12',
        'n-bg-elevated': '#12121a',
        'n-cyan': '#00f0ff',
        'n-cyan-dim': '#00a8b3',
        'n-cyan-glow': '#00f0ff40',
        'n-cyan-muted': '#00f0ff15',
        'n-purple': '#8b5cf6',
        'n-purple-dim': '#6d42d9',
        'n-purple-glow': '#8b5cf640',
        'n-purple-muted': '#8b5cf615',
        'n-pink': '#ec4899',
        'n-pink-dim': '#d4368a',
        'n-pink-glow': '#ec489940',
        'n-pink-muted': '#ec489915',
        'n-text': '#ffffff',
        'n-text-secondary': '#a1a1aa',
        'n-text-muted': '#71717a',
        'n-status-success': '#00ff88',
        'n-status-warning': '#ffaa00',
        'n-status-error': '#ff4466',
        // Role Colors (brightened for dark bg)
        role: {
          ceo: '#818cf8',
          growth: '#fbbf24',
          research: '#60a5fa',
          frontier: '#a78bfa',
          product: '#34d399',
          scrum: '#fb923c',
          qa: '#f87171',
          engineering: '#22d3ee',
          ops: '#a3e635',
          design: '#f472b6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px #00f0ff30, 0 0 3px #00f0ff20',
        'glow-cyan-lg': '0 0 30px #00f0ff40, 0 0 8px #00f0ff30',
        'glow-purple': '0 0 15px #8b5cf630, 0 0 3px #8b5cf620',
        'glow-purple-lg': '0 0 30px #8b5cf640, 0 0 8px #8b5cf630',
        'glow-pink': '0 0 15px #ec489930, 0 0 3px #ec489920',
        'glow-pink-lg': '0 0 30px #ec489940, 0 0 8px #ec489930',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
