/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--bb-ink-strong)',
        navy: 'var(--bb-ink)',
        canvas: 'var(--bb-bg)'
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
