import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// 检测构建模式
const isLowMemoryBuild = process.env.VITE_LOW_MEMORY === 'true' || process.env.NODE_OPTIONS?.includes('--max-old-space-size=1000')
const isMinimalBuild = process.env.VITE_MINIMAL_BUILD === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(), 
    react({
      // 低内存模式下优化 React 插件配置
      ...(isLowMemoryBuild && {
        babel: {
          plugins: [],
          presets: [],
        },
      }),
    }),
    // 低内存模式下的内存监控插件
    ...(isLowMemoryBuild ? [{
      name: 'memory-monitor',
      buildStart() {
        if (process.env.NODE_ENV === 'production') {
          console.log('🔧 Low memory build mode activated');
          console.log(`📊 Node.js memory limit: ${process.env.NODE_OPTIONS}`);
        }
      },
      generateBundle() {
        if (global.gc) {
          global.gc();
          console.log('🧹 Forced garbage collection');
        }
      }
    }] : []),
    // Conditional compression based on memory constraints
    ...((isMinimalBuild || isLowMemoryBuild) ? [
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
    sourcemap: process.env.NODE_ENV === 'development' && !isLowMemoryBuild,
    // Increase chunk size warning limit - 低内存模式接受稍大的chunk以保持稳定性
    chunkSizeWarningLimit: isLowMemoryBuild ? 500 : (isMinimalBuild ? 400 : 600),
    // CSS code splitting (disable for minimal/low-memory builds to reduce memory usage)
    cssCodeSplit: !(isMinimalBuild || isLowMemoryBuild),
    // Minification settings - 低内存模式优先使用 esbuild
    minify: (isMinimalBuild || isLowMemoryBuild) ? 'esbuild' : 'terser', // esbuild is faster and uses less memory
    // 低内存模式下禁用压缩大小报告
    reportCompressedSize: !isLowMemoryBuild,
    // 低内存模式下的目标配置
    target: isLowMemoryBuild ? 'es2018' : 'es2015',
    // 确保资源内联限制合理，避免过度内联导致MIME类型问题
    assetsInlineLimit: isLowMemoryBuild ? 2048 : 4096, // 低内存模式降低内联限制
    // 低内存环境下的特殊配置
    ...((isMinimalBuild || isLowMemoryBuild) && {
      // ESBuild 配置优化
      esbuild: {
        drop: ['console', 'debugger'],
        legalComments: 'none',
        minifyWhitespace: true,
        minifyIdentifiers: true,
        minifySyntax: true,
      },
    }),
    rollupOptions: {
      // External dependencies that should be loaded from CDN in production
      ...(process.env.VITE_USE_CDN === 'true' && {
        external: ['react', 'react-dom'],
      }),
      // 低内存模式下的优化配置
      ...(isLowMemoryBuild && {
        // 使用有限缓存而非完全禁用，避免文件类型识别问题
        cache: true,
        maxParallelFileReads: 2, // 限制并发文件读取
        treeshake: {
          // 保留一些关键的副作用检测，确保模块正确性
          moduleSideEffects: 'no-external',
          unknownGlobalSideEffects: false,
          tryCatchDeoptimization: false,
        },
        preserveEntrySignatures: 'exports-only', // 更宽松的签名保留
        // 移除实验性配置以提高稳定性
      }),
      output: {
        // CDN globals configuration
        ...(process.env.VITE_USE_CDN === 'true' && {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM'
          }
        }),
        // Better chunk naming for caching - 确保正确的文件扩展名
        entryFileNames: (chunkInfo) => {
          return `assets/${chunkInfo.name}-[hash].js`;
        },
        chunkFileNames: (chunkInfo) => {
          return `assets/${chunkInfo.name}-[hash].js`;
        },
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // 注意: maxParallelFileOps 在新版本 Rollup 中已移除，使用其他方式限制并发
        // 手动代码分割策略 (需求 1.5) - 平衡的分割策略，保持模块完整性
        manualChunks: isLowMemoryBuild ? 
          // 低内存模式：保守但有效的分割，确保模块完整性
          (id) => {
            if (id.includes('node_modules')) {
              // React 生态系统 - 保持核心模块完整
              if (id.includes('react-dom')) return 'react-dom';
              if (id.includes('react/') || id.includes('react\\')) return 'react';
              if (id.includes('react-router')) return 'react-router';
              if (id.includes('@tanstack/react-query')) return 'react-query';
              
              // 大型库单独分离但保持完整性
              if (id.includes('exceljs')) return 'excel-advanced';
              if (id.includes('xlsx')) return 'excel-xlsx';
              if (id.includes('recharts')) return 'charts';
              if (id.includes('framer-motion')) return 'framer';
              
              // Supabase 相关
              if (id.includes('@supabase') || id.includes('supabase')) return 'supabase';
              
              // UI 库
              if (id.includes('@heroicons') || id.includes('lucide-react')) return 'icons';
              
              // i18n 相关
              if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
              
              // 工具库
              if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('zod')) return 'utils';
              
              // 其他第三方库
              return 'vendor';
            }
            
            // 应用代码按功能模块分离
            if (id.includes('/pages/')) {
              if (id.includes('/pages/admin/')) return 'pages-admin';
              if (id.includes('/pages/payroll/')) return 'pages-payroll';
              if (id.includes('/pages/reports/')) return 'pages-reports';
              return 'pages';
            }
            
            if (id.includes('/components/')) {
              if (id.includes('/components/payroll/')) return 'components-payroll';
              if (id.includes('/components/admin/')) return 'components-admin';
              if (id.includes('/components/ui/')) return 'components-ui';
              return 'components';
            }
            
            if (id.includes('/hooks/')) return 'hooks';
            if (id.includes('/services/')) return 'services';
            if (id.includes('/utils/')) return 'app-utils';
            
            return 'app';
          } :
          // 标准模式：平衡的分割策略
          {
            // 分离 Excel 库到独立 chunks 以支持真正的懒加载
            'excel-core': ['xlsx'], // 轻量级 Excel 库 (~400KB)
            'excel-advanced': ['exceljs'], // 高级 Excel 功能 (~800KB)
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
    include: isLowMemoryBuild ? [
      // 低内存模式：只预构建最核心的依赖
      'react',
      'react-dom',
    ] : [
      // 标准模式：预构建常用依赖
      'react',
      'react-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js'
    ],
    exclude: [
      // Keep Excel libraries separate for lazy loading
      'xlsx',
      'exceljs',
      // 低内存模式下排除更多大型库
      ...(isLowMemoryBuild ? [
        'recharts',
        'framer-motion',
        'react-markdown',
        'remark-gfm',
        'rehype-highlight',
        'rehype-raw'
      ] : [])
    ],
    // 低内存模式下不强制重新优化
    force: !isLowMemoryBuild,
  },
  
  // 低内存模式下的额外配置
  ...(isLowMemoryBuild && {
    // 定义全局常量，减少运行时判断
    define: {
      __DEV__: false,
      'process.env.NODE_ENV': '"production"',
      'process.env.VITE_LOW_MEMORY': '"true"',
    },
    // 实验性特性配置
    experimental: {
      renderBuiltUrl: undefined,
    },
  })
})
