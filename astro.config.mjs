// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import dotenv from 'dotenv';
import sitemap from '@astrojs/sitemap';

// Load environment variables
dotenv.config();

// https://astro.build/config
export default defineConfig({
  output: 'hybrid',  // Enable hybrid rendering
  site: 'https://www.flowlearn.se',  // Replace with your actual domain
  base: '/',
  compressHTML: true,
  integrations: [tailwind(), react(), sitemap()],
  build: {
    assets: '_assets',  // Customize asset output
  },
  vite: {
    define: {
      'process.env': process.env
    },
    server: {
      host: true,  // Allow all network interfaces
      port: 3000,
      strictPort: false,
      hmr: {
        host: 'localhost',  // Change to localhost
        protocol: 'ws',
        overlay: true
      },
      watch: {
        ignored: ['**/node_modules/**', '**/.git/**']
      }
    },
    optimizeDeps: {
      force: true
    }
  }
});