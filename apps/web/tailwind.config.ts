import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors — ADA Design System (C1112)
        ada: {
          primary: '#7c3aed', // violet-600
          'primary-hover': '#6d28d9', // violet-700
          'primary-light': '#ede9fe', // violet-100
          success: '#10b981', // emerald-500
          'success-hover': '#059669', // emerald-600
          active: '#f59e0b', // amber-500
          'active-hover': '#d97706', // amber-600
        },
        // Role Colors (Agent Avatars)
        role: {
          ceo: '#6366f1', // indigo-500
          growth: '#f59e0b', // amber-500
          research: '#3b82f6', // blue-500
          frontier: '#8b5cf6', // violet-500
          product: '#10b981', // emerald-500
          scrum: '#f97316', // orange-500
          qa: '#ef4444', // red-500
          engineering: '#06b6d4', // cyan-500
          ops: '#84cc16', // lime-500
          design: '#ec4899', // pink-500
        },
        // Status Colors
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
