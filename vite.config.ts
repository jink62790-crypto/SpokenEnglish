import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(
        env.GEMINI_API_KEY || 
        env.API_KEY || 
        env.GOOGLE_API_KEY ||
        env.REACT_APP_GEMINI_API_KEY
      ),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(
        env.DEEPSEEK_API_KEY || 
        env.DEEPSEEK_KEY
      )
    },
    server: {
      proxy: {
        // Proxy local requests to Google during development
        '/google-api': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/google-api/, '')
        }
      }
    }
  };
});