import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend port 3000 | Backend port 5000
const FRONTEND_PORT = 3000;
const BACKEND_PORT = 5000;

export default defineConfig({
  plugins: [react()],
  server: {
    port: FRONTEND_PORT,
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${BACKEND_PORT}`
    }
  },
  preview: {
    port: 4173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
