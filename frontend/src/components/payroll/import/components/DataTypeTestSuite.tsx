/**
 * DataTypeTestSuite - 4种数据类型导入验证组件
 * 
 * 测试所有支持的数据类型:
 * 1. EARNINGS (earnings) - 收入数据/薪资项目
 * 2. CONTRIBUTION_BASES (bases) - 缴费基数
 * 3. CATEGORY_ASSIGNMENT (category) - 人员类别
 * 4. JOB_ASSIGNMENT (job) - 职务信息
 */

import React, { useState } from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ImportMode } from '@/hooks/payroll/import-export/types';
import { usePayrollImportExport } from '@/hooks/payroll/import-export';
import { MonthSelector } from './config/MonthSelector';
import { useAvailablePayrollMonths } from '@/hooks/payroll/useAvailablePayrollMonths';
import { ImportProgressBar } from './common/ImportProgressBar';

/**
 * 数据组配置
 */
interface DataGroupConfig {
  dataGroup: ImportDataGroup;
  name: string;
  description: string;
  expectedColumns: string[];
  defaultImportMode: ImportMode;
}

const DATA_GROUP_CONFIGS: DataGroupConfig[] = [
  {
    dataGroup: ImportDataGroup.EARNINGS,
    name: '收入数据导入',
    description: '测试薪资项目明细数据导入（基本工资、奖金、补贴等）',
    expectedColumns: ['员工姓名', '基本工资', '岗位工资', '绩效奖金', '加班费', '交通补贴'],
    defaultImportMode: 'upsert'
  },
  {
    dataGroup: ImportDataGroup.CONTRIBUTION_BASES,
    name: '缴费基数导入',
    description: '测试社保公积金缴费基数数据导入',
    expectedColumns: ['员工姓名', '养老保险基数', '医疗保险基数', '失业保险基数', '工伤保险基数', '生育保险基数', '住房公积金基数'],
    defaultImportMode: 'replace'
  },
  {
    dataGroup: ImportDataGroup.CATEGORY_ASSIGNMENT,
    name: '人员类别导入',
    description: '测试员工人员类别分配数据导入（在编、合同工等）',
    expectedColumns: ['员工姓名', '人员类别'],
    defaultImportMode: 'upsert'
  },
  {
    dataGroup: ImportDataGroup.JOB_ASSIGNMENT,
    name: '职务信息导入',
    description: '测试员工部门职位分配数据导入',
    expectedColumns: ['员工姓名', '部门', '职位'],
    defaultImportMode: 'upsert'
  }
];

/**
 * 数据类型测试套件组件
 */
export const DataTypeTestSuite: React.FC = () => {
  const [selectedDataGroup, setSelectedDataGroup] = useState<DataGroupConfig | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('upsert');
  const [testResults, setTestResults] = useState<Record<string, 'pending' | 'running' | 'success' | 'failed'>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>('2025-01');
  
  // 直接使用已验证的生产Hook
  const importHook = usePayrollImportExport();
  
  // 获取可用的薪资月份数据
  const { data: availableMonths, isLoading: isLoadingMonths, error: monthsError } = useAvailablePayrollMonths();

  /**
   * 处理文件上传
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      console.log('📄 上传文件:', file.name, '大小:', file.size, '字节');
    }
  };

  /**
   * 运行导入测试
   */
  const runImportTest = async () => {
    if (!selectedDataGroup || !uploadedFile) {
      alert('请选择数据组并上传文件');
      return;
    }

    console.log(`🧪 开始测试: ${selectedDataGroup.name}`);
    console.log(`📋 测试配置:`, {
      dataGroup: selectedDataGroup.dataGroup,
      importMode: importMode,
      fileName: uploadedFile.name
    });
    
    setTestResults(prev => ({
      ...prev,
      [selectedDataGroup.dataGroup]: 'running'
    }));

    try {
      console.log(`📄 使用用户上传文件: ${uploadedFile.name}, 大小: ${uploadedFile.size}字节`);
      
      // 从选中的月份获取对应的period ID
      const selectedMonthData = availableMonths?.find(m => m.month === selectedMonth);
      const periodId = selectedMonthData?.periodId;
      
      if (!periodId) {
        throw new Error(`未找到月份 ${selectedMonth} 对应的薪资周期ID`);
      }
      
      // 构建日期范围
      const [year, month] = selectedMonth.split('-').map(Number);
      const payPeriodStart = new Date(year, month - 1, 1);
      const payPeriodEnd = new Date(year, month, 0); // 月份最后一天
      
      console.log('📅 使用薪资周期:', {
        selectedMonth,
        periodId,
        payPeriodStart: payPeriodStart.toISOString(),
        payPeriodEnd: payPeriodEnd.toISOString()
      });
      
      // 执行真实导入测试
      const result = await importHook.importExcel.mutateAsync({
        file: uploadedFile,
        config: {
          dataGroup: selectedDataGroup.dataGroup,
          mode: importMode,
          payPeriod: {
            start: payPeriodStart,
            end: payPeriodEnd
          },
          options: {
            validateBeforeImport: true,  // 使用正常验证
            skipInvalidRows: false       // 不跳过无效行
          }
        },
        periodId
      });

      console.log(`📊 导入结果 - ${selectedDataGroup.name}:`, {
        success: result.success,
        totalRows: result.totalRows,
        successCount: result.successCount,
        failedCount: result.failedCount,
        errorCount: result.errors?.length || 0
      });
      
      // 根据结果更新状态
      const testPassed = result.totalRows > 0 && result.successCount > 0;
      
      setTestResults(prev => ({
        ...prev,
        [selectedDataGroup.dataGroup]: testPassed ? 'success' : 'failed'
      }));
      
      return result;
      
    } catch (error) {
      console.error(`❌ 测试失败 - ${selectedDataGroup.name}:`, error);
      
      setTestResults(prev => ({
        ...prev,
        [selectedDataGroup.dataGroup]: 'failed'
      }));
      
      throw error;
    }
  };

  /**
   * 清理上传文件
   */
  const clearUploadedFile = () => {
    setUploadedFile(null);
    // 清理文件输入框
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  /**
   * 获取测试状态图标和颜色
   */
  const getStatusDisplay = (dataGroup: string) => {
    const status = testResults[dataGroup] || 'pending';
    
    switch (status) {
      case 'pending':
        return { icon: '⏳', color: 'text-base-content/60', bgColor: 'bg-base-200' };
      case 'running':
        return { icon: '🔄', color: 'text-info', bgColor: 'bg-info/10' };
      case 'success':
        return { icon: '✅', color: 'text-success', bgColor: 'bg-success/10' };
      case 'failed':
        return { icon: '❌', color: 'text-error', bgColor: 'bg-error/10' };
      default:
        return { icon: '⏳', color: 'text-base-content/60', bgColor: 'bg-base-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题和说明 */}
      <div className="bg-primary text-primary-content p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-2">📁 手动文件导入测试</h2>
        <p className="text-primary-content/80">
          上传您的Excel文件，测试4种数据类型的导入功能
        </p>
      </div>

      {/* 文件上传区域 */}
      <div className="card bg-base-100 border">
        <div className="card-body">
          <h3 className="card-title">📂 文件上传</h3>
          
          <div className="form-control">
            <label htmlFor="file-upload" className="label">
              <span className="label-text">选择Excel文件 (支持 .xlsx, .xls, .csv)</span>
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="file-input file-input-bordered w-full"
            />
            {uploadedFile && (
              <div className="mt-2 flex items-center gap-2">
                <span className="badge badge-success">✓</span>
                <span className="text-sm">
                  已选择: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={clearUploadedFile}
                >
                  清除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 月份选择区域 */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        availableMonths={availableMonths}
        loading={isLoadingMonths}
        error={monthsError?.message || null}
        showDataIndicators={true}
        showCompletenessIndicators={true}
      />

      {/* 配置选择区域 */}
      <div className="card bg-base-100 border">
        <div className="card-body">
          <h3 className="card-title">⚙️ 导入配置</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">数据组类型</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedDataGroup?.dataGroup || ''}
                onChange={(e) => {
                  const config = DATA_GROUP_CONFIGS.find(c => c.dataGroup === e.target.value);
                  setSelectedDataGroup(config || null);
                  if (config) {
                    setImportMode(config.defaultImportMode);
                  }
                }}
              >
                <option value="">请选择数据组</option>
                {DATA_GROUP_CONFIGS.map(config => (
                  <option key={config.dataGroup} value={config.dataGroup}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">导入模式</span>
              </label>
              <select 
                className="select select-bordered"
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as ImportMode)}
              >
                <option value="upsert">UPSERT (更新或插入)</option>
                <option value="replace">REPLACE (完全替换)</option>
              </select>
            </div>
          </div>
          
          {selectedDataGroup && (
            <div className="mt-4">
              <div className="alert alert-info">
                <div>
                  <h4 className="font-bold">{selectedDataGroup.name}</h4>
                  <p className="text-sm">{selectedDataGroup.description}</p>
                  <p className="text-xs mt-1">
                    期望的Excel列: {selectedDataGroup.expectedColumns.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 测试控制 */}
      <div className="flex gap-4 items-center">
        <button
          className="btn btn-primary gap-2"
          onClick={runImportTest}
          disabled={!selectedDataGroup || !uploadedFile || importHook.isImporting || isLoadingMonths || !availableMonths}
        >
          {importHook.isImporting ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              导入中...
            </>
          ) : (
            <>
              🧪 开始测试导入
            </>
          )}
        </button>
        
        {selectedDataGroup && testResults[selectedDataGroup.dataGroup] && (
          <div className="text-sm text-base-content/70">
            测试状态: {getStatusDisplay(selectedDataGroup.dataGroup).icon} {
              testResults[selectedDataGroup.dataGroup] === 'success' ? '成功' :
              testResults[selectedDataGroup.dataGroup] === 'failed' ? '失败' :
              testResults[selectedDataGroup.dataGroup] === 'running' ? '运行中' : '待运行'
            }
          </div>
        )}
      </div>

      {/* 快速诊断工具 */}
      {uploadedFile && (
        <div className="bg-info/10 p-4 rounded-lg">
          <h3 className="font-semibold text-info mb-2">🔧 文件诊断信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>文件信息:</strong>
              <div className="ml-2">
                <div>名称: {uploadedFile.name}</div>
                <div>大小: {(uploadedFile.size / 1024).toFixed(1)} KB</div>
                <div>类型: {uploadedFile.type || '未知'}</div>
              </div>
            </div>
            <div>
              <strong>编码测试:</strong>
              <button 
                className="btn btn-xs btn-outline ml-2"
                onClick={async () => {
                  try {
                    const content = await uploadedFile.text();
                    console.log('🔍 文件编码测试:', {
                      fileName: uploadedFile.name,
                      fileSize: uploadedFile.size,
                      hasUTF8BOM: content.charCodeAt(0) === 0xFEFF,
                      firstLine: content.split('\n')[0],
                      encoding: '检查控制台查看详情'
                    });
                    alert('编码测试完成，请查看控制台');
                  } catch (error) {
                    console.error('编码测试失败:', error);
                    alert('编码测试失败，可能是二进制Excel文件');
                  }
                }}
              >
                测试编码
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通用导入进度条 */}
      <ImportProgressBar
        progress={importHook.importProgress}
        isImporting={importHook.isImporting}
        dataGroup={selectedDataGroup?.dataGroup}
        showDetails={true}
        className="mt-4"
      />
    </div>
  );
};

export default DataTypeTestSuite;