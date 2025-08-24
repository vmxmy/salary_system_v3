import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BuildingOfficeIcon, 
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TableCellsIcon,
  RectangleGroupIcon,
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  FolderOpenIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { ModernButton } from '@/components/common/ModernButton';
import { cardEffects } from '@/styles/design-effects';
import { DepartmentTree } from '@/components/department/DepartmentTree';
import { DepartmentCardGrid } from '@/components/department/DepartmentCardGrid';
import { DepartmentSidePanel } from '@/components/department/DepartmentSidePanel';
import { DepartmentSearchPanel } from '@/components/department/DepartmentSearchPanel';
import { DepartmentBatchOperations } from '@/components/department/DepartmentBatchOperations';
import { 
  useDepartmentTree, 
  useDepartmentPayrollStats
} from '@/hooks/department';
import { useLatestPayrollPeriod } from '@/hooks/payroll';
import { filterDepartmentTree } from '@/utils/departmentFilters';
import type { DepartmentViewMode, DepartmentSearchFilters, DepartmentNode } from '@/types/department';


export default function DepartmentManagementPage() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const navigate = useNavigate();
  
  // 状态管理
  const [viewMode, setViewMode] = useState<DepartmentViewMode>('tree');
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentNode | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [sidePanelMode, setSidePanelMode] = useState<'view' | 'edit' | 'create'>('view');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchFilters, setSearchFilters] = useState<DepartmentSearchFilters>({});
  
  // 批量操作状态
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<DepartmentNode[]>([]);
  
  // 树形展开状态 - 默认展开所有节点
  const [treeExpandedNodes, setTreeExpandedNodes] = useState<Set<string>>(new Set());
  

  // 数据查询
  const { data: departmentTree = [], isLoading: isLoadingTree } = useDepartmentTree();
  
  // 获取最新有数据的薪资周期
  const { data: latestPeriod } = useLatestPayrollPeriod();
  
  // 使用最新薪资周期获取薪资统计
  const { data: payrollStats = [], isLoading: isLoadingStats } = useDepartmentPayrollStats({
    year: latestPeriod?.year ?? undefined,
    month: latestPeriod?.month ?? undefined,
    useLatestIfEmpty: true // 如果没有指定年月，自动使用最新数据
  });

  // 当部门树数据加载完成时，默认展开所有节点
  useEffect(() => {
    if (departmentTree && departmentTree.length > 0 && treeExpandedNodes.size === 0) {
      const getAllIds = (nodes: DepartmentNode[]): string[] => {
        return nodes.reduce((acc: string[], node) => {
          acc.push(node.id);
          if (node.children) {
            acc.push(...getAllIds(node.children));
          }
          return acc;
        }, []);
      };
      
      setTreeExpandedNodes(new Set(getAllIds(departmentTree)));
    }
  }, [departmentTree]);

  // 创建薪资统计映射
  const payrollStatsMap = useMemo(() => {
    const map = new Map();
    payrollStats.forEach(stat => {
      map.set(stat.department_id, stat);
    });
    return map;
  }, [payrollStats]);

  // 过滤后的部门数据
  const filteredDepartments = useMemo(() => {
    if (!Object.values(searchFilters).some(v => v !== undefined && v !== '')) {
      return departmentTree;
    }
    return filterDepartmentTree(departmentTree, searchFilters, payrollStatsMap);
  }, [departmentTree, searchFilters, payrollStatsMap]);

  // 统计信息
  const stats = useMemo(() => {
    const flatDepartments = flattenTree(filteredDepartments);
    const totalEmployees = flatDepartments.reduce((sum, dept) => sum + (dept.employee_count || 0), 0);
    
    // 正确计算平均薪资：总薪资除以总员工数
    let totalGrossPay = 0;
    let totalPayrollEmployees = 0;
    
    flatDepartments.forEach(dept => {
      const stats = payrollStatsMap.get(dept.id);
      if (stats) {
        totalGrossPay += (stats.total_gross_pay || 0);
        totalPayrollEmployees += (stats.employee_count || 0);
      }
    });
    
    const avgSalary = totalPayrollEmployees > 0 ? totalGrossPay / totalPayrollEmployees : 0;

    return {
      totalDepartments: flatDepartments.length,
      totalEmployees,
      avgSalary,
      activeDepartments: flatDepartments.filter(d => (d.employee_count || 0) > 0).length
    };
  }, [filteredDepartments, payrollStatsMap]);


  // 处理搜索
  const handleSearch = useCallback((filters: DepartmentSearchFilters) => {
    setSearchFilters(filters);
  }, []);

  // 处理部门选择
  const handleSelectDepartment = useCallback((departmentId: string) => {
    const dept = findDepartmentById(filteredDepartments, departmentId);
    if (dept) {
      setSelectedDepartment(dept);
      setSidePanelMode('view');
      setShowSidePanel(true);
    }
  }, [filteredDepartments]);

  // 处理新建部门
  const handleCreateDepartment = useCallback(() => {
    setSelectedDepartment(null);
    setSidePanelMode('create');
    setShowSidePanel(true);
  }, []);

  // 辅助函数：在树中查找部门
  const findDepartmentById = (nodes: DepartmentNode[], id: string): DepartmentNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findDepartmentById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 处理导出
  const handleExport = useCallback(() => {
    // 准备导出数据
    const flatData = flattenTree(filteredDepartments);
    const csvData = flatData.map(dept => ({
      '部门名称': dept.name,
      '员工数量': dept.employee_count || 0,
      '父级部门': '无', // DepartmentNode没有parent_department_name属性
      '创建时间': dept.created_at ? new Date(dept.created_at).toLocaleDateString() : '',
      '更新时间': dept.updated_at ? new Date(dept.updated_at).toLocaleDateString() : ''
    }));

    // 转换为CSV格式
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = (row as any)[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `部门数据_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('部门数据导出成功');
  }, [filteredDepartments, showSuccess]);

  // 跳转到薪资统计页面
  const handleViewPayrollStats = useCallback(() => {
    navigate('/organization/departments/payroll-stats');
  }, [navigate]);

  // 批量操作处理函数
  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedDepartments([]);
    }
  }, [selectionMode]);

  const handleClearSelection = useCallback(() => {
    setSelectedDepartments([]);
  }, []);

  const handleSelectionChange = useCallback((departments: DepartmentNode[]) => {
    setSelectedDepartments(departments);
  }, []);

  const handleBatchOperationComplete = useCallback(() => {
    // 批量操作完成后的处理，比如刷新数据
    setSelectedDepartments([]);
    setSelectionMode(false);
  }, []);
  
  // 树形控制功能
  const handleExpandAll = useCallback(() => {
    const getAllIds = (nodes: DepartmentNode[]): string[] => {
      return nodes.reduce((acc: string[], node) => {
        acc.push(node.id);
        if (node.children) {
          acc.push(...getAllIds(node.children));
        }
        return acc;
      }, []);
    };
    
    if (filteredDepartments) {
      setTreeExpandedNodes(new Set(getAllIds(filteredDepartments)));
    }
  }, [filteredDepartments]);
  
  const handleCollapseAll = useCallback(() => {
    setTreeExpandedNodes(new Set());
  }, []);


  const isLoading = isLoadingTree || isLoadingStats;

  // 创建自定义内容区域
  const customContent = (
    <div className="space-y-6">
      {/* 视图切换 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-base-content">
            部门列表
          </h2>
          {filteredDepartments.length !== departmentTree.length && (
            <p className="text-base-content/70 text-sm mt-1">
              已筛选 {filteredDepartments.length} / {departmentTree.length} 个部门
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* 树形控制按钮（仅在树形视图时显示） */}
          {viewMode === 'tree' && (
            <div className="flex items-center gap-2">
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={handleExpandAll}
                icon={<FolderOpenIcon className="w-4 h-4" />}
              >
                <span className="hidden sm:inline">展开全部</span>
              </ModernButton>
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={handleCollapseAll}
                icon={<FolderIcon className="w-4 h-4" />}
              >
                <span className="hidden sm:inline">折叠全部</span>
              </ModernButton>
            </div>
          )}
          
          {/* 视图切换按钮 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content/60 hidden lg:inline">视图模式</span>
            <div className="tabs tabs-boxed bg-base-200/50 p-1">
              <button
                className={cn(
                  'tab gap-1.5',
                  viewMode === 'tree' && 'tab-active'
                )}
                onClick={() => setViewMode('tree')}
                title="树形结构视图"
              >
                <BuildingOfficeIcon className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">树形</span>
              </button>
              <button
                className={cn(
                  'tab gap-1.5',
                  viewMode === 'cards' && 'tab-active'
                )}
                onClick={() => setViewMode('cards')}
                title="卡片视图"
              >
                <RectangleGroupIcon className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">卡片</span>
              </button>
              <button
                className={cn(
                  'tab gap-1.5',
                  viewMode === 'table' && 'tab-active',
                  'opacity-50 cursor-not-allowed'
                )}
                onClick={() => setViewMode('table')}
                disabled
                title="表格视图（开发中）"
              >
                <TableCellsIcon className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">表格</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 部门视图 */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="loading loading-spinner loading-lg text-primary mb-4" />
              <p className="text-base-content/70">加载部门数据中...</p>
            </div>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <BuildingOfficeIcon className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
              <p className="text-lg font-medium text-base-content/70">未找到匹配的部门</p>
              <p className="text-sm text-base-content/50 mt-2">请尝试调整搜索条件</p>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'tree' && (
              <DepartmentTree
                data={filteredDepartments}
                onSelect={handleSelectDepartment}
                selectedId={selectedDepartment?.id}
                selectionMode={selectionMode}
                selectedDepartments={selectedDepartments}
                onSelectionChange={handleSelectionChange}
                onExpandAll={handleExpandAll}
                onCollapseAll={handleCollapseAll}
                showControls={false}
                showSearch={false}
                expandedNodes={treeExpandedNodes}
                onExpandedNodesChange={setTreeExpandedNodes}
              />
            )}
            {viewMode === 'cards' && (
              <DepartmentCardGrid
                departments={filteredDepartments}
                payrollStats={payrollStatsMap}
                onSelect={handleSelectDepartment}
                selectionMode={selectionMode}
                selectedDepartments={selectedDepartments}
                onSelectionChange={handleSelectionChange}
              />
            )}
            {viewMode === 'table' && (
              <div className="text-center py-12 text-base-content/70">
                表格视图开发中...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // 创建简化的工具栏内容
  const toolbarContent = (
    <div className="flex items-center justify-between gap-4">
      {/* 高级搜索框 */}
      <div className="flex-1">
        <DepartmentSearchPanel
          onSearch={handleSearch}
          loading={isLoading}
          showAdvancedFilters={showAdvancedFilters}
          onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
        />
      </div>

      {/* 操作按钮组 */}
      <div className="flex items-center gap-2">
        {/* 创建新部门按钮 */}
        <ModernButton
          variant="primary"
          size="md"
          onClick={handleCreateDepartment}
          icon={<PlusIcon className="w-4 h-4" />}
        >
          <span className="hidden sm:inline">新建部门</span>
          <span className="sm:hidden">新建</span>
        </ModernButton>

        {/* 导出按钮 */}
        <ModernButton
          variant="ghost"
          size="md"
          onClick={handleExport}
          disabled={filteredDepartments.length === 0}
          icon={<ArrowUpTrayIcon className="w-4 h-4" />}
        >
          <span className="hidden sm:inline">导出 CSV</span>
          <span className="sm:hidden">导出</span>
        </ModernButton>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题和统计卡片 */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">部门管理</h1>
          <p className="text-base-content/70 mt-2">管理组织架构，查看部门层级和薪资统计</p>
        </div>

        {/* 数据周期提示 */}
        {latestPeriod && (
          <div className="alert alert-info mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>正在显示 {latestPeriod.year}年{latestPeriod.month}月 的薪资统计数据</span>
          </div>
        )}

        {/* 统计卡片 - 使用 DaisyUI stats 组件 */}
        <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
          <div className="stat">
            <div className="stat-figure text-primary">
              <BuildingOfficeIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">部门总数</div>
            <div className="stat-value text-primary">{stats.totalDepartments}</div>
            <div className="stat-desc">组织架构</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-info">
              <UsersIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">员工总数</div>
            <div className="stat-value text-info">{stats.totalEmployees}</div>
            <div className="stat-desc">人员规模</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-success">
              <ChartBarIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">活跃部门</div>
            <div className="stat-value text-success">{stats.activeDepartments}</div>
            <div className="stat-desc">有员工的部门</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-warning">
              <CurrencyDollarIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">平均薪资</div>
            <div className="stat-value text-warning">¥{stats.avgSalary.toFixed(0)}</div>
            <div className="stat-desc">薪资水平</div>
          </div>
        </div>
      </div>

      {/* 简化的工具栏 */}
      <div className={cardEffects.default}>
        <div className="card-body p-4">
          {toolbarContent}
        </div>
      </div>

      {/* 批量操作工具栏 */}
      {selectionMode && (
        <DepartmentBatchOperations
          selectedDepartments={selectedDepartments}
          onClearSelection={handleClearSelection}
          onOperationComplete={handleBatchOperationComplete}
        />
      )}

      {/* 部门内容区域 */}
      {customContent}

      {/* 侧边面板 */}
      <DepartmentSidePanel
        department={selectedDepartment}
        isOpen={showSidePanel}
        onClose={() => {
          setShowSidePanel(false);
          setSelectedDepartment(null);
        }}
        mode={sidePanelMode}
        onSuccess={() => {
          // 刷新数据会自动通过 React Query 处理
          setShowSidePanel(false);
          setSelectedDepartment(null);
        }}
      />

    </div>
  );
}


// 辅助函数：展开树形结构
function flattenTree(tree: DepartmentNode[]): DepartmentNode[] {
  const result: DepartmentNode[] = [];
  
  function traverse(nodes: DepartmentNode[]) {
    nodes.forEach(node => {
      result.push(node);
      if (node.children) {
        traverse(node.children);
      }
    });
  }
  
  traverse(tree);
  return result;
}