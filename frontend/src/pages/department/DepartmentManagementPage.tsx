import { useState, useMemo, useCallback } from 'react';
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
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { ModernButton } from '@/components/common/ModernButton';
import { PageHeader, PageContent } from '@/components/layout/PageLayout';
import { DepartmentTree } from '@/components/department/DepartmentTree';
import { DepartmentCardGrid } from '@/components/department/DepartmentCardGrid';
import { DepartmentDetailModal } from '@/components/department/DepartmentDetailModal';
import { DepartmentSearchPanel } from '@/components/department/DepartmentSearchPanel';
import { DepartmentBatchOperations } from '@/components/department/DepartmentBatchOperations';
import { DepartmentImportExport } from '@/components/department/DepartmentImportExport';
import { 
  useDepartmentTree, 
  useDepartmentPayrollStats 
} from '@/hooks/useDepartments';
import { filterDepartmentTree } from '@/utils/departmentFilters';
import type { DepartmentViewMode, DepartmentSearchFilters, DepartmentNode } from '@/types/department';

export default function DepartmentManagementPage() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const navigate = useNavigate();
  
  // 状态管理
  const [viewMode, setViewMode] = useState<DepartmentViewMode>('tree');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailModalMode, setDetailModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchFilters, setSearchFilters] = useState<DepartmentSearchFilters>({});
  
  // 批量操作状态
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<DepartmentNode[]>([]);
  
  // 导入导出状态
  const [showImportExport, setShowImportExport] = useState(false);
  const [importExportType, setImportExportType] = useState<'import' | 'export'>('import');

  // 数据查询
  const { data: departmentTree = [], isLoading: isLoadingTree } = useDepartmentTree();
  
  // 获取当前月份的薪资统计
  const currentDate = new Date();
  const { data: payrollStats = [], isLoading: isLoadingStats } = useDepartmentPayrollStats({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1
  });

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
    const avgSalary = flatDepartments.reduce((sum, dept) => {
      const stats = payrollStatsMap.get(dept.id);
      return sum + (stats?.avg_gross_pay || 0);
    }, 0) / (flatDepartments.length || 1);

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
    setSelectedDepartmentId(departmentId);
    setDetailModalMode('view');
    setShowDetailModal(true);
  }, []);

  // 处理新建部门
  const handleCreateDepartment = useCallback(() => {
    setSelectedDepartmentId(undefined);
    setDetailModalMode('create');
    setShowDetailModal(true);
  }, []);

  // 处理导入
  const handleImport = useCallback(() => {
    setImportExportType('import');
    setShowImportExport(true);
  }, []);

  // 处理导出
  const handleExport = useCallback(() => {
    setImportExportType('export');
    setShowImportExport(true);
  }, []);

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

  // 处理导入完成
  const handleImportComplete = useCallback(() => {
    // 刷新部门数据
    // TODO: 添加刷新逻辑
    setShowImportExport(false);
    showSuccess('部门数据导入完成，正在刷新...');
  }, [showSuccess]);

  const isLoading = isLoadingTree || isLoadingStats;

  return (
    <>
      <PageHeader
        title="部门管理"
        description="管理组织架构，查看部门层级和薪资统计"
        icon={BuildingOfficeIcon}
        iconClassName="text-purple-500 dark:text-purple-400"
        actions={
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {/* 移动端优先显示主要操作 */}
            <div className="hidden sm:flex gap-3">
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={handleViewPayrollStats}
              >
                <DocumentChartBarIcon className="w-4 h-4 mr-2" />
                薪资统计
              </ModernButton>
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={handleImport}
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                导入
              </ModernButton>
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={handleExport}
              >
                <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                导出
              </ModernButton>
              <ModernButton
                variant={selectionMode ? "secondary" : "ghost"}
                size="sm"
                onClick={handleToggleSelectionMode}
              >
                <TableCellsIcon className="w-4 h-4 mr-2" />
                {selectionMode ? '退出批量' : '批量操作'}
              </ModernButton>
            </div>
            
            {/* 移动端简化版操作 */}
            <div className="flex sm:hidden gap-2">
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={handleViewPayrollStats}
                title="薪资统计"
              >
                <DocumentChartBarIcon className="w-4 h-4" />
              </ModernButton>
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={handleImport}
                title="导入"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
              </ModernButton>
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={handleExport}
                title="导出"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
              </ModernButton>
              <ModernButton
                variant={selectionMode ? "secondary" : "ghost"}
                size="sm"
                onClick={handleToggleSelectionMode}
                title={selectionMode ? '退出批量' : '批量操作'}
              >
                <TableCellsIcon className="w-4 h-4" />
              </ModernButton>
            </div>
            
            <ModernButton
              variant="primary"
              size="sm"
              onClick={handleCreateDepartment}
              className="flex-shrink-0"
            >
              <PlusIcon className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">新建部门</span>
            </ModernButton>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="部门总数"
              value={stats.totalDepartments}
              icon={<BuildingOfficeIcon className="w-5 h-5" />}
              color="purple"
            />
            <StatCard
              title="员工总数"
              value={stats.totalEmployees}
              icon={<UsersIcon className="w-5 h-5" />}
              color="blue"
            />
            <StatCard
              title="活跃部门"
              value={stats.activeDepartments}
              icon={<ChartBarIcon className="w-5 h-5" />}
              color="green"
            />
            <StatCard
              title="平均薪资"
              value={`¥${stats.avgSalary.toFixed(0)}`}
              icon={<CurrencyDollarIcon className="w-5 h-5" />}
              color="yellow"
            />
          </div>

          {/* 搜索面板 */}
          <DepartmentSearchPanel
            onSearch={handleSearch}
            loading={isLoading}
            showAdvancedFilters={showAdvancedFilters}
            onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
          />

          {/* 批量操作工具栏 */}
          {selectionMode && (
            <DepartmentBatchOperations
              selectedDepartments={selectedDepartments}
              onClearSelection={handleClearSelection}
              onOperationComplete={handleBatchOperationComplete}
            />
          )}

          {/* 视图切换 */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                部门列表
              </h2>
              {filteredDepartments.length !== departmentTree.length && (
                <p className="text-text-secondary text-sm mt-1">
                  已筛选 {filteredDepartments.length} / {departmentTree.length} 个部门
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary hidden sm:inline">视图：</span>
              <div className="join w-full sm:w-auto">
                <button
                  className={cn(
                    'join-item btn btn-sm flex-1 sm:flex-none',
                    viewMode === 'tree' ? 'btn-primary' : 'btn-ghost'
                  )}
                  onClick={() => setViewMode('tree')}
                >
                  <BuildingOfficeIcon className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">树形结构</span>
                </button>
                <button
                  className={cn(
                    'join-item btn btn-sm flex-1 sm:flex-none',
                    viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'
                  )}
                  onClick={() => setViewMode('cards')}
                >
                  <RectangleGroupIcon className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">卡片视图</span>
                </button>
                <button
                  className={cn(
                    'join-item btn btn-sm flex-1 sm:flex-none',
                    viewMode === 'table' ? 'btn-primary' : 'btn-ghost'
                  )}
                  onClick={() => setViewMode('table')}
                  disabled
                >
                  <TableCellsIcon className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">表格视图</span>
                </button>
              </div>
            </div>
          </div>

          {/* 部门视图 */}
          <div className="min-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="loading loading-spinner loading-lg text-primary mb-4" />
                  <p className="text-text-secondary">加载部门数据中...</p>
                </div>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <BuildingOfficeIcon className="w-16 h-16 text-text-disabled mx-auto mb-4" />
                  <p className="text-lg font-medium text-text-secondary">未找到匹配的部门</p>
                  <p className="text-sm text-text-tertiary mt-2">请尝试调整搜索条件</p>
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'tree' && (
                  <DepartmentTree
                    data={filteredDepartments}
                    onSelect={handleSelectDepartment}
                    selectedId={selectedDepartmentId}
                    selectionMode={selectionMode}
                    selectedDepartments={selectedDepartments}
                    onSelectionChange={handleSelectionChange}
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
                  <div className="text-center py-12 text-text-secondary">
                    表格视图开发中...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </PageContent>

      {/* 部门详情模态框 */}
      {showDetailModal && (
        <DepartmentDetailModal
          departmentId={selectedDepartmentId || undefined}
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          mode={detailModalMode}
        />
      )}

      {/* 导入导出模态框 */}
      <DepartmentImportExport
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        type={importExportType}
        departments={flattenTree(departmentTree)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'purple' | 'blue' | 'green' | 'yellow';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    purple: 'bg-purple-500/10 text-purple-500 dark:bg-purple-400/10 dark:text-purple-400',
    blue: 'bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-500 dark:bg-green-400/10 dark:text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-500 dark:bg-yellow-400/10 dark:text-yellow-400'
  };

  return (
    <div className="card bg-base-100 shadow-lg border border-base-200">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-base-content/70">{title}</p>
            <p className="text-2xl font-bold text-base-content mt-1">{value}</p>
          </div>
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            colorClasses[color]
          )}>
            {icon}
          </div>
        </div>
      </div>
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