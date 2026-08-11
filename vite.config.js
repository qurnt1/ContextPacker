import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  plugins: [react()],
  base: '/ContextPacker/',
  build: {
    // The o200k_base rank table is intentionally kept in an on-demand chunk.
    chunkSizeWarningLimit: 2500,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
