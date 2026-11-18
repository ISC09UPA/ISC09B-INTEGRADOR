import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { servidorDemo } from './demo/servidor';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const demo = env.VITE_DEMO === '1';
  return {
    plugins: [react(), ...(demo ? [servidorDemo()] : [])],
    server: { port: 5173, strictPort: true },
    preview: { port: 4173 },
    build: {
      chunkSizeWarningLimit: 1200,
    },
  };
});
