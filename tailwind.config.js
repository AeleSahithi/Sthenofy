/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
          ink: {
            50: '#171717',
            100: '#262626',
            200: '#404040',
            300: '#525252',
            400: '#737373',
            500: '#a3a3a3',
            600: '#d4d4d4',
            700: '#e5e5e5',
            800: '#f5f5f5',
            900: '#fafafa',
            950: '#ffffff',
          },
          gold: {
  50: '#FFFBEA',
  100: '#FFF4B8',
  200: '#FFE98A',
  300: '#FFDB4D',
  400: '#FFCC00',
  500: '#E6B800',
  600: '#CC9900',
  700: '#B38600',
  800: '#8F6B00',
  900: '#6B5000',
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
