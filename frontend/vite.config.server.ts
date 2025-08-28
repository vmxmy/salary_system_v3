import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// 内存优化的服务器构建配置 - 1.2G 内存环境专用
// 这个配置专门为生产服务器的低内存环境设计
export default defineConfig({
  plugins: [
    tailwindcss(), 
    react({
      // 轻量化React配置，保持基本功能
      babel: {
        plugins: [],
        presets: [],
      },
    }),
  ],
  server: {
    port: 5175,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // 关闭源码映射以节省内存
    sourcemap: false,
    
    // 增加chunk大小警告限制，减少分割
    chunkSizeWarningLimit: 1500,
    
    // 关闭CSS代码分割，减少内存使用
    cssCodeSplit: false,
    
    // 使用 esbuild 进行更快、更少内存的压缩
    minify: 'esbuild',
    
    // 服务器环境优化设置 - 温和的内存优化
    rollupOptions: {
      // 合理控制并行操作
      output: {
        // 严格限制并行操作以节省内存 (需求 1.4)
        maxParallelFileOps: 1, // 1.2G 内存环境下最保守的设置
        
        // 优化的代码分割策略
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React生态系统
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-core';
            }
            if (id.includes('react-router') || id.includes('@tanstack/react')) {
              return 'react-utils';
            }
            // Supabase相关
            if (id.includes('@supabase') || id.includes('supabase')) {
              return 'supabase';
            }
            // UI库
            if (id.includes('lucide') || id.includes('heroicons') || id.includes('framer-motion')) {
              return 'ui-libs';
            }
            // 工具库
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('zod')) {
              return 'utils';
            }
            // 大型库单独分割
            if (id.includes('xlsx') || id.includes('exceljs')) {
              return 'excel-libs';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            // 其他第三方库
            return 'vendor';
          }
          // 应用代码按功能模块分割
          if (id.includes('/pages/')) {
            return 'pages';
          }
          if (id.includes('/components/')) {
            return 'components';
          }
          return 'app';
        },
        
        // 简化文件名，减少内存占用
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js', 
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      
      // 输入配置优化
      treeshake: {
        // 积极的 tree-shaking
        moduleSideEffects: false,
        unknownGlobalSideEffects: false,
        tryCatchDeoptimization: false,
      },
      
      // 内存优化配置
      cache: false, // 禁用缓存以节省内存
      preserveEntrySignatures: 'strict',
    },
    
    // 目标配置，优化兼容性vs大小
    target: 'es2018', // 较新的目标，减少polyfill
    
    // 压缩配置优化
    terserOptions: undefined, // 不使用terser，使用esbuild
    
    // 关闭报告以节省内存
    reportCompressedSize: false,
    
    // 写入文件配置
    write: true,
    emptyOutDir: true,
  },
  
  // 优化依赖处理
  optimizeDeps: {
    // 最小化预构建依赖
    include: [
      'react',
      'react-dom',
    ],
    // 排除大型库，让它们在运行时加载
    exclude: [
      'xlsx',
      'exceljs',
      'recharts', // 图表库较大，延迟加载
      'framer-motion', // 动画库较大
    ],
    // 强制优化某些依赖
    force: false, // 不强制重新优化，节省时间和内存
  },
  
  // ESBuild配置优化
  esbuild: {
    // 移除控制台日志以减少bundle大小
    drop: ['console', 'debugger'],
    // 优化构建
    legalComments: 'none',
    // 减少内存使用
    minifyWhitespace: true,
    minifyIdentifiers: true,
    minifySyntax: true,
  },
  
  // 实验性特性
  experimental: {
    // 禁用实验性特性以减少内存使用
    renderBuiltUrl: undefined,
  },
  
  // 定义全局常量，减少运行时判断
  define: {
    __DEV__: false,
    'process.env.NODE_ENV': '"production"',
  },
})