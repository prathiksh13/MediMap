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
        background: '#FAFAF8',
        surface: '#FFFFFF',
        border: '#E8E4DC',
        primary: '#1A1A2E',
        accent: '#C4793A',
        muted: '#6B6B6B',
        'status-green': '#2D6A4F',
        'status-amber': '#E07C39',
        'status-red': '#B5382A',
        'surface-low': '#F4F4F2',
      },
      fontFamily: {
        playfair: ['Playfair Display', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        md: '0.25rem',
        lg: '0.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
