/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f5f5f5',
          100: '#e0e0e0',
          200: '#c0c0c0',
          300: '#9a9a9a',
          400: '#6b6b6b',
          500: '#4a4a4a',
          600: '#2e2e2e',
          700: '#1c1c1c',
          800: '#121212',
          900: '#0a0a0a',
          950: '#050505',
        },
        gold: {
          50: '#fffdf0',
          100: '#fff9c4',
          200: '#fff176',
          300: '#ffe24d',
          400: '#ffd700',
          500: '#ffc700',
          600: '#f5b800',
          700: '#d49d00',
          800: '#a87d00',
          900: '#7a5c00',
        },
      },
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'spin-slow': 'spin 20s linear infinite',
        'spin-reverse': 'spinReverse 15s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'pulse-ring': 'pulseRing 3s ease-out infinite',
        'marquee': 'marquee 30s linear infinite',
        'barbell-rotate': 'barbellRotate 12s ease-in-out infinite',
        'weight-bob': 'weightBob 4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        spinReverse: {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        barbellRotate: {
          '0%': { transform: 'rotateY(0deg) rotateX(15deg)' },
          '50%': { transform: 'rotateY(180deg) rotateX(15deg)' },
          '100%': { transform: 'rotateY(360deg) rotateX(15deg)' },
        },
        weightBob: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-15px) rotate(5deg)' },
        },
      },
    },
  },
  plugins: [],
};
