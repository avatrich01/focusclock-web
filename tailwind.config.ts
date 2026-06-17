import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace']
      },
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          subtle: 'rgb(var(--surface-subtle) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)'
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)'
        },
        content: {
          DEFAULT: 'rgb(var(--content) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
          subtle: 'rgb(var(--content-subtle) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)'
        },
        highlight: {
          DEFAULT: 'rgb(var(--highlight) / <alpha-value>)',
          soft: 'rgb(var(--highlight-soft) / <alpha-value>)'
        },
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          soft: 'rgb(var(--info-soft) / <alpha-value>)'
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)'
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--accent) / 0.55), 0 0 32px rgb(var(--accent) / 0.5)',
        'glow-volt': '0 0 0 1px rgb(var(--highlight) / 0.5), 0 0 28px rgb(var(--highlight) / 0.4)',
        card: '0 1px 2px rgb(0 0 0 / 0.08), 0 12px 32px rgb(0 0 0 / 0.14)'
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 1px rgb(var(--accent) / 0.45), 0 0 18px rgb(var(--accent) / 0.35)' },
          '50%': { boxShadow: '0 0 0 1.5px rgb(var(--accent) / 0.8), 0 0 42px rgb(var(--accent) / 0.6)' }
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        }
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        'fade-in': 'fade-in 0.35s ease-out both',
        'scale-in': 'scale-in 0.2s ease-out both',
        'slide-down': 'slide-down 0.3s ease-out both',
        'slide-in-left': 'slide-in-left 0.25s ease-out both'
      }
    }
  },
  plugins: []
}

export default config
