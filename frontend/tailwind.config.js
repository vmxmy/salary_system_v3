/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Design Tokens - Color System
      colors: {
        // Surface & Background Layers
        'bg-page': 'hsl(var(--bg-page))',
        'bg-surface': 'hsl(var(--bg-surface))',
        'bg-surface-raised': 'hsl(var(--bg-surface-raised))',
        'bg-interactive': 'hsl(var(--bg-interactive))',
        'bg-interactive-hover': 'hsl(var(--bg-interactive-hover))',
        
        // Text & Content
        'text-primary': 'hsl(var(--text-primary))',
        'text-secondary': 'hsl(var(--text-secondary))',
        'text-tertiary': 'hsl(var(--text-tertiary))',
        'text-placeholder': 'hsl(var(--text-placeholder))',
        'text-disabled': 'hsl(var(--text-disabled))',
        
        // Financial & Status Colors (Critical for HR/Payroll)
        'positive': 'hsl(var(--positive))',
        'positive-content': 'hsl(var(--positive-content))',
        'negative': 'hsl(var(--negative))',
        'negative-content': 'hsl(var(--negative-content))',
        'neutral-data': 'hsl(var(--neutral-data))',
        'warning': 'hsl(var(--warning))',
        'warning-content': 'hsl(var(--warning-content))',
        'info': 'hsl(var(--info))',
        'info-content': 'hsl(var(--info-content))',
        
        // Borders & Dividers
        'border-subtle': 'hsl(var(--border-subtle))',
        'border-default': 'hsl(var(--border-default))',
        'border-strong': 'hsl(var(--border-strong))',
      },
      
      // Professional Serif Typography - Elegant and Readable
      fontFamily: {
        'serif': ['Source Serif Pro', 'Noto Serif SC', 'Times New Roman', 'serif'],
        'serif-body': ['Crimson Text', 'Noto Serif SC', 'Georgia', 'serif'],
        'serif-chinese': ['Noto Serif SC', '宋体', 'SimSun', 'serif'],
        'mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'], // Fallback for specific UI components
      },
      
      fontSize: {
        // Serif-optimized type scale with enhanced readability
        'xs': ['0.75rem', { lineHeight: '1.6', letterSpacing: '0.02em' }],     // 12px
        'sm': ['0.875rem', { lineHeight: '1.7', letterSpacing: '0.015em' }],   // 14px
        'base': ['1rem', { lineHeight: '1.75', letterSpacing: '0.01em' }],     // 16px
        'lg': ['1.125rem', { lineHeight: '1.75', letterSpacing: '0.005em' }],  // 18px
        'xl': ['1.25rem', { lineHeight: '1.65', letterSpacing: '0' }],         // 20px
        '2xl': ['1.5rem', { lineHeight: '1.55', letterSpacing: '-0.01em' }],   // 24px
        '3xl': ['1.875rem', { lineHeight: '1.45', letterSpacing: '-0.02em' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '1.35', letterSpacing: '-0.03em' }],  // 36px
        '5xl': ['3rem', { lineHeight: '1.25', letterSpacing: '-0.04em' }],     // 48px
        '6xl': ['3.75rem', { lineHeight: '1.15', letterSpacing: '-0.05em' }],  // 60px
      },
      
      // Spacing System - Consistent rhythm
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
        '34': '8.5rem',   // 136px
        '38': '9.5rem',   // 152px
      },
      
      // Border Radius - Modern rounded corners
      borderRadius: {
        'sm': '0.25rem',   // 4px
        'DEFAULT': '0.375rem', // 6px
        'md': '0.5rem',    // 8px
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
        '2xl': '1.5rem',   // 24px
      },
      
      // Shadows - Subtle depth system
      boxShadow: {
        'subtle': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'soft': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'moderate': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'high': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      
      // Animation & Transitions
      transitionTimingFunction: {
        'bounce-gentle': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      
      // Responsive Breakpoints - Data-density optimized
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        'table-sm': '768px',  // Custom breakpoint for table responsive behavior
        'table-lg': '1200px', // Wide tables
      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
  
  // DaisyUI Configuration
  daisyui: {
    themes: [
      {
        // Custom Professional Theme for HR/Payroll System
        'salary-system': {
          'primary': 'hsl(var(--primary))',
          'primary-content': 'hsl(var(--primary-content))',
          'secondary': 'hsl(var(--secondary))',
          'secondary-content': 'hsl(var(--secondary-content))',
          'accent': 'hsl(var(--accent))',
          'accent-content': 'hsl(var(--accent-content))',
          'neutral': 'hsl(var(--neutral))',
          'neutral-content': 'hsl(var(--neutral-content))',
          'base-100': 'hsl(var(--bg-page))',
          'base-200': 'hsl(var(--bg-surface))',
          'base-300': 'hsl(var(--bg-surface-raised))',
          'base-content': 'hsl(var(--text-primary))',
          'info': 'hsl(var(--info))',
          'info-content': 'hsl(var(--info-content))',
          'success': 'hsl(var(--positive))',
          'success-content': 'hsl(var(--positive-content))',
          'warning': 'hsl(var(--warning))',
          'warning-content': 'hsl(var(--warning-content))',
          'error': 'hsl(var(--negative))',
          'error-content': 'hsl(var(--negative-content))',
        },
      },
      'light',
      'dark',
    ],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
    logs: true,
    rtl: false,
  },
} 