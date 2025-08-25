/**
 * useFileProcessor Hook 演示组件
 * 展示Excel文件解析和数据处理的完整功能
 */

import React, { useState } from 'react';
import { useFileProcessor } from '../../hooks/useFileProcessor';
import type { SheetParseResult, FileParseResult, DataConsistencyCheckResult } from '../../types/enhanced-types';
import { ImportDataGroup } from '@/types/payroll-import';
import type { ImportPhase } from '../../types/enhanced-types';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';
import { DATA_GROUP_CONSTANTS } from '../../constants';

/**
 * useFileProcessor Hook 演示组件
 */
export const FileProcessorDemo: React.FC = () => {
  const fileProcessor = useFileProcessor();
  const [currentPhase, setCurrentPhase] = useState<ImportPhase>('idle');
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setCurrentPhase('parsing');
      await fileProcessor.processFile(file, (phase, progress) => {
        setCurrentPhase(phase);
        setPhaseProgress(progress);
      });
      setCurrentPhase('completed');
    } catch (error) {
      console.error('文件处理失败:', error);
      setCurrentPhase('error');
    }
  };

  // 获取阶段描述
  const getPhaseDescription = (phase: ImportPhase): string => {
    const descriptions = {
      idle: '等待中',
      parsing: '解析文件',
      validating: '验证数据',
      importing: '导入数据',
      creating_payrolls: '创建薪资',
      inserting_items: '插入明细',
      completed: '完成',
      error: '错误'
    };
    return descriptions[phase] || phase;
  };

  // 获取数据类型图标和描述
  const getDataTypeInfo = (dataType: ImportDataGroup | null) => {
    if (!dataType) {
      return { icon: '❓', label: '未识别', color: 'badge-ghost' };
    }
    
    return {
      icon: DATA_GROUP_CONSTANTS.ICONS[dataType] || '📄',
      label: DATA_GROUP_CONSTANTS.LABELS[dataType] || dataType,
      color: 'badge-primary'
    };
  };

  const statistics = fileProcessor.getStatistics();

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-base-content mb-2">
            📁 useFileProcessor Hook 演示
          </h1>
          <p className="text-base-content/70">
            Excel文件解析、数据提取和一致性验证完整演示
          </p>
        </div>

        {/* 文件上传区域 */}
        <div className={cn(cardEffects.elevated, 'p-6')}>
          <h2 className="text-xl font-bold mb-4">文件上传</h2>
          <div className="space-y-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="file-input file-input-bordered w-full"
              disabled={fileProcessor.isProcessing}
            />
            
            {fileProcessor.isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {getPhaseDescription(currentPhase)}
                  </span>
                  <span className="text-sm">{phaseProgress}%</span>
                </div>
                <progress 
                  className="progress progress-primary w-full" 
                  value={phaseProgress} 
                  max="100"
                />
              </div>
            )}
            
            {fileProcessor.parseResult && (
              <div className="flex gap-2">
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={fileProcessor.clearResults}
                >
                  清除结果
                </button>
              </div>
            )}
          </div>
        </div>

        {fileProcessor.parseResult && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 文件信息面板 */}
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className={cn(cardEffects.primary, 'p-6')}>
                <h3 className="text-lg font-bold mb-4">📊 文件信息</h3>
                <div className="stats stats-vertical shadow-sm bg-base-100">
                  <div className="stat py-2">
                    <div className="stat-title text-xs">文件名</div>
                    <div className="stat-value text-sm truncate" title={fileProcessor.parseResult.fileName}>
                      {fileProcessor.parseResult.fileName}
                    </div>
                  </div>
                  
                  <div className="stat py-2">
                    <div className="stat-title text-xs">文件大小</div>
                    <div className="stat-value text-sm">
                      {(fileProcessor.parseResult.fileSize / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  
                  <div className="stat py-2">
                    <div className="stat-title text-xs">工作表数</div>
                    <div className="stat-value text-primary">{statistics.totalSheets}</div>
                  </div>
                  
                  <div className="stat py-2">
                    <div className="stat-title text-xs">总行数</div>
                    <div className="stat-value text-secondary">{statistics.totalRows}</div>
                  </div>
                  
                  <div className="stat py-2">
                    <div className="stat-title text-xs">有效行数</div>
                    <div className="stat-value text-accent">{statistics.validRows}</div>
                  </div>
                  
                  <div className="stat py-2">
                    <div className="stat-title text-xs">员工数量</div>
                    <div className="stat-value text-success">{statistics.uniqueEmployees}</div>
                  </div>
                </div>
              </div>

              {/* 数据类型分布 */}
              <div className={cn(cardEffects.standard, 'p-6')}>
                <h3 className="text-lg font-bold mb-4">🏷️ 数据类型</h3>
                <div className="space-y-2">
                  {fileProcessor.parseResult.dataTypes.length > 0 ? (
                    fileProcessor.parseResult.dataTypes.map(dataType => {
                      const typeInfo = getDataTypeInfo(dataType);
                      const count = fileProcessor.getDataByType(dataType).length;
                      return (
                        <div key={dataType} className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <span>{typeInfo.icon}</span>
                            <span className="text-sm">{typeInfo.label}</span>
                          </span>
                          <span className={`badge ${typeInfo.color} badge-sm`}>
                            {count} 行
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-base-content/50">
                      未识别到特定数据类型
                    </div>
                  )}
                </div>
              </div>

              {/* 错误和警告 */}
              {(fileProcessor.hasErrors || fileProcessor.hasWarnings) && (
                <div className={cn(cardEffects.standard, 'p-6')}>
                  <h3 className="text-lg font-bold mb-4">⚠️ 问题报告</h3>
                  
                  {fileProcessor.hasErrors && (
                    <div className="alert alert-error mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="font-bold">错误</h4>
                        <ul className="text-sm mt-1">
                          {fileProcessor.parseResult.globalErrors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                          {fileProcessor.parseResult.sheets.flatMap(sheet => 
                            sheet.errors.map((error, index) => (
                              <li key={`${sheet.sheetName}-${index}`}>• {sheet.sheetName}: {error}</li>
                            ))
                          )}
                        </ul>
                      </div>
                    </div>
                  )}

                  {fileProcessor.hasWarnings && (
                    <div className="alert alert-warning">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <h4 className="font-bold">警告</h4>
                        <ul className="text-sm mt-1">
                          {fileProcessor.parseResult.globalWarnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                          ))}
                          {fileProcessor.parseResult.sheets.flatMap(sheet => 
                            sheet.warnings.map((warning, index) => (
                              <li key={`${sheet.sheetName}-${index}`}>• {sheet.sheetName}: {warning}</li>
                            ))
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 工作表详情面板 */}
            <div className="space-y-6">
              {/* 工作表列表 */}
              <div className={cn(cardEffects.standard, 'p-6')}>
                <h3 className="text-lg font-bold mb-4">📄 工作表详情</h3>
                <div className="space-y-3">
                  {fileProcessor.parseResult.sheets.map((sheet, index) => {
                    const typeInfo = getDataTypeInfo(sheet.dataType);
                    return (
                      <div 
                        key={index}
                        className={`card bg-base-200 cursor-pointer transition-all ${
                          selectedSheet === sheet.sheetName ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedSheet(sheet.sheetName)}
                      >
                        <div className="card-body p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-sm">{sheet.sheetName}</h4>
                            <span className={`badge ${typeInfo.color} badge-sm`}>
                              {typeInfo.icon} {typeInfo.label}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-base-content/60">总行数:</span>
                              <span className="ml-1 font-medium">{sheet.rowCount}</span>
                            </div>
                            <div>
                              <span className="text-base-content/60">有效行:</span>
                              <span className="ml-1 font-medium">{sheet.validRowCount}</span>
                            </div>
                            <div>
                              <span className="text-base-content/60">表头数:</span>
                              <span className="ml-1 font-medium">{sheet.headers.length}</span>
                            </div>
                          </div>
                          
                          {(sheet.errors.length > 0 || sheet.warnings.length > 0) && (
                            <div className="flex gap-2 mt-2">
                              {sheet.errors.length > 0 && (
                                <span className="badge badge-error badge-xs">
                                  {sheet.errors.length} 错误
                                </span>
                              )}
                              {sheet.warnings.length > 0 && (
                                <span className="badge badge-warning badge-xs">
                                  {sheet.warnings.length} 警告
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 选中工作表的详细信息 */}
              {selectedSheet && (() => {
                const sheet = fileProcessor.parseResult?.sheets.find(s => s.sheetName === selectedSheet);
                if (!sheet) return null;
                
                return (
                  <div className={cn(cardEffects.accent, 'p-6')}>
                    <h3 className="text-lg font-bold mb-4">🔍 {sheet.sheetName} 详情</h3>
                    
                    {/* 表头信息 */}
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">表头字段 ({sheet.headers.length})</h4>
                      <div className="flex flex-wrap gap-1">
                        {sheet.headers.map((header, index) => (
                          <span key={index} className="badge badge-outline badge-sm">
                            {header}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* 数据预览 */}
                    {sheet.data.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">数据预览 (前5行)</h4>
                        <div className="overflow-x-auto">
                          <table className="table table-xs">
                            <thead>
                              <tr>
                                <th>行号</th>
                                {sheet.headers.slice(0, 4).map(header => (
                                  <th key={header}>{header}</th>
                                ))}
                                {sheet.headers.length > 4 && <th>...</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {sheet.data.slice(0, 5).map((row, index) => (
                                <tr key={index}>
                                  <td>{row.rowNumber}</td>
                                  {sheet.headers.slice(0, 4).map(header => (
                                    <td key={header} className="truncate max-w-20" title={String(row[header] || '')}>
                                      {String(row[header] || '')}
                                    </td>
                                  ))}
                                  {sheet.headers.length > 4 && <td>...</td>}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* 数据一致性和员工信息面板 */}
            <div className="space-y-6">
              {/* 数据一致性检查 */}
              {fileProcessor.consistencyResult && (
                <div className={cn(cardEffects.standard, 'p-6')}>
                  <h3 className="text-lg font-bold mb-4">
                    🔄 数据一致性 
                    <span className={`badge ml-2 ${fileProcessor.consistencyResult.isConsistent ? 'badge-success' : 'badge-warning'}`}>
                      {fileProcessor.consistencyResult.isConsistent ? '一致' : '有问题'}
                    </span>
                  </h3>
                  
                  {/* 重复员工 */}
                  {fileProcessor.consistencyResult.duplicateEmployees.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2 text-warning">
                        重复员工 ({fileProcessor.consistencyResult.duplicateEmployees.length})
                      </h4>
                      <div className="space-y-1">
                        {fileProcessor.consistencyResult.duplicateEmployees.map((dup, index) => (
                          <div key={index} className="text-xs bg-warning/10 p-2 rounded">
                            <span className="font-medium">{dup.employeeName}</span>
                            <span className="ml-2">出现 {dup.occurrences} 次</span>
                            <div className="text-warning/70">
                              工作表: {dup.sheets.join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 缺失员工 */}
                  {fileProcessor.consistencyResult.missingEmployees.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2 text-error">
                        缺失员工 ({fileProcessor.consistencyResult.missingEmployees.length})
                      </h4>
                      <div className="space-y-1">
                        {fileProcessor.consistencyResult.missingEmployees.slice(0, 3).map((missing, index) => (
                          <div key={index} className="text-xs bg-error/10 p-2 rounded">
                            <span className="font-medium">{missing.employeeName}</span>
                            <div className="text-error/70">
                              缺失: {missing.missingFromSheets.join(', ')}
                            </div>
                          </div>
                        ))}
                        {fileProcessor.consistencyResult.missingEmployees.length > 3 && (
                          <div className="text-xs text-base-content/50">
                            还有 {fileProcessor.consistencyResult.missingEmployees.length - 3} 个员工...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {fileProcessor.consistencyResult.isConsistent && (
                    <div className="alert alert-success">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">数据一致性检查通过</span>
                    </div>
                  )}
                </div>
              )}

              {/* 员工列表 */}
              {fileProcessor.consistencyResult && (
                <div className={cn(cardEffects.standard, 'p-6')}>
                  <h3 className="text-lg font-bold mb-4">👥 员工列表</h3>
                  
                  <div className="mb-4">
                    <select 
                      className="select select-bordered w-full select-sm"
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                    >
                      <option value="">选择员工查看详情</option>
                      {fileProcessor.consistencyResult.employeeList.map(employee => (
                        <option key={employee} value={employee}>{employee}</option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedEmployee && (() => {
                    const employeeData = fileProcessor.getEmployeeData(selectedEmployee);
                    return (
                      <div className="space-y-3">
                        <h4 className="font-medium">{selectedEmployee} 的数据</h4>
                        {employeeData.map((data, index) => (
                          <div key={index} className="bg-base-200 p-3 rounded">
                            <div className="font-medium text-sm mb-1">{data.sheet}</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(data.data)
                                .filter(([key]) => !key.startsWith('_') && key !== 'rowNumber')
                                .slice(0, 6)
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <span className="text-base-content/60">{key}:</span>
                                    <span className="ml-1">{String(value || '')}</span>
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  
                  {!selectedEmployee && (
                    <div className="text-sm text-base-content/50">
                      共找到 {fileProcessor.consistencyResult.employeeList.length} 名员工
                    </div>
                  )}
                </div>
              )}

              {/* Hook API 信息 */}
              <div className={cn(cardEffects.primary, 'p-6')}>
                <h3 className="text-lg font-bold mb-4">🛠️ Hook API</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">核心方法:</span>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>processFile() - 处理Excel文件</li>
                      <li>validateConsistency() - 验证数据一致性</li>
                      <li>getSheetData() - 获取工作表数据</li>
                      <li>getEmployeeData() - 获取员工数据</li>
                      <li>getDataByType() - 按类型获取数据</li>
                    </ul>
                  </div>
                  
                  <div>
                    <span className="font-medium">状态查询:</span>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>isProcessing: {fileProcessor.isProcessing ? '是' : '否'}</li>
                      <li>hasErrors: {fileProcessor.hasErrors ? '是' : '否'}</li>
                      <li>hasWarnings: {fileProcessor.hasWarnings ? '是' : '否'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!fileProcessor.parseResult && (
          <div className={cn(cardEffects.standard, 'p-8 text-center')}>
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-bold mb-2">上传Excel文件开始测试</h3>
            <p className="text-base-content/70">
              支持.xlsx和.xls格式，自动识别工作表类型和数据结构
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileProcessorDemo;