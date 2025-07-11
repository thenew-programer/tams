import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    hmr: {
      port: 24678,
    },
    host: true,
    port: 5173
  },
  define: {
    global: 'globalThis',
  }
});
