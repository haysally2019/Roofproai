import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' loads ALL env variables, regardless of prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // THIS IS THE CRITICAL FIX:
    define: {
      // This injects your key into the browser build
      'process.env.API_KEY': JSON.stringify(env.VITE_GOOGLE_GENAI_KEY),
      // Also injects it if you reference it by the specific name
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GOOGLE_GENAI_KEY),
      // Fixes potential "process is not defined" errors from the Google library
      'process.env': JSON.stringify({}),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});