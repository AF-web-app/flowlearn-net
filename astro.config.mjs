// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';
import 'dotenv/config';

// Importera säkerhetskonfigurationen från vår centraliserade config
import { securityConfig } from './src/lib/config.js';

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
      // Endast exponera specifika miljövariabler istället för hela process.env
      // Använder vår centraliserade säkerhetskonfiguration
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      
      // Publika variabler som är säkra att exponera till klienten
      'process.env.PUBLIC_WEB3FORMS_ACCESS_KEY': JSON.stringify(process.env.PUBLIC_WEB3FORMS_ACCESS_KEY),
      
      // WordPress-relaterade variabler - tillgängliga i alla miljöer
      'process.env.WORDPRESS_URL': JSON.stringify(process.env.WORDPRESS_URL),
      'process.env.WORDPRESS_USERNAME': JSON.stringify(process.env.WORDPRESS_USERNAME),
      'process.env.WP_USERNAME': JSON.stringify(process.env.WP_USERNAME)
    }
  }
});