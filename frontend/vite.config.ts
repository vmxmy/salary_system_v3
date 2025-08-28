import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(), 
    react(),
    // Conditional compression based on memory constraints
    ...(process.env.VITE_MINIMAL_BUILD ? [
      // Only Gzip for minimal builds to reduce memory usage
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 2048, // Higher threshold for minimal builds
        deleteOriginFile: false,
        verbose: false // Disable verbose to reduce memory
      })
    ] : [
      // Full compression for normal builds
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
      })
    ]),
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
    port: 5175,
    // Enable compression on dev server for testing
    ...(process.env.NODE_ENV === 'development' && {
      compress: true
    })
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Enable source maps for better debugging (disabled in production for size)
    sourcemap: process.env.NODE_ENV === 'development',
    // Increase chunk size warning limit
    chunkSizeWarningLimit: process.env.VITE_MINIMAL_BUILD ? 400 : 600,
    // CSS code splitting (disable for minimal builds to reduce memory usage)
    cssCodeSplit: !process.env.VITE_MINIMAL_BUILD,
    // Minification settings
    minify: process.env.VITE_MINIMAL_BUILD ? 'esbuild' : 'terser', // esbuild is faster and uses less memory
    // Reduce memory usage in low-memory environments
    ...(process.env.VITE_MINIMAL_BUILD && {
      // Limit parallel builds to reduce memory pressure
      rollupOptions: {
        // Reduce memory usage with smaller chunks
        output: {
          maxParallelFileOps: 2, // Limit parallel file operations
          // Smaller manual chunks for minimal builds
          manualChunks: {
            'vendor-core': ['react', 'react-dom'],
            'vendor-router': ['react-router-dom'],
            'vendor-data': ['@tanstack/react-query', '@supabase/supabase-js'],
            'vendor-ui': ['framer-motion'],
          }
        }
      }
    }),
    rollupOptions: {
      // External dependencies that should be loaded from CDN in production
      ...(process.env.VITE_USE_CDN === 'true' && {
        external: ['react', 'react-dom'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM'
          }
        }
      }),
      output: {
        // Better chunk naming for caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          // Separate Excel libraries into their own chunks for lazy loading
          'excel-libs': ['xlsx', 'exceljs'],
          // Charts in separate chunk
          'charts': ['recharts'],
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI and styling - split by size
          'ui-framer': ['framer-motion'], // Large animation library
          'ui-icons': ['@heroicons/react', 'lucide-react'], // Icon libraries
          // Data fetching and state
          'data-vendor': ['@tanstack/react-query', '@supabase/supabase-js', 'zustand'],
          // i18n
          'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // Utilities and smaller dependencies
          'utils': ['date-fns', 'clsx', 'tailwind-merge'],
          // Markdown and text processing
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
