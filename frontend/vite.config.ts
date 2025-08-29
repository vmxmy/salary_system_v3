import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  
  plugins: [
    tailwindcss(), 
    react()
  ],
  server: {
    port: 5175
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'data-vendor': ['@supabase/supabase-js', '@tanstack/react-query'],
          'utils': ['date-fns', 'clsx', 'tailwind-merge', 'zod']
        }
      }
    }
  }
})
