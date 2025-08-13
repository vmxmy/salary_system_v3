import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { SmartPayrollImportService } from '@/services/payroll-import-smart.service';
import type { ImportPreview, ImportResult } from '@/services/payroll-import-smart.service';
import type { ExcelDataRow } from '@/types/payroll-import';
import { MonthPicker } from '@/components/common/MonthPicker';
import { UniversalPageLayout } from '@/components/layout/UniversalPageLayout';
import { useToast, ToastContainer } from '@/components/common/Toast';
import { 
  UploadIcon, 
  CheckCircleIcon, 
  CloseIcon
} from '@/components/common/Icons';
import { ImportModeSelector } from './ImportModeSelector';

// Additional icons
const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

/**
 * 智能薪资导入页面
 * 采用预览优先设计，用业务语言展示导入影响
 */
export const SmartPayrollImportPage: React.FC = () => {
  const { messages, removeToast, toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 状态管理
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ExcelDataRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [service, setService] = useState<SmartPayrollImportService | null>(null);

  /**
   * 处理月份选择
   */
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    // 重置预览状态
    if (preview) {
      setPreview(null);
      setCurrentStep('upload');
    }
  };

  /**
   * 处理文件上传
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setCurrentStep('upload');
    setPreview(null);
    setImportResult(null);

    // 读取Excel文件
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 解析所有工作表
        const allData: ExcelDataRow[] = [];
        let rowNumber = 1;
        
        workbook.SheetNames.forEach(sheetName => {
          if (sheetName === '使用说明') return;
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '' 
          });
          
          if (jsonData.length > 1) {
            const headers = jsonData[0] as string[];
            
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              const rowData: ExcelDataRow = { rowNumber: rowNumber++ };
              
              headers.forEach((header, index) => {
                rowData[header] = row[index];
              });
              
              if (Object.values(rowData).some(v => v && v !== '')) {
                allData.push(rowData);
              }
            }
          }
        });
        
        setParsedData(allData);
        toast.success(`成功读取 ${allData.length} 条数据`);
        
        // 自动开始分析
        await handleAnalyze(allData);
        
      } catch (error) {
        toast.error('文件解析失败，请检查文件格式');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  /**
   * 分析数据并生成预览
   */
  const handleAnalyze = async (data?: ExcelDataRow[]) => {
    const dataToAnalyze = data || parsedData;
    if (!dataToAnalyze.length) {
      toast.warning('没有可分析的数据');
      return;
    }

    setProcessing(true);
    
    try {
      // 创建服务实例
      const [year, month] = selectedMonth.split('-');
      const payPeriod = {
        start: new Date(parseInt(year), parseInt(month) - 1, 1),
        end: new Date(parseInt(year), parseInt(month), 0)
      };
      
      const importService = new SmartPayrollImportService(payPeriod);
      setService(importService);
      
      // 分析数据
      const previewResult = await importService.analyzeAndPreview(dataToAnalyze);
      setPreview(previewResult);
      setCurrentStep('preview');
      
      // 显示分析结果摘要
      if (previewResult.summary.errors > 0) {
        toast.error(`发现 ${previewResult.summary.errors} 个错误，请修正后重新上传`);
      } else if (previewResult.summary.warnings > 0) {
        toast.warning(`发现 ${previewResult.summary.warnings} 个警告，请查看详情`);
      } else {
        toast.success('数据分析完成，请确认导入内容');
      }
      
    } catch (error) {
      toast.error('数据分析失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 执行导入
   */
  const handleImport = async () => {
    if (!service || !preview?.importReady) {
      toast.error('导入条件不满足');
      return;
    }

    setProcessing(true);
    
    try {
      const result = await service.executeImport();
      setImportResult(result);
      setCurrentStep('result');
      
      if (result.success) {
        toast.success(
          `导入成功！处理 ${result.summary.processed} 条，成功 ${result.summary.succeeded} 条`
        );
      } else {
        toast.warning(
          `导入完成但有错误。成功 ${result.summary.succeeded} 条，失败 ${result.summary.failed} 条`
        );
      }
      
    } catch (error) {
      toast.error('导入失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 撤销导入
   */
  const handleRollback = async () => {
    if (!service || !importResult?.rollbackId) {
      toast.error('无法撤销');
      return;
    }

    if (!confirm('确定要撤销本次导入吗？这将删除所有刚导入的数据。')) {
      return;
    }

    setProcessing(true);
    
    try {
      const success = await service.rollbackImport(importResult.rollbackId);
      if (success) {
        toast.success('已成功撤销导入');
        handleReset();
      } else {
        toast.error('撤销失败');
      }
    } catch (error) {
      toast.error('撤销失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 重置所有状态
   */
  const handleReset = () => {
    setUploadedFile(null);
    setParsedData([]);
    setPreview(null);
    setImportResult(null);
    setCurrentStep('upload');
    setService(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <UniversalPageLayout
      page={{
        title: "智能薪资导入",
        subtitle: "自动识别员工信息，智能处理薪资数据，完全透明的导入过程",
        icon: <UploadIcon className="w-6 h-6" />
      }}
      styling={{
        compact: true,
        spacing: 'normal'
      }}
    >
      <ToastContainer messages={messages} onClose={removeToast} />
      
      {/* 模式选择器 */}
      <ImportModeSelector />
      
      {/* 步骤指示器 */}
      <div className="steps steps-horizontal w-full mb-6">
        <div className={`step ${currentStep === 'upload' ? 'step-primary' : ''}`}>
          上传文件
        </div>
        <div className={`step ${currentStep === 'preview' ? 'step-primary' : ''}`}>
          预览确认
        </div>
        <div className={`step ${currentStep === 'result' ? 'step-primary' : ''}`}>
          导入结果
        </div>
      </div>

      {/* 薪资周期选择 */}
      <div className="card bg-base-100 shadow-sm border border-base-200/60 mb-4">
        <div className="card-body">
          <h2 className="card-title">选择薪资周期</h2>
          <div className="form-control">
            <MonthPicker
              value={selectedMonth}
              onChange={handleMonthChange}
              placeholder="请选择薪资周期"
              showDataIndicators={true}
              disableMonthsWithData={false}
              className="select-bordered"
            />
            <label className="label">
              <span className="label-text-alt">
                选择要导入薪资数据的月份
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 步骤1：文件上传 */}
      {currentStep === 'upload' && (
        <div className="card bg-base-100 shadow-sm border border-base-200/60">
          <div className="card-body">
            <h2 className="card-title">上传Excel文件</h2>
            
            {!uploadedFile ? (
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-base-200 hover:bg-base-300 border-base-content border-opacity-20">
                  <div className="flex flex-col items-center justify-center">
                    <UploadIcon className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-base mb-2">
                      <span className="font-semibold">点击上传</span> 或拖拽文件到这里
                    </p>
                    <p className="text-sm opacity-70">支持 .xlsx, .xls 格式</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={processing}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="alert alert-success">
                  <CheckCircleIcon className="w-6 h-6" />
                  <div className="flex-1">
                    <div className="font-semibold">{uploadedFile.name}</div>
                    <div className="text-sm">
                      {(uploadedFile.size / 1024).toFixed(2)} KB | 
                      {parsedData.length} 行数据
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={handleReset}
                    disabled={processing}
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {processing && (
                  <div className="alert alert-info">
                    <span className="loading loading-spinner"></span>
                    正在分析数据，请稍候...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 步骤2：预览确认 */}
      {currentStep === 'preview' && preview && (
        <div className="space-y-4">
          {/* 汇总信息 */}
          <div className="card bg-base-100 shadow-sm border border-base-200/60">
            <div className="card-body">
              <h2 className="card-title">导入影响分析</h2>
              
              <div className="stats shadow w-full">
                <div className="stat">
                  <div className="stat-figure text-primary">
                    <UploadIcon className="w-8 h-8" />
                  </div>
                  <div className="stat-title">总行数</div>
                  <div className="stat-value">{preview.summary.totalRows}</div>
                  <div className="stat-desc">Excel数据行</div>
                </div>
                
                <div className="stat">
                  <div className="stat-figure text-success">
                    <CheckCircleIcon className="w-8 h-8" />
                  </div>
                  <div className="stat-title">新增员工</div>
                  <div className="stat-value text-success">{preview.summary.newEmployees}</div>
                  <div className="stat-desc">将创建新记录</div>
                </div>
                
                <div className="stat">
                  <div className="stat-figure text-warning">
                    <RefreshIcon className="w-8 h-8" />
                  </div>
                  <div className="stat-title">更新员工</div>
                  <div className="stat-value text-warning">{preview.summary.updatedEmployees}</div>
                  <div className="stat-desc">将更新薪资</div>
                </div>
                
                {preview.summary.warnings > 0 && (
                  <div className="stat">
                    <div className="stat-figure text-warning">
                      <AlertIcon className="w-8 h-8" />
                    </div>
                    <div className="stat-title">警告</div>
                    <div className="stat-value text-warning">{preview.summary.warnings}</div>
                    <div className="stat-desc">需要注意</div>
                  </div>
                )}
              </div>

              {/* 预估时间 */}
              <div className="alert mt-4">
                <InfoIcon className="w-5 h-5" />
                <span>预计导入时间：{preview.estimatedTime}</span>
              </div>
            </div>
          </div>

          {/* 新增员工详情 */}
          {preview.details.newEmployees.length > 0 && (
            <div className="card bg-base-100 shadow-sm border border-base-200/60">
              <div className="card-body">
                <h3 className="card-title text-success">
                  🆕 新增员工 ({preview.details.newEmployees.length}人)
                </h3>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>员工编号</th>
                        <th>姓名</th>
                        <th>部门</th>
                        <th>职位</th>
                        <th>应发合计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.details.newEmployees.slice(0, 5).map((emp, idx) => (
                        <tr key={idx}>
                          <td>{emp.employeeCode}</td>
                          <td>{emp.employeeName}</td>
                          <td>{emp.department || '-'}</td>
                          <td>{emp.position || '-'}</td>
                          <td className="font-semibold">
                            ¥{emp.totalAmount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.details.newEmployees.length > 5 && (
                    <div className="text-center py-2 text-sm opacity-70">
                      还有 {preview.details.newEmployees.length - 5} 位员工...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 更新员工详情 */}
          {preview.details.updatedEmployees.length > 0 && (
            <div className="card bg-base-100 shadow-sm border border-base-200/60">
              <div className="card-body">
                <h3 className="card-title text-warning">
                  🔄 更新员工 ({preview.details.updatedEmployees.length}人)
                </h3>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>员工编号</th>
                        <th>姓名</th>
                        <th>原金额</th>
                        <th>新金额</th>
                        <th>变化</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.details.updatedEmployees.slice(0, 5).map((emp, idx) => (
                        <tr key={idx}>
                          <td>{emp.employeeCode}</td>
                          <td>{emp.employeeName}</td>
                          <td>¥{emp.totalBefore.toFixed(2)}</td>
                          <td>¥{emp.totalAfter.toFixed(2)}</td>
                          <td className={emp.difference > 0 ? 'text-success' : emp.difference < 0 ? 'text-error' : ''}>
                            {emp.difference > 0 ? '+' : ''}
                            ¥{emp.difference.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.details.updatedEmployees.length > 5 && (
                    <div className="text-center py-2 text-sm opacity-70">
                      还有 {preview.details.updatedEmployees.length - 5} 位员工...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 警告信息 */}
          {preview.details.warnings.length > 0 && (
            <div className="card bg-warning/10 border border-warning/30">
              <div className="card-body">
                <h3 className="card-title text-warning">
                  ⚠️ 警告信息 ({preview.details.warnings.length}条)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {preview.details.warnings.map((warning, idx) => (
                    <div key={idx} className="alert alert-warning">
                      <span className="text-sm">
                        第{warning.row}行: {warning.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <button
              className="btn btn-ghost"
              onClick={handleReset}
              disabled={processing}
            >
              重新上传
            </button>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={processing || !preview.importReady}
            >
              {processing && <span className="loading loading-spinner"></span>}
              确认导入
            </button>
          </div>
        </div>
      )}

      {/* 步骤3：导入结果 */}
      {currentStep === 'result' && importResult && (
        <div className="space-y-4">
          <div className="card bg-base-100 shadow-sm border border-base-200/60">
            <div className="card-body">
              <h2 className="card-title">
                导入完成
                <div className={`badge ${importResult.success ? 'badge-success' : 'badge-warning'} badge-lg`}>
                  {importResult.success ? '成功' : '部分成功'}
                </div>
              </h2>
              
              <div className="stats shadow w-full">
                <div className="stat">
                  <div className="stat-title">处理总数</div>
                  <div className="stat-value">{importResult.summary.processed}</div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">成功</div>
                  <div className="stat-value text-success">{importResult.summary.succeeded}</div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">失败</div>
                  <div className="stat-value text-error">{importResult.summary.failed}</div>
                </div>
              </div>

              {/* 详细结果 */}
              {importResult.details.createdEmployees.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">✅ 新创建的员工薪资：</h4>
                  <div className="flex flex-wrap gap-2">
                    {importResult.details.createdEmployees.map((name, idx) => (
                      <span key={idx} className="badge badge-success">{name}</span>
                    ))}
                  </div>
                </div>
              )}

              {importResult.details.updatedEmployees.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">🔄 已更新的员工薪资：</h4>
                  <div className="flex flex-wrap gap-2">
                    {importResult.details.updatedEmployees.map((name, idx) => (
                      <span key={idx} className="badge badge-warning">{name}</span>
                    ))}
                  </div>
                </div>
              )}

              {importResult.details.failedRows.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2 text-error">❌ 失败的行号：</h4>
                  <div className="flex flex-wrap gap-2">
                    {importResult.details.failedRows.map((row, idx) => (
                      <span key={idx} className="badge badge-error">第{row}行</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-between mt-6">
                <button
                  className="btn btn-error btn-outline"
                  onClick={handleRollback}
                  disabled={processing || !importResult.rollbackId}
                >
                  撤销本次导入
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleReset}
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UniversalPageLayout>
  );
};

// 添加缺失的InfoIcon组件
const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);