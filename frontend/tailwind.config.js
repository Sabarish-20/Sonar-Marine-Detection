/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sonar: {
          950: '#060B13',
          900: '#0B1320',
          850: '#101B2E',
          800: '#15243D',
          700: '#1E3557',
          600: '#2A4B7C',
          500: '#3866A6',
          cyan: '#00F0FF',
          teal: '#0DF2C8',
          amber: '#FFB800',
          red: '#FF3366',
          emerald: '#10B981'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
