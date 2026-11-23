/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { pageHeaders, SECURITY_HEADERS } from './config/security-headers.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // The browser calls `/api` on the dev server; no CORS involved.
      proxy: { '/api': env.API_PROXY_TARGET ?? 'http://localhost:3100' },
      // No CSP here: the dev server injects inline scripts (React Refresh).
      headers: SECURITY_HEADERS,
    },
    // The build with the production headers, CSP included; it proxies `/api` as the dev server does.
    preview: {
      port: 4173,
      headers: pageHeaders(env.VITE_API_URL),
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
