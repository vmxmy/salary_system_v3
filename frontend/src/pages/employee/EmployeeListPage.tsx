import { useState, useMemo, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAllEmployees } from '@/hooks/useEmployees';
import { useTableConfiguration } from '@/hooks/useTableConfiguration';
import { DataTable } from '@/components/common/DataTable';
import { SimpleSearchBox } from '@/components/common/AdvancedSearchBox';
import { FieldSelector } from '@/components/common/FieldSelector';
import { PageToolbar } from '@/components/common/PageToolbar';
import { ModernButton } from '@/components/common/ModernButton';
import { EmployeeModal } from '@/components/employee/EmployeeDetailModal';
import { EmployeeExport } from '@/components/employee/EmployeeExport';
import type { SortingState, Table } from '@tanstack/react-table';

export default function EmployeeListPage() {
  const { t } = useTranslation(['employee', 'common']);
  
  // 数据获取
  const { data: allEmployees = [], isLoading, isError, error } = useAllEmployees();

  // 表格配置管理
  const {
    metadata,
    metadataLoading,
    metadataError,
    userConfig,
    columns,
    updateUserConfig,
    resetToDefault,
  } = useTableConfiguration('employees', {
    onViewDetail: (row) => {
      setSelectedEmployeeId(row.employee_id);
      setModalMode('view');
      setIsDetailModalOpen(true);
    },
  });

  // 状态管理
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [tableInstance, setTableInstance] = useState<Table<any> | null>(null);

  // 数据处理流程 - 只处理搜索，排序和分页交给 TanStack Table
  const processedData = useMemo(() => {
    let data = [...allEmployees];
    
    // 全局模糊搜索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      data = data.filter(employee => {
        // 搜索所有可能的字段
        const searchableFields = [
          employee.full_name,           // 姓名
          employee.department_name,     // 部门
          employee.position_name,       // 职位
          employee.category_name,       // 人员类别
          employee.employment_status,   // 在职状态
          employee.mobile_phone,        // 手机号
          employee.email,               // 邮箱
          employee.primary_bank_account, // 银行账户
          employee.bank_name,           // 银行名称
        ].filter(Boolean); // 过滤掉空值
        
        // 检查是否任一字段包含搜索关键词
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(query)
        );
      });
    }
    
    return data;
  }, [allEmployees, searchQuery]);

  // 搜索处理函数
  const handleSearch = () => {
    // TanStack Table 会自动重置分页到第一页
    if (tableInstance) {
      tableInstance.setPageIndex(0);
    }
  };

  const handleResetSearch = () => {
    setSearchQuery('');
    // TanStack Table 会自动重置分页到第一页
    if (tableInstance) {
      tableInstance.setPageIndex(0);
    }
  };

  // 处理新增员工
  const handleAddEmployee = () => {
    setSelectedEmployeeId(null);
    setModalMode('create');
    setIsDetailModalOpen(true);
  };

  // 处理模态框关闭
  const handleModalClose = () => {
    setIsDetailModalOpen(false);
    setSelectedEmployeeId(null);
    setModalMode('view');
  };

  // 处理创建/更新成功
  const handleModalSuccess = () => {
    // 成功后会自动刷新数据（通过 TanStack Query）
    // 模态框会自动关闭
  };

  // 处理加载状态
  const totalLoading = isLoading || metadataLoading;

  // 错误处理
  if (isError) {
    return <div className="alert alert-error">数据加载错误: {(error as Error).message}</div>;
  }

  if (metadataError) {
    return <div className="alert alert-error">表格配置加载错误: {metadataError}</div>;
  }

  if (!metadata || !userConfig) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-3">正在加载表格配置...</span>
      </div>
    );
  }


  return (
    <div className="p-6 space-y-6">
      <PageToolbar
        title={t('employee:list.title')}
        subtitle={t('employee:list.description')}
        customContent={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* 指标卡 1 */}
            <div className="stat bg-base-100 border border-base-200 rounded-lg p-4">
              <div className="stat-figure text-primary">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="stat-title text-base-content/70">总员工数</div>
              <div className="stat-value text-2xl font-bold">--</div>
              <div className="stat-desc text-base-content/50">统计信息</div>
            </div>

            {/* 指标卡 2 */}
            <div className="stat bg-base-100 border border-base-200 rounded-lg p-4">
              <div className="stat-figure text-success">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="stat-title text-base-content/70">在职员工</div>
              <div className="stat-value text-2xl font-bold text-success">--</div>
              <div className="stat-desc text-base-content/50">活跃状态</div>
            </div>

            {/* 指标卡 3 */}
            <div className="stat bg-base-100 border border-base-200 rounded-lg p-4">
              <div className="stat-figure text-warning">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="stat-title text-base-content/70">部门数量</div>
              <div className="stat-value text-2xl font-bold text-warning">--</div>
              <div className="stat-desc text-base-content/50">组织架构</div>
            </div>

            {/* 指标卡 4 */}
            <div className="stat bg-base-100 border border-base-200 rounded-lg p-4">
              <div className="stat-figure text-info">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="stat-title text-base-content/70">本月新增</div>
              <div className="stat-value text-2xl font-bold text-info">--</div>
              <div className="stat-desc text-base-content/50">入职统计</div>
            </div>
          </div>
        }
        searchComponent={
          <SimpleSearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            onReset={handleResetSearch}
            loading={totalLoading}
            placeholder="搜索员工姓名、部门、职位、手机号、邮箱..."
            className="w-full"
          />
        }
        fieldSelector={
          <FieldSelector
            fields={metadata.fields}
            userConfig={userConfig}
            onChange={updateUserConfig}
            onReset={resetToDefault}
          />
        }
        exportComponent={
          tableInstance ? (
            <EmployeeExport 
              table={tableInstance} 
              fileName="员工数据"
            />
          ) : (
            <ModernButton
              variant="primary"
              size="md"
              disabled
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              {t('common:common.export')}
            </ModernButton>
          )
        }
        extraActions={[
          <ModernButton
            key="add-employee"
            variant="primary"
            size="md"
            onClick={handleAddEmployee}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
          >
            添加员工
          </ModernButton>
        ]}
      />

      {/* 表格 */}
      <div className="overflow-x-auto">
        <DataTable
          data={processedData}
          columns={columns}
          loading={totalLoading}
          onTableReady={setTableInstance}
          initialSorting={[{ id: 'full_name', desc: false }]}
          initialPagination={{ pageIndex: 0, pageSize: 50 }}
          enableExport={false}
          showGlobalFilter={false}
          showColumnToggle={false}
        />
      </div>

      {/* 员工模态框 */}
      <EmployeeModal
        mode={modalMode}
        employeeId={selectedEmployeeId}
        open={isDetailModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}