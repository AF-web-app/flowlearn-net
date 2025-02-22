// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';
import 'dotenv/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://flowlearn.se',
  base: '/',
  compressHTML: true,
  integrations: [
    react({
      include: ['**/*.{jsx,tsx}'],
      experimentalReactChildren: true
    }),
    tailwind(), 
    mdx(),
    sitemap()
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  build: {
    assets: '_assets',
  },
  vite: {
    ssr: {
      noExternal: ['react-icons']
    },
    define: {
      'process.env': process.env
    }
  }
});