/**
 * Centraliserad konfigurationshantering för Flowlearn
 * 
 * Denna fil samlar alla miljövariabler och konfigurationsinställningar
 * på ett ställe med korrekt typning för att förbättra säkerhet och underhållbarhet.
 */

import path from 'path';
import dotenv from 'dotenv';
import { FetchError } from 'node-fetch';

// Globalt debug-läge
export const DEBUG = false;

/**
 * Miljövariabler med typning
 */
export interface EnvironmentConfig {
  // WordPress-relaterade inställningar
  WORDPRESS_URL?: string;
  WORDPRESS_USERNAME?: string;
  WORDPRESS_APP_PASSWORD?: string;
  WP_USERNAME?: string; // Alternativt namn
  WP_APP_PASSWORD?: string; // Alternativt namn
  
  // Webbformulär-inställningar
  PUBLIC_WEB3FORMS_ACCESS_KEY?: string;
  
  // Servermiljö
  NODE_ENV: 'development' | 'production' | 'test';
  
  // Övriga inställningar
  [key: string]: string | undefined;
}

/**
 * Laddar miljövariabler från .env-filer baserat på aktuell miljö
 */
export function loadEnv(): void {
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
        if (DEBUG) console.warn(`[ENV_DEBUG] Could not load ${file}:`, result.error);
      } else {
        if (DEBUG) console.log(`[ENV_DEBUG] Loaded environment from ${file}`);
      }
    } catch (error) {
      if (DEBUG) console.warn(`[ENV_DEBUG] Error loading ${file}:`, error);
    }
  });
}

/**
 * Hämtar typade miljövariabler
 */
export function getEnv(): EnvironmentConfig {
  return process.env as unknown as EnvironmentConfig;
}

/**
 * Hämtar WordPress URL med typkontroll
 */
export function getWordPressUrl(): string {
  const wpUrl = process.env.WORDPRESS_URL;
  
  if (!wpUrl) {
    throw new Error('WordPress URL is not defined in environment variables');
  }
  
  if (DEBUG) {
    console.log(`[WORDPRESS_URL_DEBUG] Using WordPress URL: ${wpUrl}`);
  }
  
  return wpUrl;
}

/**
 * Centraliserad felhantering och loggning
 */
export function logDetailedError(context: string, error: unknown): void {
  console.error(`[API_ERROR] ${context}`);
  
  if (error instanceof Error) {
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    
    // Kontrollera om det är ett fetch-fel med ytterligare detaljer
    if (error instanceof FetchError) {
      console.error('Fetch Error Code:', (error as FetchError).code);
      console.error('Fetch Error Type:', (error as FetchError).type);
    }
    
    // Logga stackspårning i utvecklingsmiljö för felsökning
    if (process.env.NODE_ENV !== 'production' && error.stack) {
      console.error('Stack Trace:', error.stack);
    }
  } else {
    console.error('Unknown error object:', error);
  }
}

/**
 * Säkerhetsrelaterade konfigurationer
 */
export const securityConfig = {
  // Lista över miljövariabler som är säkra att exponera till klienten
  // Används i astro.config.mjs
  safeClientEnvVars: [
    'PUBLIC_WEB3FORMS_ACCESS_KEY'
  ]
};

// Automatiskt ladda miljövariabler när denna modul importeras
loadEnv();
