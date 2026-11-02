/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        novera: {
          ink: '#0b0b0b',
          paper: '#f2efe6',
          'paper-dim': '#e8e3d6',
          'paper-card': '#fbf9f4',
          silver: '#a9a9a4',
          charcoal: '#423e35',
          foil: '#b3924f',
          gold: '#cba75f',
          'gold-light': '#eed9a8',
          'gold-dark': '#8a6d34',
        },
      },
      fontFamily: {
        serif: ['Bodoni Moda', 'Playfair Display', 'Lora', 'Georgia', 'serif'],
        sans: ['Jost', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        editorial: '0 10px 30px -10px rgba(11, 11, 11, 0.08), 0 4px 6px -2px rgba(11, 11, 11, 0.03)',
        luxury: '0 20px 40px -15px rgba(179, 146, 79, 0.25)',
      },
    },
  },
  plugins: [],
};

