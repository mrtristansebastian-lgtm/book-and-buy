/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050505',
        navy: '#101828',
        canvas: '#FBFBFB'
      },
      fontFamily: {
        brand: ['"Plus Jakarta Sans"', 'Figtree', 'sans-serif'],
        body: ['Figtree', '"Plus Jakarta Sans"', 'sans-serif'],
        button: ['Inter', 'Figtree', 'sans-serif']
      }
    }
  },
  plugins: []
};
