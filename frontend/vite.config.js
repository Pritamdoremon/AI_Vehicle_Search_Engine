import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local: frontend 3000 → backend 5000
// Render Web Service: uses process.env.PORT and must bind 0.0.0.0
const FRONTEND_PORT = Number(process.env.PORT) || 3000;
const BACKEND_PORT = 5000;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: FRONTEND_PORT,
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${BACKEND_PORT}`
    }
  },
  preview: {
    host: '0.0.0.0',
    port: FRONTEND_PORT,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
