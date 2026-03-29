/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      gold: {
        DEFAULT: '#d4a843',
        hover: '#f0c060',
        light: 'rgba(212,168,67,0.1)',
      },
      bg: {
        primary: '#0a0a0f',
        secondary: '#111118',
        tertiary: '#16161f',
        card: '#1c1c28',
      },
      border: {
        DEFAULT: '#2a2a3a',
      },
      text: {
        DEFAULT: '#e8e8f0',
        muted: '#8888a0',
      },
      win: '#22c55e',
      loss: '#ef4444',
    },
    fontFamily: {
      bebas: ['"Bebas Neue"', 'cursive'],
      dm: ['"DM Sans"', 'sans-serif'],
    },
  },
}
