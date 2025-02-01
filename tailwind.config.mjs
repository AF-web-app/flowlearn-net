import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(16 185 129)', // emerald-500
          hover: 'rgb(6 95 70)',      // emerald-800
          dark: 'rgb(4 120 87)',      // emerald-700
        },
        background: {
          DEFAULT: 'rgb(15 23 42)',   // slate-900
          light: 'rgb(30 41 59)',     // slate-800
        },
        border: {
          DEFAULT: 'rgb(51 65 85)',   // slate-700
          light: 'rgb(71 85 105)',    // slate-600
        },
        text: {
          DEFAULT: 'rgb(255 255 255)', // white
          muted: 'rgb(203 213 225)',   // slate-300
          dark: 'rgb(55 65 81)',       // gray-700
        }
      }
    },
  },
  plugins: [typography],
}
