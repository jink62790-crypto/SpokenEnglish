import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Correctly handle the process.env.API_KEY replacement during build
      // We accept GEMINI_API_KEY, API_KEY, or GOOGLE_API_KEY to be flexible
      'process.env.API_KEY': JSON.stringify(
        env.GEMINI_API_KEY || 
        env.API_KEY || 
        env.GOOGLE_API_KEY ||
        env.REACT_APP_GEMINI_API_KEY
      ),
      // Add DeepSeek Key support with a fallback name to bypass Netlify "already exists" UI bugs
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(
        env.DEEPSEEK_API_KEY || 
        env.DEEPSEEK_KEY
      )
    }
  };
});