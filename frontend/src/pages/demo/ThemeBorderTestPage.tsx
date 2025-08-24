import React, { useState } from 'react';
import { cardEffects } from '../../styles/design-effects';

const ThemeBorderTestPage: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState('cupcake');

  const themes = [
    'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate',
    'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden',
    'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black',
    'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade',
    'night', 'coffee', 'winter', 'dim', 'nord', 'sunset'
  ];

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  const cardVariants = [
    { key: 'default', label: '默认边框 (primary/8)', description: '最基础的统一主题色边框' },
    { key: 'standard', label: '标准边框 (primary/15)', description: '标准强度的主题色边框' },
    { key: 'emphasized', label: '强调边框 (primary/25)', description: '更明显的主题色边框' },
    { key: 'primary', label: '主题色边框 (primary/30)', description: '纯主题色强调边框' },
    { key: 'hover', label: '交互边框', description: '支持hover效果的边框' },
    { key: 'interactive', label: '互动边框', description: '带缩放效果的互动边框' },
    { key: 'gradient', label: '渐变边框', description: '主题色渐变边框效果' },
    { key: 'active', label: '活跃边框', description: '活跃状态的双层边框' }
  ];

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className={`${cardEffects.emphasized} p-6 mb-8`}>
          <h1 className="text-3xl font-bold mb-4">统一主题色边框测试</h1>
          <p className="text-base-content/70 mb-4">
            测试所有cardEffects在不同DaisyUI主题下的primary色边框效果。
            所有card现在都使用primary主题色作为边框基调，确保视觉一致性。
          </p>
          <p className="text-sm text-primary">
            当前主题: <strong>{currentTheme}</strong> | 
            Primary色值: <code className="ml-2 px-2 py-1 bg-base-300 rounded">hsl(var(--p))</code>
          </p>
        </div>

        {/* 主题选择器 */}
        <div className={`${cardEffects.standard} p-6 mb-8`}>
          <h2 className="text-xl font-semibold mb-4">选择测试主题</h2>
          <div className="flex flex-wrap gap-2">
            {themes.map(theme => (
              <button
                key={theme}
                onClick={() => handleThemeChange(theme)}
                className={`btn btn-sm ${currentTheme === theme ? 'btn-primary' : 'btn-outline'}`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        {/* 边框效果展示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cardVariants.map(({ key, label, description }) => (
            <div
              key={key}
              className={`${cardEffects[key as keyof typeof cardEffects]} p-6 min-h-[160px] flex flex-col justify-between`}
            >
              <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">
                  {label}
                </h3>
                <p className="text-sm text-base-content/70 mb-4">
                  {description}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="badge badge-primary badge-sm">
                  CSS类: {key}
                </div>
                <div className="text-xs font-mono text-base-content/60 bg-base-300/50 p-2 rounded">
                  {cardEffects[key as keyof typeof cardEffects].split(' ').slice(-3).join(' ')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 状态边框测试 */}
        <div className={`${cardEffects.standard} p-6 mt-8`}>
          <h2 className="text-xl font-semibold mb-4">状态边框测试</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {['success', 'warning', 'error', 'info'].map(status => (
              <div
                key={status}
                className={`${cardEffects[status as keyof typeof cardEffects]} p-4`}
              >
                <div className={`badge badge-${status} mb-2`}>{status}</div>
                <p className="text-sm">
                  状态边框 + primary底色环
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CSS变量实时显示 */}
        <div className={`${cardEffects.default} p-6 mt-8`}>
          <h2 className="text-xl font-semibold mb-4">当前主题CSS变量值</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-base-300/30 p-4 rounded-lg">
              <div className="text-sm font-medium mb-2">Primary (--p)</div>
              <div 
                className="w-full h-8 rounded border-2"
                style={{ 
                  backgroundColor: 'hsl(var(--p))',
                  borderColor: 'hsl(var(--p) / 0.3)'
                }}
              ></div>
            </div>
            <div className="bg-base-300/30 p-4 rounded-lg">
              <div className="text-sm font-medium mb-2">Primary/15</div>
              <div 
                className="w-full h-8 rounded border-2"
                style={{ 
                  backgroundColor: 'hsl(var(--p) / 0.15)',
                  borderColor: 'hsl(var(--p) / 0.3)'
                }}
              ></div>
            </div>
            <div className="bg-base-300/30 p-4 rounded-lg">
              <div className="text-sm font-medium mb-2">Primary/25</div>
              <div 
                className="w-full h-8 rounded border-2"
                style={{ 
                  backgroundColor: 'hsl(var(--p) / 0.25)',
                  borderColor: 'hsl(var(--p) / 0.3)'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* 使用指南 */}
        <div className={`${cardEffects.emphasized} p-6 mt-8`}>
          <h2 className="text-xl font-semibold mb-4">统一主题色边框使用指南</h2>
          <div className="prose prose-sm max-w-none">
            <ul className="space-y-2">
              <li><strong>default:</strong> 适用于一般内容容器，使用primary/8提供subtle的品牌色调</li>
              <li><strong>standard:</strong> 适用于重要内容区域，使用primary/15增强视觉层次</li>
              <li><strong>emphasized:</strong> 适用于需要强调的内容，使用primary/25突出显示</li>
              <li><strong>primary:</strong> 适用于关键操作区域，使用primary/30最强调边框</li>
              <li><strong>interactive:</strong> 适用于可交互元素，hover时边框颜色会增强</li>
              <li><strong>状态边框:</strong> 保持状态语义，但添加primary环增强一致性</li>
            </ul>
            <div className="mt-4 p-4 bg-primary/10 rounded-lg">
              <p className="text-sm">
                <strong>设计理念:</strong> 通过统一使用primary主题色作为边框基调，
                确保整个应用的视觉一致性，同时保持语义化的层次结构。
                在所有32+DaisyUI主题下都能提供和谐的视觉体验。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeBorderTestPage;