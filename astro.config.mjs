// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import node from "@astrojs/node";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import 'dotenv/config';
import * as dotenv from 'dotenv';
import path from 'path';

// Ladda miljövariabler
const loadEnv = () => {
  const mode = process.env.NODE_ENV || 'development';
  const envFiles = [
    `.env.${mode}.local`,
    `.env.${mode}`,
    `.env.local`,
    '.env'
  ];

  envFiles.forEach(file => {
    const envPath = path.resolve(process.cwd(), file);
    try {
      const result = dotenv.config({ path: envPath });
      if (result.error) {
        console.warn(`[ENV_DEBUG] Could not load ${file}:`, result.error);
      } else {
        console.log(`[ENV_DEBUG] Loaded environment from ${file}`);
      }
    } catch (error) {
      console.warn(`[ENV_DEBUG] Error loading ${file}:`, error);
    }
  });
};

loadEnv();

// https://astro.build/config
export default defineConfig({
  output: 'server',
  site: 'https://www.flowlearn.se',
  base: '/',
  compressHTML: true,
  integrations: [
    tailwind(), 
    react(),
    mdx(),
    sitemap()
  ],
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
    define: {
      'process.env': process.env
    }
  }
});