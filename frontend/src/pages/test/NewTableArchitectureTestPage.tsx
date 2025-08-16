import React, { useState } from 'react';
import { 
  useEmployeeTable, 
  useSimpleEmployeeTable 
} from '@/hooks/employee/useEmployeeTable';
import { useUniversalTable } from '@/hooks/core/useUniversalTable';
import { DataTable } from '@/components/common/DataTable';

/**
 * 新表格架构测试页面
 * 用于验证动态适配的表格系统
 */
export default function NewTableArchitectureTestPage() {
  const [selectedTable, setSelectedTable] = useState<string>('employee');
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  // 员工表格测试
  const employeeTable = useEmployeeTable({
    enableRowSelection: true,
    enableActions: true,
    permissions: ['view', 'edit', 'delete'],
    showSensitiveData,
    statusFilter: 'active',
  });

  // 简单员工表格测试
  const simpleEmployeeTable = useSimpleEmployeeTable({
    statusFilter: 'all',
    showSensitiveData: false,
  });

  // 通用表格测试 - 部门表
  const departmentTable = useUniversalTable('departments', {
    enableRowSelection: true,
    enableActions: true,
    permissions: ['view', 'edit', 'delete'],
  });

  // 通用表格测试 - 薪资表
  const payrollTable = useUniversalTable('view_payroll_summary', {
    enableRowSelection: false,
    enableActions: false,
    filters: { pay_year: 2025, pay_month: 1 },
  });

  // 选择当前表格
  const getCurrentTable = () => {
    switch (selectedTable) {
      case 'employee':
        return employeeTable;
      case 'simple-employee':
        return simpleEmployeeTable;
      case 'department':
        return departmentTable;
      case 'payroll':
        return payrollTable;
      default:
        return employeeTable;
    }
  };

  const currentTable = getCurrentTable();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl mb-4">新表格架构测试</h1>
          
          {/* 控制面板 */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* 表格选择 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">选择表格类型</span>
              </label>
              <select 
                className="select select-bordered"
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
              >
                <option value="employee">员工表格（完整功能）</option>
                <option value="simple-employee">员工表格（简化版）</option>
                <option value="department">部门表格（通用）</option>
                <option value="payroll">薪资表格（通用）</option>
              </select>
            </div>

            {/* 敏感数据开关 */}
            {(selectedTable === 'employee' || selectedTable === 'simple-employee') && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">显示敏感数据</span>
                </label>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={showSensitiveData}
                  onChange={(e) => setShowSensitiveData(e.target.checked)}
                />
              </div>
            )}
          </div>

          {/* 表格统计信息 */}
          <div className="stats stats-horizontal shadow mb-6">
            <div className="stat">
              <div className="stat-title">数据加载状态</div>
              <div className={`stat-value text-sm ${currentTable.loading ? 'text-warning' : 'text-success'}`}>
                {currentTable.loading ? '加载中...' : '已加载'}
              </div>
            </div>
            
            <div className="stat">
              <div className="stat-title">数据行数</div>
              <div className="stat-value text-sm">
                {currentTable.data?.length || 0}
              </div>
            </div>
            
            <div className="stat">
              <div className="stat-title">可见列数</div>
              <div className="stat-value text-sm">
                {currentTable.visibleColumns?.length || 0}
              </div>
            </div>

            {selectedTable === 'employee' && 'statistics' in employeeTable && (
              <>
                <div className="stat">
                  <div className="stat-title">在职员工</div>
                  <div className="stat-value text-sm text-success">
                    {employeeTable.statistics.active}
                  </div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">部门数</div>
                  <div className="stat-value text-sm">
                    {employeeTable.statistics.departments}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 架构信息展示 */}
          <div className="alert alert-info mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 className="font-bold">当前架构特性</h3>
              <div className="text-sm">
                <p>✅ 动态元数据获取：从数据库自动获取表结构</p>
                <p>✅ 智能类型推断：根据字段类型自动选择渲染方式</p>
                <p>✅ 用户偏好持久化：列宽度、可见性等设置自动保存</p>
                <p>✅ 配置驱动：通过配置文件控制表格行为</p>
                <p>✅ 完全类型安全：TypeScript 全面支持</p>
              </div>
            </div>
          </div>

          {/* 错误信息 */}
          {currentTable.error && (
            <div className="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>加载失败: {currentTable.error.message}</span>
            </div>
          )}

          {/* 数据表格 */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title mb-4">
                {currentTable.tableConfig?.displayName || '数据表格'}
                {currentTable.loading && <span className="loading loading-spinner loading-sm"></span>}
              </h2>
              
              <DataTable
                data={currentTable.data || []}
                columns={currentTable.columns}
                loading={currentTable.loading}
                // 启用搜索（如果有搜索字段）
                globalFilter={currentTable.searchableFields?.length ? '' : undefined}
                // 启用分页
                initialPagination={{
                  pageSize: 10,
                  pageIndex: 0,
                }}
                // 默认排序
                initialSorting={currentTable.defaultSorting}
              />
            </div>
          </div>

          {/* 调试信息 */}
          <div className="collapse collapse-arrow bg-base-200 mt-6">
            <input type="checkbox" />
            <div className="collapse-title text-lg font-medium">
              调试信息 (开发使用)
            </div>
            <div className="collapse-content">
              <div className="space-y-4">
                {/* 元数据信息 */}
                <div>
                  <h4 className="font-bold">表元数据</h4>
                  <pre className="bg-base-300 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify({
                      tableName: currentTable.metadata?.tableName,
                      displayName: currentTable.metadata?.displayName,
                      columnCount: currentTable.metadata?.columns?.length,
                      columns: currentTable.metadata?.columns?.map(col => ({
                        name: col.name,
                        type: col.type,
                        label: col.label,
                      }))
                    }, null, 2)}
                  </pre>
                </div>

                {/* 用户偏好 */}
                <div>
                  <h4 className="font-bold">用户偏好设置</h4>
                  <pre className="bg-base-300 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(currentTable.preferences, null, 2)}
                  </pre>
                </div>

                {/* 可见列 */}
                <div>
                  <h4 className="font-bold">当前可见列</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentTable.visibleColumns?.map(col => (
                      <span key={col} className="badge badge-outline">{col}</span>
                    ))}
                  </div>
                </div>

                {/* 搜索字段 */}
                <div>
                  <h4 className="font-bold">搜索字段</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentTable.searchableFields?.map(field => (
                      <span key={field} className="badge badge-primary badge-outline">{field}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}