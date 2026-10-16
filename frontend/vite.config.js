import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let basePath = env.BASE_PATH || process.env.BASE_PATH || '/network-management/8001/';
  if (!basePath.endsWith('/')) {
    basePath += '/';
  }
  return {
    plugins: [react()],
    base: basePath,
    server: {
      port: 5173,
      watch: {
        usePolling: true,
      },
    },
  };
});

