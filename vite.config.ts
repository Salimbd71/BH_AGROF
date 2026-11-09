import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {pwaPlugin} from './scripts/pwa-plugin.ts';

/**
 * দুটো আলাদা সাইট একই কোড থেকে বিল্ড হয়:
 *   npm run build:sr     -> dist/sr     (এসআর/ইউজার সাইট)
 *   npm run build:admin  -> dist/admin  (অ্যাডমিন সাইট)
 * mode-এর নাম (sr / admin) দিয়েই কোড বুঝে নেয় কোন সাইট বিল্ড হচ্ছে।
 * PWA (manifest + অফলাইন service worker) পাশাপাশি বিল্ড হয়: scripts/pwa-plugin.ts
 */
export default defineConfig(({mode}) => {
  const site = mode === 'admin' ? 'admin' : 'sr';
  return {
    base: './',
    plugins: [react(), tailwindcss(), pwaPlugin(site)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: `dist/${site}`,
      emptyOutDir: true,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
