import { config } from '@/lib/config';

const rawBaseUrl = (config.apiBaseUrl || '').trim();
const normalizedBaseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;

/**
 * Build an absolute API URL from the configured base and a relative path.
 * Handles cases where the base already contains path segments (e.g. `/api`).
 */
export const buildApiUrl = (path: string): string => {
  const baseUrl = new URL(normalizedBaseUrl);
  const basePath = baseUrl.pathname.replace(/^\/+|\/+$/g, '');
  let safePath = (path ?? '').toString().replace(/^\/+/, '');

  if (basePath) {
    if (safePath === basePath) {
      safePath = '';
    } else if (safePath.startsWith(`${basePath}/`)) {
      safePath = safePath.slice(basePath.length + 1);
    }
  }

  try {
    return new URL(safePath, normalizedBaseUrl).toString();
  } catch (error) {
    console.error('[buildApiUrl] Failed to build URL', { path: safePath, normalizedBaseUrl, error });
    const base = normalizedBaseUrl.replace(/\/+$/, '');
    return `${base}/${safePath}`;
  }
};
