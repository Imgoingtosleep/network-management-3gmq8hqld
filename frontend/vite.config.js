import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/network-management/8001/',
  server: {
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
});
