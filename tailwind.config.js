export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: '#f5c518', light: '#ffd84d', dark: '#e6b800' },
        dark: { 50: '#383838', 100: '#2e2e2e', 200: '#242424', 300: '#1e1e1e', 400: '#1a1a1a' },
        brown: { DEFAULT: '#6b4c2a', light: '#8b6340', dark: '#4a3018' }
      },
      fontFamily: { sans: ['Nunito', 'sans-serif'] },
      keyframes: {
        'scan-line': {
          '0%':   { top: '0%', opacity: 1 },
          '50%':  { opacity: 0.6 },
          '100%': { top: '100%', opacity: 1 },
        }
      },
      animation: {
        'scan-line': 'scan-line 2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
