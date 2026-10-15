import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: env.BASE_PATH || process.env.BASE_PATH || '/',
    server: {
      port: 5173,
      watch: {
        usePolling: true,
      },
    },
  };
});

