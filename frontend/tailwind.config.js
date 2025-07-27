/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 默认字体 - 使用宋体作为主字体
        'sans': [
          '"Songti SC"', // macOS 宋体简体
          '"SimSun"', // Windows 宋体
          '"Times New Roman"', // 经典衬线字体
          'serif', // 兜底衬线字体
        ],
        // 无衬线中文字体栈（如果需要无衬线效果）
        'chinese': [
          '"PingFang SC"', // macOS 苹方简体（最佳中文字体）
          '"Hiragino Sans GB"', // macOS 华文细黑
          '"Microsoft YaHei"', // Windows 微软雅黑
          '"WenQuanYi Micro Hei"', // Linux 文泉驿微米黑
          '"Source Han Sans SC"', // 思源黑体（如果已安装）
          'sans-serif',
        ],
        // 中文衬线字体
        'chinese-serif': [
          '"Songti SC"', // macOS/iOS 宋体
          '"Source Han Serif SC"', // 思源宋体（如果已安装）
          '"SimSun"', // Windows 宋体
          '"FangSong"', // 仿宋体
          'serif',
        ],
        // 系统字体（推荐用于界面）
        'system': [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  // TailwindCSS 4: 所有 DaisyUI 配置都在 CSS 中，这里不需要任何插件配置
}