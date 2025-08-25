/**
 * 员工统计调试组件
 * 详细分析员工数量统计逻辑，检查是否存在重复计算问题
 */

import React, { useState, useMemo } from 'react';
import { cardEffects } from '@/styles/design-effects';
import { cn } from '@/lib/utils';
import type { FileParseResult, SheetParseResult } from '../../types/enhanced-types';
import type { ExcelDataRow } from '@/types/payroll-import';
import { extractEmployeeIdentifier, isEmptyRow } from '../../utils/validation-helpers';

interface EmployeeCountDebuggerProps {
  parseResult: FileParseResult | null;
}

interface EmployeeStats {
  totalBySheet: Record<string, number>;
  totalAcrossSheets: number;
  uniqueAcrossSheets: number;
  employeesBySheet: Record<string, string[]>;
  employeesAcrossSheets: string[];
  duplicateEmployees: string[];
  employeeSheetCount: Record<string, number>;
}

/**
 * 员工统计调试组件
 */
export const EmployeeCountDebugger: React.FC<EmployeeCountDebuggerProps> = ({
  parseResult
}) => {
  const [showDetails, setShowDetails] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // 计算详细的员工统计
  const employeeStats = useMemo((): EmployeeStats | null => {
    if (!parseResult) return null;

    const stats: EmployeeStats = {
      totalBySheet: {},
      totalAcrossSheets: 0,
      uniqueAcrossSheets: 0,
      employeesBySheet: {},
      employeesAcrossSheets: [],
      duplicateEmployees: [],
      employeeSheetCount: {}
    };

    const allEmployeesSet = new Set<string>();
    const employeeSheetTracker = new Map<string, string[]>();

    // 按工作表统计员工
    parseResult.sheets.forEach((sheet: SheetParseResult) => {
      const sheetEmployees: string[] = [];
      
      sheet.data.forEach((row: ExcelDataRow) => {
        if (!isEmptyRow(row)) {
          const employeeId = extractEmployeeIdentifier(row, sheet.headers);
          if (employeeId) {
            // 记录该工作表的员工
            sheetEmployees.push(employeeId);
            
            // 全局员工集合
            allEmployeesSet.add(employeeId);
            
            // 追踪员工出现在哪些工作表中
            if (!employeeSheetTracker.has(employeeId)) {
              employeeSheetTracker.set(employeeId, []);
            }
            employeeSheetTracker.get(employeeId)!.push(sheet.sheetName);
          }
        }
      });

      // 统计该工作表的员工数（包含重复）
      stats.totalBySheet[sheet.sheetName] = sheetEmployees.length;
      stats.employeesBySheet[sheet.sheetName] = sheetEmployees;
    });

    // 全局统计
    stats.totalAcrossSheets = Object.values(stats.totalBySheet).reduce((sum, count) => sum + count, 0);
    stats.uniqueAcrossSheets = allEmployeesSet.size;
    stats.employeesAcrossSheets = Array.from(allEmployeesSet);

    // 找出重复的员工
    const duplicates: string[] = [];
    const employeeCount: Record<string, number> = {};
    
    employeeSheetTracker.forEach((sheets, employee) => {
      const uniqueSheets = Array.from(new Set(sheets));
      stats.employeeSheetCount[employee] = uniqueSheets.length;
      
      // 如果员工在多个工作表中出现，或在同一工作表中重复出现
      if (sheets.length > uniqueSheets.length || uniqueSheets.length > 1) {
        duplicates.push(employee);
      }
      
      employeeCount[employee] = sheets.length;
    });

    stats.duplicateEmployees = duplicates;

    return stats;
  }, [parseResult]);

  if (!parseResult || !employeeStats) {
    return (
      <div className={cn(cardEffects.primary, 'p-6')}>
        <h3 className="text-lg font-bold mb-4">📊 员工统计调试</h3>
        <div className="text-center text-base-content/60 py-8">
          没有解析结果可以分析
        </div>
      </div>
    );
  }

  const hasIssues = employeeStats.totalAcrossSheets !== employeeStats.uniqueAcrossSheets;

  return (
    <div className="space-y-6">
      {/* 概览统计 */}
      <div className={cn(cardEffects.primary, 'p-6')}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">📊 员工统计调试</h3>
          <div className={`badge ${hasIssues ? 'badge-warning' : 'badge-success'}`}>
            {hasIssues ? '⚠ 发现问题' : '✅ 统计正确'}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title text-xs">各表员工总数</div>
            <div className="stat-value text-lg">{employeeStats.totalAcrossSheets}</div>
            <div className="stat-desc text-xs">包含重复统计</div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title text-xs">唯一员工数</div>
            <div className={`stat-value text-lg ${hasIssues ? 'text-warning' : 'text-success'}`}>
              {employeeStats.uniqueAcrossSheets}
            </div>
            <div className="stat-desc text-xs">去重后数量</div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title text-xs">重复员工</div>
            <div className="stat-value text-lg text-error">
              {employeeStats.duplicateEmployees.length}
            </div>
            <div className="stat-desc text-xs">跨表或重复</div>
          </div>
          
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title text-xs">工作表数</div>
            <div className="stat-value text-lg">{parseResult.sheets.length}</div>
            <div className="stat-desc text-xs">数据源表数</div>
          </div>
        </div>

        {/* 问题提示 */}
        {hasIssues && (
          <div className="alert alert-warning">
            <div>
              <strong>统计差异</strong>: 各表员工总数 ({employeeStats.totalAcrossSheets}) 
              与唯一员工数 ({employeeStats.uniqueAcrossSheets}) 不一致
            </div>
          </div>
        )}
      </div>

      {/* 按工作表详细统计 */}
      <div className={cn(cardEffects.secondary, 'p-6')}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">📋 按工作表统计</h4>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '隐藏' : '显示'}详情
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>工作表名</th>
                <th>员工记录数</th>
                <th>唯一员工数</th>
                <th>重复情况</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {parseResult.sheets.map(sheet => {
                const sheetEmployees = employeeStats.employeesBySheet[sheet.sheetName] || [];
                const uniqueInSheet = new Set(sheetEmployees).size;
                const hasRepeats = sheetEmployees.length > uniqueInSheet;

                return (
                  <tr key={sheet.sheetName}>
                    <td className="font-semibold">{sheet.sheetName}</td>
                    <td>{employeeStats.totalBySheet[sheet.sheetName] || 0}</td>
                    <td>{uniqueInSheet}</td>
                    <td>
                      {hasRepeats ? (
                        <span className="badge badge-warning badge-sm">
                          表内重复 {sheetEmployees.length - uniqueInSheet}
                        </span>
                      ) : (
                        <span className="badge badge-success badge-sm">无重复</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setSelectedSheet(
                          selectedSheet === sheet.sheetName ? '' : sheet.sheetName
                        )}
                      >
                        {selectedSheet === sheet.sheetName ? '收起' : '详情'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 重复员工列表 */}
      {employeeStats.duplicateEmployees.length > 0 && (
        <div className={cn(cardEffects.accent, 'p-6')}>
          <h4 className="text-lg font-semibold mb-4">⚠️ 重复员工分析</h4>
          
          <div className="space-y-3">
            {employeeStats.duplicateEmployees.slice(0, 10).map(employee => (
              <div key={employee} className="bg-base-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{employee}</span>
                  <span className="badge badge-error badge-sm">
                    出现 {employeeStats.employeeSheetCount[employee]} 次
                  </span>
                </div>
                <div className="text-xs text-base-content/60 mt-1">
                  在以下工作表中: {parseResult.sheets
                    .filter(sheet => 
                      employeeStats.employeesBySheet[sheet.sheetName]?.includes(employee)
                    )
                    .map(sheet => sheet.sheetName)
                    .join(', ')}
                </div>
              </div>
            ))}
            
            {employeeStats.duplicateEmployees.length > 10 && (
              <div className="text-center text-sm text-base-content/60">
                ... 还有 {employeeStats.duplicateEmployees.length - 10} 个重复员工
              </div>
            )}
          </div>
        </div>
      )}

      {/* 选中工作表的详细信息 */}
      {selectedSheet && showDetails && (
        <div className={cn(cardEffects.elevated, 'p-6')}>
          <h4 className="text-lg font-semibold mb-4">
            📄 工作表详情: {selectedSheet}
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h5 className="font-semibold mb-2">员工列表</h5>
              <div className="bg-base-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-1">
                  {(employeeStats.employeesBySheet[selectedSheet] || []).map((employee, index) => (
                    <div key={index} className="text-sm">
                      {index + 1}. {employee}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-semibold mb-2">统计摘要</h5>
              <div className="space-y-2 text-sm">
                <div>总记录数: {employeeStats.totalBySheet[selectedSheet]}</div>
                <div>唯一员工: {new Set(employeeStats.employeesBySheet[selectedSheet]).size}</div>
                <div>表内重复: {employeeStats.totalBySheet[selectedSheet] - new Set(employeeStats.employeesBySheet[selectedSheet]).size}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 修复建议 */}
      {hasIssues && (
        <div className={cn(cardEffects.primary, 'p-6')}>
          <h4 className="text-lg font-semibold mb-4">🔧 修复建议</h4>
          
          <div className="space-y-3">
            <div className="alert alert-info">
              <div>
                <h5 className="font-semibold mb-2">当前统计逻辑分析:</h5>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>系统正确使用了 Set 结构避免重复计算</li>
                  <li>最终显示的员工数应该是唯一数: {employeeStats.uniqueAcrossSheets}</li>
                  <li>如果UI显示了总数 ({employeeStats.totalAcrossSheets})，这可能是显示逻辑问题</li>
                </ul>
              </div>
            </div>
            
            <div className="alert alert-success">
              <div>
                <h5 className="font-semibold mb-2">验证结果:</h5>
                <p className="text-sm">
                  统计算法 <strong>逻辑正确</strong> - 
                  使用 Set 数据结构确保员工唯一性，最终返回 allEmployees.size ({employeeStats.uniqueAcrossSheets})
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeCountDebugger;