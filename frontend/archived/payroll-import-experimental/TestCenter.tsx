/**
 * 薪资导入测试中心
 * 统一的测试模块入口，提供所有测试组件的导航和说明
 */

import React, { useState } from 'react';
import { MonthSelector } from './config/MonthSelector';
import { DataGroupSelector } from './config/DataGroupSelector';
import { ImportConfigDemo } from './config/ImportConfigDemo';
import { ImportStateDemo } from './hooks/ImportStateDemo';
import { FileProcessorDemo } from './hooks/FileProcessorDemo';
import { IntegratedImportDemo } from './integration/IntegratedImportDemo';
import { PerformanceTestSuite } from './integration/PerformanceTestSuite';
import { ImportDataGroup } from '@/types/payroll-import';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';

/**
 * 测试模块配置
 */
interface TestModule {
  id: string;
  name: string;
  description: string;
  category: 'component' | 'hook' | 'integration' | 'performance';
  difficulty: '基础' | '中级' | '高级';
  component: React.ComponentType;
  features: string[];
  usageInstructions: string[];
}

/**
 * 测试模块定义
 */
const testModules: TestModule[] = [
  {
    id: 'month-selector',
    name: 'MonthSelector 月份选择器',
    description: '专门为薪资导入设计的月份选择组件，支持可用月份显示和验证',
    category: 'component',
    difficulty: '基础',
    component: () => (
      <MonthSelector
        selectedMonth="2025-01"
        onMonthChange={(month) => console.log('选择月份:', month)}
        availableMonths={[
          { month: '2025-01', payrollCount: 150, hasData: true, hasPeriod: true },
          { month: '2025-02', payrollCount: 145, hasData: true, hasPeriod: false },
          { month: '2024-12', payrollCount: 160, hasData: true, hasPeriod: true }
        ]}
      />
    ),
    features: ['月份选择', '可用性验证', '数据统计显示', '响应式设计'],
    usageInstructions: [
      '1. 点击月份选择器查看可用月份',
      '2. 观察每个月份的数据统计信息',
      '3. 选择不同月份查看状态变化',
      '4. 注意不可选月份的禁用状态'
    ]
  },
  
  {
    id: 'data-group-selector',
    name: 'DataGroupSelector 数据组选择器',
    description: '多选数据组组件，支持薪资、社保、人员类别等数据类型选择',
    category: 'component',
    difficulty: '基础',
    component: () => (
      <DataGroupSelector
        selectedDataGroups={[ImportDataGroup.EARNINGS]}
        onGroupToggle={(group) => console.log('切换数据组:', group)}
        onSelectAllGroups={() => console.log('全选/取消全选')}
      />
    ),
    features: ['多选支持', '图标展示', '全选功能', '状态反馈'],
    usageInstructions: [
      '1. 点击各个数据组进行选择/取消',
      '2. 使用"全选"按钮快速选择所有组',
      '3. 观察选中状态的视觉反馈',
      '4. 查看每个数据组的图标和描述'
    ]
  },

  {
    id: 'import-config-demo',
    name: 'ImportConfigDemo 配置集成演示',
    description: 'MonthSelector和DataGroupSelector协同工作的完整演示',
    category: 'component',
    difficulty: '中级',
    component: ImportConfigDemo,
    features: ['组件集成', '配置验证', '错误提示', '状态同步'],
    usageInstructions: [
      '1. 设置月份和数据组选择',
      '2. 观察配置验证结果',
      '3. 查看错误和警告提示',
      '4. 体验组件间的状态同步'
    ]
  },

  {
    id: 'import-state-demo',
    name: 'useImportState Hook 演示',
    description: '集中化状态管理Hook的完整功能演示，包含25+个API方法',
    category: 'hook',
    difficulty: '高级',
    component: ImportStateDemo,
    features: ['状态管理', '配置操作', '进度跟踪', '验证逻辑', 'API演示'],
    usageInstructions: [
      '1. 使用测试控制面板快速设置状态',
      '2. 观察各种状态的实时变化',
      '3. 测试文件上传和验证功能',
      '4. 查看Hook提供的25+个API方法',
      '5. 模拟进度更新查看动画效果'
    ]
  },

  {
    id: 'file-processor-demo',
    name: 'useFileProcessor Hook 演示',
    description: 'Excel文件解析和数据处理Hook的完整演示',
    category: 'hook',
    difficulty: '高级',
    component: FileProcessorDemo,
    features: ['文件解析', '数据提取', '一致性检查', '错误处理', '统计分析'],
    usageInstructions: [
      '1. 上传Excel文件(.xlsx或.xls格式)',
      '2. 观察文件解析的实时进度',
      '3. 查看工作表详情和数据预览',
      '4. 检查数据一致性验证结果',
      '5. 查看员工数据和统计信息'
    ]
  },

  {
    id: 'integrated-demo',
    name: 'Hook集成测试',
    description: 'useImportState和useFileProcessor协同工作的完整测试',
    category: 'integration',
    difficulty: '高级',
    component: IntegratedImportDemo,
    features: ['Hook协同', '端到端流程', '状态同步', '自动化测试', '实时监控'],
    usageInstructions: [
      '1. 点击"开始集成测试"启动流程',
      '2. 或选择预设的自动化测试场景',
      '3. 观察5步测试流程的状态变化',
      '4. 查看Hook状态对比和同步情况',
      '5. 监控错误汇总和数据匹配度'
    ]
  },

  {
    id: 'performance-suite',
    name: '性能测试套件',
    description: '全面的性能压力测试，包含内存监控和处理速率分析',
    category: 'performance',
    difficulty: '高级',
    component: PerformanceTestSuite,
    features: ['性能监控', '内存分析', '压力测试', '基准测试', '优化建议'],
    usageInstructions: [
      '1. 查看系统信息了解运行环境',
      '2. 选择单个测试场景或运行全部测试',
      '3. 观察实时的性能指标监控',
      '4. 查看测试结果详情和统计',
      '5. 根据性能建议进行优化'
    ]
  }
];

/**
 * 测试中心主组件
 */
export const TestCenter: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 按分类筛选模块
  const filteredModules = testModules.filter(module => 
    selectedCategory === 'all' || module.category === selectedCategory
  );

  // 获取分类统计
  const getCategoryStats = () => {
    const stats = {
      all: testModules.length,
      component: testModules.filter(m => m.category === 'component').length,
      hook: testModules.filter(m => m.category === 'hook').length,
      integration: testModules.filter(m => m.category === 'integration').length,
      performance: testModules.filter(m => m.category === 'performance').length,
    };
    return stats;
  };

  const stats = getCategoryStats();

  // 获取难度颜色
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '基础': return 'badge-success';
      case '中级': return 'badge-warning';
      case '高级': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'component': return '🧩';
      case 'hook': return '🔧';
      case 'integration': return '🔗';
      case 'performance': return '⚡';
      default: return '📋';
    }
  };

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-base-content mb-4">
            🧪 薪资导入测试中心
          </h1>
          <p className="text-lg text-base-content/70 mb-2">
            完整的模块化重构测试套件 - 从基础组件到性能压力测试
          </p>
          <p className="text-base-content/60">
            7个测试模块 | 1500+行测试代码 | 企业级测试覆盖
          </p>
        </div>

        {/* 快速导航 */}
        <div className={cn(cardEffects.elevated, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">快速导航</h2>
          
          {/* 分类选择器 */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory('all')}
            >
              全部 ({stats.all})
            </button>
            <button
              className={`btn btn-sm ${selectedCategory === 'component' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory('component')}
            >
              🧩 基础组件 ({stats.component})
            </button>
            <button
              className={`btn btn-sm ${selectedCategory === 'hook' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory('hook')}
            >
              🔧 Hook测试 ({stats.hook})
            </button>
            <button
              className={`btn btn-sm ${selectedCategory === 'integration' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory('integration')}
            >
              🔗 集成测试 ({stats.integration})
            </button>
            <button
              className={`btn btn-sm ${selectedCategory === 'performance' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory('performance')}
            >
              ⚡ 性能测试 ({stats.performance})
            </button>
          </div>

          {/* 模块列表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredModules.map((module) => (
              <div
                key={module.id}
                className={`card bg-base-200 cursor-pointer transition-all hover:shadow-lg ${
                  selectedModule === module.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedModule(selectedModule === module.id ? '' : module.id)}
              >
                <div className="card-body p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getCategoryIcon(module.category)}</span>
                      <h3 className="card-title text-lg">{module.name}</h3>
                    </div>
                    <span className={`badge ${getDifficultyColor(module.difficulty)} badge-sm`}>
                      {module.difficulty}
                    </span>
                  </div>
                  
                  <p className="text-sm text-base-content/70 mb-4">
                    {module.description}
                  </p>
                  
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm mb-2">核心功能:</h4>
                    <div className="flex flex-wrap gap-1">
                      {module.features.slice(0, 3).map((feature, index) => (
                        <span key={index} className="badge badge-outline badge-xs">
                          {feature}
                        </span>
                      ))}
                      {module.features.length > 3 && (
                        <span className="badge badge-ghost badge-xs">
                          +{module.features.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="card-actions justify-between items-center">
                    <span className="text-xs text-base-content/50">
                      点击展开详细测试
                    </span>
                    <div className={`transform transition-transform ${
                      selectedModule === module.id ? 'rotate-180' : ''
                    }`}>
                      ▼
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 选中模块的详细信息和使用说明 */}
        {selectedModule && (() => {
          const module = testModules.find(m => m.id === selectedModule);
          if (!module) return null;

          return (
            <div className={cn(cardEffects.primary, 'p-6')}>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{getCategoryIcon(module.category)}</span>
                <div>
                  <h2 className="text-2xl font-bold">{module.name}</h2>
                  <p className="text-base-content/70">{module.description}</p>
                </div>
                <span className={`badge ${getDifficultyColor(module.difficulty)} ml-auto`}>
                  {module.difficulty}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* 使用说明 */}
                <div>
                  <h3 className="text-lg font-bold mb-4">📖 使用说明</h3>
                  <div className="space-y-2">
                    {module.usageInstructions.map((instruction, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <span className="badge badge-primary badge-sm mt-1">{index + 1}</span>
                        <span className="text-sm">{instruction}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 功能特性 */}
                <div>
                  <h3 className="text-lg font-bold mb-4">✨ 功能特性</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {module.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 测试组件渲染区域 */}
              <div className="bg-base-100 rounded-lg p-6 border-2 border-dashed border-base-300">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">🎮 交互测试区域</h3>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setSelectedModule('')}
                  >
                    收起
                  </button>
                </div>
                
                <div className="min-h-96">
                  {React.createElement(module.component)}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 使用指南 */}
        <div className={cn(cardEffects.accent, 'p-6')}>
          <h2 className="text-xl font-bold mb-4">💡 使用指南</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h4 className="font-semibold mb-2">🧩 基础组件测试</h4>
              <p className="text-sm text-base-content/70">
                从简单的组件开始，了解基础功能和交互方式。适合初学者和功能验证。
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">🔧 Hook功能测试</h4>
              <p className="text-sm text-base-content/70">
                深入测试Hook的状态管理和数据处理能力。包含完整的API演示和边界情况测试。
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">🔗 集成协同测试</h4>
              <p className="text-sm text-base-content/70">
                验证多个模块的协同工作能力。测试端到端流程和状态同步机制。
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">⚡ 性能压力测试</h4>
              <p className="text-sm text-base-content/70">
                评估系统在各种负载下的表现。包含内存监控、处理速率和优化建议。
              </p>
            </div>
          </div>
          
          <div className="alert alert-info mt-6">
            <span className="text-sm">
              💡 <strong>建议测试顺序:</strong> 基础组件 → Hook功能 → 集成测试 → 性能测试。
              每个模块都有详细的使用说明和交互指南。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCenter;