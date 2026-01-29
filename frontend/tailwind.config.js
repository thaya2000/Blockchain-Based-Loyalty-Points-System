/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#14f195',
          dark: '#0fcf7f',
          light: '#3ff5ab',
        },
        secondary: {
          DEFAULT: '#9945ff',
          dark: '#7e37d4',
          light: '#b169ff',
        },
        dark: {
          bg: '#0a0f1e',
          surface: '#131929',
          card: '#1a2234',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(20, 241, 149, 0.3)',
        'glow-purple': '0 0 20px rgba(153, 69, 255, 0.3)',
      }
    },
  },
  plugins: [],
}
