// Environment validation
const requiredEnvVars = [
  'VITE_API_BASE_URL'
] as const;

const _optionalEnvVars = [
  'VITE_APP_NAME',
  'VITE_ENVIRONMENT'
] as const;

// Validate required environment variables
const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !import.meta.env[envVar]
);

if (missingEnvVars.length > 0 && import.meta.env.PROD) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

// Environment configuration
// Normalize the API base URL: remove trailing slashes and any trailing '/api'
function normalizeBaseUrl(raw?: string) {
  const fallback = 'https://primepre-logistics-system.onrender.com';
  const value = (raw || fallback).replace(/\/+$/, '');
  // If the user accidentally set the base url to include '/api', strip it so
  // endpoints like '/api/cargo/...' don't become '/api/api/cargo/...'
  if (value.toLowerCase().endsWith('/api')) {
    return value.slice(0, -4).replace(/\/+$/, '');
  }
  return value;
}

export const config = {
  // API Configuration
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  
  // App Configuration
  appName: import.meta.env.VITE_APP_NAME || 'PrimePre Logistics',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // Feature flags
  features: {
    enableDevTools: import.meta.env.DEV,
    enableErrorReporting: import.meta.env.PROD,
  }
} as const;

export type Config = typeof config;