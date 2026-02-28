/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0A0A0F',
        'bg-secondary': '#111118',
        'bg-card': '#16161E',
        'bg-hover': '#1C1C26',
        'border': '#2A2A3A',
        'text-primary': '#F0F0F8',
        'text-secondary': '#8888A0',
        'text-muted': '#555568',
        'accent': '#6366F1',
        'accent-hover': '#5254CC',
        'accent-dim': '#6366F120',
        'success': '#22C55E',
        'warning': '#F59E0B',
        'danger': '#EF4444',
        'info': '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
