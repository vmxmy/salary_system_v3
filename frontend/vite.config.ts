import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署配置
  base: process.env.NODE_ENV === 'production' 
    ? '/salary_system_v3/' // GitHub Pages 仓库名
    : '/',
  plugins: [
    tailwindcss(), 
    react(),
    // Compression plugins
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false,
      verbose: process.env.NODE_ENV === 'development'
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
      verbose: process.env.NODE_ENV === 'development'
    }),
    // Bundle analyzer for development
    ...(process.env.ANALYZE ? [
      visualizer({
        filename: 'dist/bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap' // sunburst, treemap, network
      })
    ] : [])
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
    // Enable source maps for better debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Standard chunk size warning limit
    chunkSizeWarningLimit: 500,
    // CSS code splitting enabled
    cssCodeSplit: true,
    // Use terser for better minification
    minify: 'terser',
    // Report compressed size
    reportCompressedSize: true,
    // Modern target
    target: 'es2020',
    // Standard assets inline limit
    assetsInlineLimit: 4096,
    rollupOptions: {
      // External dependencies that should be loaded from CDN in production
      ...(process.env.VITE_USE_CDN === 'true' && {
        external: ['react', 'react-dom'],
      }),
      output: {
        // CDN globals configuration
        ...(process.env.VITE_USE_CDN === 'true' && {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM'
          }
        }),
        // Better chunk naming for caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Manual chunk splitting for better caching
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Excel libraries
          'excel-core': ['xlsx'],
          'excel-advanced': ['exceljs'], 
          // Charts
          'charts': ['recharts'],
          // UI libraries
          'ui-framer': ['framer-motion'],
          'ui-icons': ['@heroicons/react', 'lucide-react'],
          // Data fetching and state
          'data-vendor': ['@tanstack/react-query', '@supabase/supabase-js', 'zustand'],
          // i18n
          'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // Utilities
          'utils': ['date-fns', 'clsx', 'tailwind-merge', 'zod'],
          // Markdown
          'markdown': ['react-markdown', 'remark-gfm', 'rehype-highlight', 'rehype-raw']
        }
      }
    }
  },
  // Optimize dependencies for better loading
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js'
    ],
    exclude: [
      // Keep Excel libraries separate for lazy loading
      'xlsx',
      'exceljs'
    ]
  }
})
