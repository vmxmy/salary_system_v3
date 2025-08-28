import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5175
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Excel libraries into their own chunks for lazy loading
          'excel-libs': ['xlsx', 'exceljs'],
          // Charts in separate chunk
          'charts': ['recharts'],
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI and styling
          'ui-vendor': ['framer-motion', '@heroicons/react', 'lucide-react'],
          // Data fetching and state
          'data-vendor': ['@tanstack/react-query', '@supabase/supabase-js', 'zustand'],
          // i18n
          'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        }
      }
    }
  }
})
