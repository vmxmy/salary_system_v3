import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // 根据部署平台设置 base path
  base: process.env.VITE_BASE_PATH || '/', // 默认根路径，适用于 Docker 容器和大多数部署方式
  
  // Enable experimental features for React 19 compatibility
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react'
  },
  
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
    // Modern target compatible with React 19
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    // Standard assets inline limit
    assetsInlineLimit: 4096,
    // Additional build options for React 19 compatibility
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
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
        // Simplified chunk splitting to avoid module resolution issues
        manualChunks: {
          // React ecosystem - keep together to avoid ForwardRef issues
          'react-vendor': ['react', 'react-dom'],
          // Large libraries
          'data-vendor': ['@supabase/supabase-js', '@tanstack/react-query'],
          // Utilities
          'utils': ['date-fns', 'clsx', 'tailwind-merge', 'zod']
        }
      }
    }
  },
  // Optimize dependencies for better loading
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'framer-motion',
      '@heroicons/react/24/outline',
      'lucide-react',
      'recharts'
    ],
    exclude: [
      // Keep Excel libraries separate for lazy loading
      'xlsx',
      'exceljs'
    ],
    // Force React 19 compatibility
    force: true
  }
})
