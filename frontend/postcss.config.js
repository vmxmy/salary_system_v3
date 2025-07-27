export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {
      // 忽略 color-adjust 警告，因为这是 DaisyUI 内部的遗留代码
      ignoreUnknownVersions: true,
    },
  },
} 