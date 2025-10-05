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
export const config = {
  // API Configuration
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || 'https://primepre-backend.onrender.com').replace(/\/+$/, ''),
  
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