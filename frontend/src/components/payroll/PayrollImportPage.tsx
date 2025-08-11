import React, { useState, useRef } from 'react';
import { TemplateDownloader } from './TemplateDownloader';
import { HistoryDataExporter } from './HistoryDataExporter';
import { ImportDataGroup, ImportMode } from '@/types/payroll-import';
import type { ImportConfig, ExcelDataRow } from '@/types/payroll-import';
import { PayrollImportService } from '@/services/payroll-import.service';
import * as XLSX from 'xlsx';
import { useToast, ToastContainer } from '@/components/common/Toast';
import { DownloadIcon, UploadIcon, FolderIcon, CheckCircleIcon, CloseIcon } from '@/components/common/Icons';

export const PayrollImportPage: React.FC = () => {
  const { messages, removeToast, toast } = useToast();
  const [activeTab, setActiveTab] = useState<'template' | 'import' | 'export'>('template');
  const [importing, setImporting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ExcelDataRow[]>([]);
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    dataGroup: ImportDataGroup.ALL,
    mode: ImportMode.UPSERT,
    payPeriod: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    },
    options: {
      validateBeforeImport: true,
      skipInvalidRows: false,
      batchSize: 100
    }
  });
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
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
          if (sheetName === '使用说明') return; // 跳过说明表
          
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
              
              // 只添加非空行
              if (Object.values(rowData).some(v => v && v !== '')) {
                allData.push(rowData);
              }
            }
          }
        });
        
        setParsedData(allData);
        
        // 显示预览
        console.log(`成功解析 ${allData.length} 行数据`);
        
      } catch (error) {
        console.error('文件解析失败:', error);
        toast.error('文件解析失败，请检查文件格式');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  // 执行导入
  const handleImport = async () => {
    if (!parsedData.length) {
      toast.warning('没有可导入的数据');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const service = new PayrollImportService(importConfig);
      const result = await service.importData(parsedData);
      
      setImportResult(result);
      
      if (result.success) {
        toast.success(`导入成功！成功 ${result.successCount} 条，失败 ${result.failedCount} 条`);
      } else {
        toast.warning(`导入完成，但有错误。成功 ${result.successCount} 条，失败 ${result.failedCount} 条`);
      }
    } catch (error) {
      console.error('导入失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error('导入失败: ' + errorMessage);
    } finally {
      setImporting(false);
    }
  };

  // 清除上传
  const handleClearUpload = () => {
    setUploadedFile(null);
    setParsedData([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <ToastContainer messages={messages} onClose={removeToast} />
      <h1 className="text-2xl font-bold">薪资数据导入导出</h1>
      <div className="divider"></div>

      {/* 标签页 */}
      <div className="tabs tabs-boxed">
        <a
          className={`tab tab-lg ${activeTab === 'template' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('template')}
        >
          <DownloadIcon className="w-5 h-5 mr-2" />
          下载模板
        </a>
        <a
          className={`tab tab-lg ${activeTab === 'import' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <UploadIcon className="w-5 h-5 mr-2" />
          导入数据
        </a>
        <a
          className={`tab tab-lg ${activeTab === 'export' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <FolderIcon className="w-5 h-5 mr-2" />
          导出历史
        </a>
      </div>

      {/* 内容区域 */}
      <div className="mt-6">
        {activeTab === 'template' ? (
          <TemplateDownloader
            defaultPeriod={{
              year: importConfig.payPeriod.start.getFullYear(),
              month: importConfig.payPeriod.start.getMonth() + 1
            }}
          />
        ) : activeTab === 'import' ? (
          <div className="flex flex-col gap-6">
            {/* 导入配置 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">导入配置</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* 导入模式 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">导入模式</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={importConfig.mode}
                      onChange={(e) => setImportConfig(prev => ({
                        ...prev,
                        mode: e.target.value as ImportMode
                      }))}
                    >
                      <option value={ImportMode.CREATE}>仅创建新记录</option>
                      <option value={ImportMode.UPDATE}>仅更新现有记录</option>
                      <option value={ImportMode.UPSERT}>更新或创建</option>
                      <option value={ImportMode.APPEND}>追加新字段</option>
                    </select>
                  </div>

                  {/* 数据组选择 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">数据类型</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={Array.isArray(importConfig.dataGroup) ? 'multiple' : importConfig.dataGroup}
                      onChange={(e) => setImportConfig(prev => ({
                        ...prev,
                        dataGroup: e.target.value as ImportDataGroup
                      }))}
                    >
                      <option value={ImportDataGroup.ALL}>全部数据</option>
                      <option value={ImportDataGroup.EARNINGS}>仅收入数据</option>
                      <option value={ImportDataGroup.CONTRIBUTION_BASES}>仅缴费基数</option>
                      <option value={ImportDataGroup.CATEGORY_ASSIGNMENT}>仅人员类别</option>
                      <option value={ImportDataGroup.JOB_ASSIGNMENT}>仅职务信息</option>
                    </select>
                  </div>
                </div>

                {/* 选项 */}
                <div className="flex flex-row gap-4 mt-4">
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary mr-2"
                        checked={importConfig.options.validateBeforeImport}
                        onChange={(e) => setImportConfig(prev => ({
                          ...prev,
                          options: {
                            ...prev.options,
                            validateBeforeImport: e.target.checked
                          }
                        }))}
                      />
                      <span className="label-text">导入前验证</span>
                    </label>
                  </div>
                  
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary mr-2"
                        checked={importConfig.options.skipInvalidRows}
                        onChange={(e) => setImportConfig(prev => ({
                          ...prev,
                          options: {
                            ...prev.options,
                            skipInvalidRows: e.target.checked
                          }
                        }))}
                      />
                      <span className="label-text">跳过无效行</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 文件上传 */}
            <div className="card bg-base-100 shadow-xl">
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
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 文件信息 */}
                    <div className="alert alert-success">
                      <CheckCircleIcon className="w-6 h-6" />
                      <div className="flex-1">
                        <div className="font-semibold">{uploadedFile.name}</div>
                        <div className="text-sm">
                          {(uploadedFile.size / 1024).toFixed(2)} KB | 
                          解析到 {parsedData.length} 行数据
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={handleClearUpload}
                      >
                        <CloseIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {/* 数据预览 */}
                    {parsedData.length > 0 && (
                      <div className="card bg-base-200">
                        <div className="card-body">
                          <h3 className="card-title text-base">数据预览（前5行）</h3>
                          <div className="overflow-x-auto">
                            <table className="table table-zebra">
                              <thead>
                                <tr>
                                  <th>行号</th>
                                  <th>员工编号</th>
                                  <th>员工姓名</th>
                                  <th>身份证号</th>
                                  <th>更多</th>
                                </tr>
                              </thead>
                              <tbody>
                                {parsedData.slice(0, 5).map((row, index) => (
                                  <tr key={index}>
                                    <td>{row.rowNumber}</td>
                                    <td>{row['员工编号'] || '-'}</td>
                                    <td>{row['员工姓名'] || '-'}</td>
                                    <td>{row['身份证号'] ? '****' + row['身份证号'].slice(-4) : '-'}</td>
                                    <td>
                                      <span className="badge badge-ghost">
                                        {Object.keys(row).length - 4} 个字段
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 导入按钮 */}
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn btn-ghost"
                        onClick={handleClearUpload}
                      >
                        重新上传
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleImport}
                        disabled={importing || parsedData.length === 0}
                      >
                        {importing && <span className="loading loading-spinner"></span>}
                        {importing ? '导入中...' : `开始导入 (${parsedData.length} 条)`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 导入结果 */}
            {importResult && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">
                    导入结果
                    <div className={`badge ${importResult.success ? 'badge-success' : 'badge-warning'}`}>
                      {importResult.success ? '成功' : '部分失败'}
                    </div>
                  </h2>
                  
                  {/* 统计信息 */}
                  <div className="stats shadow">
                    <div className="stat">
                      <div className="stat-title">总计</div>
                      <div className="stat-value text-primary">{importResult.totalRows}</div>
                      <div className="stat-desc">条记录</div>
                    </div>
                    
                    <div className="stat">
                      <div className="stat-title">成功</div>
                      <div className="stat-value text-success">{importResult.successCount}</div>
                      <div className="stat-desc">已导入</div>
                    </div>
                    
                    <div className="stat">
                      <div className="stat-title">失败</div>
                      <div className="stat-value text-error">{importResult.failedCount}</div>
                      <div className="stat-desc">导入失败</div>
                    </div>
                    
                    <div className="stat">
                      <div className="stat-title">跳过</div>
                      <div className="stat-value text-warning">{importResult.skippedCount}</div>
                      <div className="stat-desc">已跳过</div>
                    </div>
                  </div>

                  {/* 错误信息 */}
                  {importResult.errors?.length > 0 && (
                    <div className="collapse collapse-arrow bg-error/10 mt-4">
                      <input type="checkbox" defaultChecked />
                      <div className="collapse-title font-medium text-error">
                        错误信息 ({importResult.errors.length} 条)
                      </div>
                      <div className="collapse-content">
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {importResult.errors.map((error: any, index: number) => (
                            <div key={index} className="alert alert-error">
                              <span className="text-sm">第{error.row}行: {error.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 警告信息 */}
                  {importResult.warnings?.length > 0 && (
                    <div className="collapse collapse-arrow bg-warning/10 mt-4">
                      <input type="checkbox" />
                      <div className="collapse-title font-medium text-warning">
                        警告信息 ({importResult.warnings.length} 条)
                      </div>
                      <div className="collapse-content">
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {importResult.warnings.map((warning: any, index: number) => (
                            <div key={index} className="alert alert-warning">
                              <span className="text-sm">第{warning.row}行: {warning.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 导出历史数据
          <HistoryDataExporter />
        )}
      </div>
    </div>
  );
};