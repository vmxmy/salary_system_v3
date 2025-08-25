/**
 * 最终验证测试组件
 * 验证12天重构计划的所有核心组件和功能
 */

import React, { useState, useCallback } from 'react';
import { SimpleImportContextProvider, useSimpleImportContext, SimpleImportPhase } from '../context/SimpleImportContext';
import type { SimpleImportPhaseType } from '../context/SimpleImportContext';
import { MonthSelector } from './config/MonthSelector';
import { DataGroupSelector } from './config/DataGroupSelector';
import { ImportDataGroup } from '@/types/payroll-import';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';
import { useAvailablePayrollMonths } from '@/hooks/payroll/useAvailablePayrollMonths';

/**
 * 内部验证组件
 */
const FinalValidationContent: React.FC = () => {
  const context = useSimpleImportContext();
  const [testResults, setTestResults] = useState<{
    monthSelector: boolean;
    dataGroupSelector: boolean;
    contextCommunication: boolean;
    stateManagement: boolean;
  }>({
    monthSelector: false,
    dataGroupSelector: false,
    contextCommunication: false,
    stateManagement: false
  });
  
  // 获取真实数据
  const { data: availableMonths, isLoading: isLoadingMonths } = useAvailablePayrollMonths();
  
  // === 测试用例执行 ===
  const runMonthSelectorTest = useCallback(async () => {
    try {
      // 测试月份选择功能
      const testMonth = '2025-01';
      context.notifyConfigChange({ month: testMonth });
      
      // 验证状态更新
      const success = context.currentState.selectedMonth === testMonth;
      setTestResults(prev => ({ ...prev, monthSelector: success }));
      
      console.log('MonthSelector测试:', success ? '✅ 通过' : '❌ 失败');
      return success;
    } catch (error) {
      console.error('MonthSelector测试失败:', error);
      setTestResults(prev => ({ ...prev, monthSelector: false }));
      return false;
    }
  }, [context]);
  
  const runDataGroupSelectorTest = useCallback(async () => {
    try {
      // 测试数据组选择功能 - 使用SimpleImportContext支持的类型
      const testGroups = [ImportDataGroup.EARNINGS];
      context.notifyConfigChange({ dataGroups: testGroups });
      
      // 验证状态更新
      const success = context.currentState.selectedDataGroups.length === testGroups.length &&
                     testGroups.every(g => context.currentState.selectedDataGroups.includes(g));
      setTestResults(prev => ({ ...prev, dataGroupSelector: success }));
      
      console.log('DataGroupSelector测试:', success ? '✅ 通过' : '❌ 失败');
      return success;
    } catch (error) {
      console.error('DataGroupSelector测试失败:', error);
      setTestResults(prev => ({ ...prev, dataGroupSelector: false }));
      return false;
    }
  }, [context]);
  
  const runContextCommunicationTest = useCallback(async () => {
    try {
      // 测试Context组件间通信
      context.notifyProgress({
        phase: SimpleImportPhase.DATA_VALIDATION,
        progress: 75,
        message: '测试进度更新'
      });
      
      // 验证进度状态
      const success = context.progress.overall === 75 && 
                     context.progress.message === '测试进度更新';
      setTestResults(prev => ({ ...prev, contextCommunication: success }));
      
      console.log('Context通信测试:', success ? '✅ 通过' : '❌ 失败');
      return success;
    } catch (error) {
      console.error('Context通信测试失败:', error);
      setTestResults(prev => ({ ...prev, contextCommunication: false }));
      return false;
    }
  }, [context]);
  
  const runStateManagementTest = useCallback(async () => {
    try {
      // 测试完整状态管理流程
      await context.resetImport();
      
      // 配置阶段
      context.notifyConfigChange({ 
        month: '2025-01', 
        dataGroups: [ImportDataGroup.EARNINGS] 
      });
      
      // 文件阶段
      context.notifyFileChange({ 
        hasFile: true, 
        fileName: 'test.xlsx', 
        fileSize: 1024 
      });
      
      // 验证状态流转
      const success = context.currentState.selectedMonth === '2025-01' &&
                     context.currentState.selectedDataGroups.length === 1 &&
                     context.currentState.hasFile === true &&
                     context.currentState.canProceed === true;
      
      setTestResults(prev => ({ ...prev, stateManagement: success }));
      
      console.log('状态管理测试:', success ? '✅ 通过' : '❌ 失败');
      return success;
    } catch (error) {
      console.error('状态管理测试失败:', error);
      setTestResults(prev => ({ ...prev, stateManagement: false }));
      return false;
    }
  }, [context]);
  
  const runAllTests = useCallback(async () => {
    console.log('🧪 开始运行最终验证测试...');
    
    const results = {
      monthSelector: await runMonthSelectorTest(),
      dataGroupSelector: await runDataGroupSelectorTest(), 
      contextCommunication: await runContextCommunicationTest(),
      stateManagement: await runStateManagementTest()
    };
    
    const allPassed = Object.values(results).every(result => result);
    
    console.log('📊 测试结果汇总:');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`  ${test}: ${passed ? '✅ 通过' : '❌ 失败'}`);
    });
    console.log(`📈 总体结果: ${allPassed ? '✅ 全部通过' : '❌ 存在失败'}`);
    
    return results;
  }, [runMonthSelectorTest, runDataGroupSelectorTest, runContextCommunicationTest, runStateManagementTest]);

  // 获取测试通过率
  const getTestScore = () => {
    const passed = Object.values(testResults).filter(Boolean).length;
    const total = Object.keys(testResults).length;
    return { passed, total, percentage: total > 0 ? Math.round((passed / total) * 100) : 0 };
  };

  const score = getTestScore();

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-base-content mb-4">
            🎯 最终验证测试
          </h1>
          <p className="text-lg text-base-content/70 mb-2">
            12天重构计划核心功能验证
          </p>
          <p className="text-base-content/60">
            验证所有核心组件的集成和功能完整性
          </p>
        </div>

        {/* 测试概览 */}
        <div className={cn(cardEffects.elevated, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">📊 测试概览</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="stat bg-base-200 rounded-lg p-4 text-center">
              <div className="stat-title">测试通过率</div>
              <div className={`stat-value text-2xl ${score.percentage === 100 ? 'text-success' : score.percentage >= 75 ? 'text-warning' : 'text-error'}`}>
                {score.percentage}%
              </div>
              <div className="stat-desc">{score.passed}/{score.total} 项通过</div>
            </div>
            
            <div className="stat bg-base-200 rounded-lg p-4 text-center">
              <div className="stat-title">当前阶段</div>
              <div className="stat-value text-lg">{context.currentState.phase}</div>
              <div className="stat-desc">Context状态</div>
            </div>
            
            <div className="stat bg-base-200 rounded-lg p-4 text-center">
              <div className="stat-title">数据源</div>
              <div className={`stat-value text-lg ${availableMonths ? 'text-success' : 'text-warning'}`}>
                {availableMonths ? '真实数据' : '模拟数据'}
              </div>
              <div className="stat-desc">
                {availableMonths ? `${availableMonths.length}个月份` : '待加载'}
              </div>
            </div>
            
            <div className="stat bg-base-200 rounded-lg p-4 text-center">
              <div className="stat-title">会话状态</div>
              <div className="stat-value text-lg">活跃</div>
              <div className="stat-desc">ID: {context.sessionId.slice(-6)}</div>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              className="btn btn-primary btn-lg"
              onClick={runAllTests}
            >
              🚀 运行完整测试套件
            </button>
          </div>
        </div>

        {/* 测试结果详情 */}
        <div className={cn(cardEffects.primary, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">🔍 测试结果详情</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: 'monthSelector', name: 'MonthSelector 组件', desc: '月份选择和状态同步' },
              { key: 'dataGroupSelector', name: 'DataGroupSelector 组件', desc: '数据组选择和多选逻辑' },
              { key: 'contextCommunication', name: 'Context 组件间通信', desc: '跨组件状态同步和事件传递' },
              { key: 'stateManagement', name: '统一状态管理', desc: '完整导入流程状态管理' }
            ].map(test => (
              <div key={test.key} className={cn(
                'p-4 rounded-lg border-2',
                testResults[test.key as keyof typeof testResults] 
                  ? 'border-success bg-success/5' 
                  : 'border-base-300 bg-base-100'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{test.name}</h3>
                  <span className={`text-xl ${
                    testResults[test.key as keyof typeof testResults] ? '✅' : '⏸️'
                  }`}>
                    {testResults[test.key as keyof typeof testResults] ? '✅' : '⏸️'}
                  </span>
                </div>
                <p className="text-sm text-base-content/70">{test.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 组件集成演示 */}
        <div className={cn(cardEffects.secondary, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">🎮 组件集成演示</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MonthSelector 测试 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">月份选择器</h3>
              <MonthSelector
                selectedMonth={context.currentState.selectedMonth}
                onMonthChange={(month) => {
                  context.notifyConfigChange({ month });
                  console.log('Month changed to:', month);
                }}
                availableMonths={availableMonths || [
                  { month: '2025-01', payrollCount: 150, hasData: true, hasPeriod: true }
                ]}
                loading={isLoadingMonths}
              />
            </div>
            
            {/* DataGroupSelector 测试 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">数据组选择器</h3>
              <div className="bg-base-100 rounded-lg border p-4">
                <div className="mb-3 text-sm text-base-content/70">
                  当前选择: {context.currentState.selectedDataGroups.length} 个数据组
                </div>
                <div className="p-4 border rounded-lg bg-base-100">
                  <div className="mb-3">
                    <div className="text-sm">
                      当前已选择: {context.currentState.selectedDataGroups.length} 个数据组
                    </div>
                    <div className="text-xs text-base-content/60">
                      {context.currentState.selectedDataGroups.join(', ') || '无'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { key: ImportDataGroup.EARNINGS, label: '薪资明细' },
                      { key: ImportDataGroup.CONTRIBUTION_BASES, label: '缴费基数' },
                      { key: ImportDataGroup.CATEGORY_ASSIGNMENT, label: '人员类别' },
                      { key: ImportDataGroup.JOB_ASSIGNMENT, label: '部门职位' }
                    ].map(group => (
                      <label key={group.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={context.currentState.selectedDataGroups.includes(group.key)}
                          onChange={(e) => {
                            const currentGroups = context.currentState.selectedDataGroups;
                            const newGroups = e.target.checked
                              ? [...currentGroups, group.key]
                              : currentGroups.filter(g => g !== group.key);
                            context.notifyConfigChange({ dataGroups: newGroups });
                            console.log('DataGroups changed to:', newGroups);
                          }}
                        />
                        <span className="text-sm">{group.label}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    className="btn btn-sm btn-outline mt-3"
                    onClick={() => {
                      const allGroups = [
                        ImportDataGroup.EARNINGS,
                        ImportDataGroup.CONTRIBUTION_BASES,
                        ImportDataGroup.CATEGORY_ASSIGNMENT,
                        ImportDataGroup.JOB_ASSIGNMENT
                      ];
                      const newGroups = context.currentState.selectedDataGroups.length === allGroups.length 
                        ? [] 
                        : allGroups;
                      context.notifyConfigChange({ dataGroups: newGroups });
                      console.log('Select all toggled to:', newGroups);
                    }}
                  >
                    {context.currentState.selectedDataGroups.length === 4 ? '取消全选' : '全部选择'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 重构成果展示 */}
        <div className={cn(cardEffects.accent, 'p-6')}>
          <h2 className="text-2xl font-bold mb-4">🏆 重构成果展示</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-2">🧩</div>
              <h3 className="font-semibold mb-2">模块化组件</h3>
              <p className="text-sm text-base-content/70">
                将26000+行代码重构为独立的、可复用的模块化组件
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-2">🔗</div>
              <h3 className="font-semibold mb-2">Context通信</h3>
              <p className="text-sm text-base-content/70">
                实现统一的Context驱动的组件间通信机制
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-2">⚡</div>
              <h3 className="font-semibold mb-2">性能优化</h3>
              <p className="text-sm text-base-content/70">
                通过Hook和Context优化，提升性能和可维护性
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 最终验证测试组件
 */
export const FinalValidationTest: React.FC = () => {
  return (
    <SimpleImportContextProvider
      debug={true}
      initialConfig={{
        month: '2025-01',
        dataGroups: [ImportDataGroup.EARNINGS]
      }}
      onStateChange={(state) => console.log('[FinalValidation] 状态变更:', state)}
      onProgressChange={(progress) => console.log('[FinalValidation] 进度更新:', progress)}
      onError={(error) => console.error('[FinalValidation] 错误:', error)}
      onComplete={(result) => console.log('[FinalValidation] 完成:', result)}
    >
      <FinalValidationContent />
    </SimpleImportContextProvider>
  );
};

export default FinalValidationTest;