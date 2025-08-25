/**
 * 简化版薪资导入测试中心
 * 修复组件渲染问题的可靠版本
 */

import React, { useState } from 'react';
import { MonthSelector } from './config/MonthSelector';
import { DataGroupSelectorTest } from './DataGroupSelectorTest';
import { SimpleImportContextDemo } from './SimpleImportContextDemo';
import { FinalValidationTest } from './FinalValidationTest';
import { RealImportTest } from './RealImportTest';
import { DataTypeTestSuite } from './DataTypeTestSuite';
import { ImportDataGroup } from '@/types/payroll-import';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';
import { useAvailablePayrollMonths } from '@/hooks/payroll/useAvailablePayrollMonths';

/**
 * 测试模块配置
 */
interface TestModule {
  id: string;
  name: string;
  description: string;
  category: 'component' | 'hook' | 'integration' | 'performance';
  renderComponent: () => React.ReactElement;
  features: string[];
  usageInstructions: string[];
}

/**
 * 简化版测试中心组件
 */
export const SimpleTestCenter: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('2025-01');
  
  // 获取真实的可用月份数据
  const { data: availableMonths, isLoading: isLoadingMonths, error: monthsError } = useAvailablePayrollMonths();
  
  
  // 可用的测试模块
  const testModules: TestModule[] = [
    {
      id: 'month-selector',
      name: 'MonthSelector 月份选择器',
      description: '专门为薪资导入设计的月份选择组件，支持可用月份显示和验证',
      category: 'component',
      renderComponent: () => (
        <div className="p-4 bg-base-100 rounded-lg border">
          {isLoadingMonths ? (
            <div className="flex items-center justify-center p-8">
              <span className="loading loading-spinner loading-lg"></span>
              <span className="ml-3">加载可用月份数据...</span>
            </div>
          ) : monthsError ? (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>加载月份数据失败，将使用模拟数据演示</span>
            </div>
          ) : null}
          
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={(month) => {
              setSelectedMonth(month);
              console.log('选择月份:', month);
            }}
            availableMonths={availableMonths || [
              { month: '2025-01', payrollCount: 150, hasData: true, hasPeriod: true },
              { month: '2025-02', payrollCount: 145, hasData: true, hasPeriod: false },
              { month: '2024-12', payrollCount: 160, hasData: true, hasPeriod: true }
            ]}
            loading={isLoadingMonths}
            error={monthsError ? '加载月份数据失败' : null}
          />
          
          {/* 数据来源说明 */}
          <div className="mt-4 text-sm text-base-content/70">
            <div className="flex items-center gap-2">
              <span className={`badge badge-sm ${availableMonths ? 'badge-success' : 'badge-warning'}`}>
                {availableMonths ? '✓ 真实数据' : '⚠ 模拟数据'}
              </span>
              <span>
                {availableMonths 
                  ? `已加载 ${availableMonths.length} 个可用月份`
                  : '正在使用模拟数据进行演示'
                }
              </span>
            </div>
          </div>
        </div>
      ),
      features: ['真实数据加载', '月份选择', '可用性验证', '数据统计显示', '响应式设计'],
      usageInstructions: [
        '1. 组件会自动加载真实的薪资周期数据',
        '2. 点击月份选择器查看实际可用月份',
        '3. 绿色标记表示该月有薪资记录，显示实际员工数量',
        '4. 黄色标记表示有薪资周期但无记录数据',
        '5. 查看数据来源标识(真实数据 vs 模拟数据)'
      ]
    },
    
    {
      id: 'data-group-selector',
      name: 'DataGroupSelector 数据组选择器',
      description: '多选数据组组件，支持薪资、社保、人员类别等数据类型选择 - 带调试功能',
      category: 'component',
      renderComponent: () => <DataGroupSelectorTest />,
      features: ['多选支持', '图标展示', '全选功能', '状态反馈', '实时调试', '测试按钮'],
      usageInstructions: [
        '1. 直接点击各个数据组卡片进行选择/取消',
        '2. 使用"全部选择"按钮快速切换全选状态',
        '3. 观察调试信息区域显示的状态变化',
        '4. 使用测试按钮验证程序化操作',
        '5. 查看浏览器控制台的详细状态日志'
      ]
    },
    
    {
      id: 'import-context-demo',
      name: 'ImportContext 集成演示',
      description: 'Context驱动的完整组件间通信演示，展示统一状态管理和生命周期控制',
      category: 'integration',
      renderComponent: () => <SimpleImportContextDemo />,
      features: ['Context状态管理', '组件间通信', '生命周期控制', '错误处理', '进度同步', '调试模式'],
      usageInstructions: [
        '1. 观察状态总览面板的实时状态信息',
        '2. 在配置区域选择月份和数据组类型',
        '3. 上传Excel文件并观察处理进度',
        '4. 使用控制面板管理导入流程生命周期',
        '5. 开启诊断信息查看Context内部状态和事件'
      ]
    },
    
    {
      id: 'final-validation',
      name: '最终验证测试',
      description: '12天重构计划最终验证 - 完整功能测试和成果展示',
      category: 'integration',
      renderComponent: () => <FinalValidationTest />,
      features: ['自动化测试套件', '组件集成验证', '状态管理测试', '通信机制验证', '成果展示'],
      usageInstructions: [
        '1. 点击"运行完整测试套件"按钮执行所有测试',
        '2. 观察测试概览的通过率和详细结果',
        '3. 在组件集成演示区域手动测试各组件',
        '4. 查看浏览器控制台的详细测试日志',
        '5. 验证真实数据集成和Context通信功能'
      ]
    },
    
    {
      id: 'real-import-test',
      name: '真实导入功能测试',
      description: '验证系统真实数据导入能力 - 展示当前功能限制和技术架构',
      category: 'integration',
      renderComponent: () => <RealImportTest />,
      features: ['Excel文件处理', '数据库连接测试', '模拟导入流程', '功能限制说明', '技术架构展示'],
      usageInstructions: [
        '1. 选择月份和数据组配置导入参数',
        '2. 上传Excel文件进行格式验证',
        '3. 点击"开始模拟导入"测试完整流程',
        '4. 查看功能限制说明了解当前状态',
        '5. 理解真实导入集成的技术路径'
      ]
    },
    
    {
      id: 'data-type-test-suite',
      name: '数据类型导入测试套件 🧪',
      description: '验证所有4种支持的数据类型导入功能 - earnings, bases, category, job',
      category: 'integration',
      renderComponent: () => <DataTypeTestSuite />,
      features: ['4种数据类型', '自动化测试', '模拟数据生成', '成功率统计', '错误处理验证', '导入模式测试'],
      usageInstructions: [
        '1. 点击"运行所有测试"执行完整的数据类型验证',
        '2. 或单独测试某个数据类型（earnings/bases/category/job）',
        '3. 查看测试结果统计和详细错误信息',
        '4. 验证不同导入模式（upsert/replace）的功能',
        '5. 了解每种数据类型的字段结构和验证规则'
      ]
    }
  ];

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

  // 获取难度颜色
  const getDifficultyColor = () => 'badge-primary';

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-base-content mb-4">
            🧪 薪资导入测试中心
          </h1>
          <p className="text-lg text-base-content/70 mb-2">
            模块化重构测试套件 - 集成真实数据演示
          </p>
          <p className="text-base-content/60">
            {testModules.length}个测试模块 | {availableMonths ? '真实数据集成' : '模拟数据模式'} | ImportContext集成完成
          </p>
        </div>

        {/* 测试模块列表 */}
        <div className={cn(cardEffects.elevated, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">可用测试模块</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
            {testModules.map((module) => (
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
                    <span className={`badge ${getDifficultyColor()} badge-sm`}>
                      可用
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

        {/* 选中模块的详细信息 */}
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
                <span className={`badge ${getDifficultyColor()} ml-auto`}>
                  可用
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
                  {module.renderComponent()}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 说明信息 */}
        <div className={cn(cardEffects.accent, 'p-6')}>
          <h2 className="text-xl font-bold mb-4">💡 当前版本说明</h2>
          
          <div className="alert alert-info">
            <div>
              <h4 className="font-semibold mb-2">✅ 可用功能</h4>
              <ul className="list-disc list-inside space-y-1 text-sm mb-4">
                <li>MonthSelector 月份选择器 - 完整功能 + 真实数据集成</li>
                <li>DataGroupSelector 数据组选择器 - 完整功能</li>
                <li>基础交互测试和状态演示</li>
                <li>Supabase数据库连接和薪资周期数据加载</li>
              </ul>
              
              <h4 className="font-semibold mb-2">🔧 开发中功能</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>useImportState Hook 演示组件</li>
                <li>useFileProcessor Hook 演示组件</li>
                <li>Hook集成测试和性能测试套件</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleTestCenter;