import { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAllEmployees } from '@/hooks/useEmployees';
import { useTableConfiguration } from '@/hooks/useTableConfiguration';
import { ManagementPageLayout, type StatCardProps } from '@/components/layout/ManagementPageLayout';
import { ModernButton } from '@/components/common/ModernButton';
import { EmployeeModal } from '@/components/employee/EmployeeDetailModal';
import { EmployeeExport } from '@/components/employee/EmployeeExport';
import type { Table } from '@tanstack/react-table';

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

  // 准备统计卡片数据
  const statCards: StatCardProps[] = useMemo(() => {
    const totalEmployees = allEmployees.length;
    const activeEmployees = allEmployees.filter(emp => emp.employment_status === 'active').length;
    const departments = new Set(allEmployees.map(emp => emp.department_name).filter(Boolean)).size;
    const thisMonthNew = allEmployees.filter(emp => {
      if (!emp.hire_date) return false;
      const hireDate = new Date(emp.hire_date);
      const now = new Date();
      return hireDate.getFullYear() === now.getFullYear() && hireDate.getMonth() === now.getMonth();
    }).length;

    return [
      {
        title: '总员工数',
        value: totalEmployees || '--',
        description: '统计信息',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        colorClass: 'text-primary'
      },
      {
        title: '在职员工',
        value: activeEmployees || '--',
        description: '活跃状态',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        colorClass: 'text-success'
      },
      {
        title: '部门数量',
        value: departments || '--',
        description: '组织架构',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        colorClass: 'text-warning'
      },
      {
        title: '本月新增',
        value: thisMonthNew || '--',
        description: '入职统计',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        colorClass: 'text-info'
      }
    ];
  }, [allEmployees]);

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
    <ManagementPageLayout
      title={t('employee:list.title')}
      subtitle={t('employee:list.description')}
      statCards={statCards}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      onSearch={handleSearch}
      onSearchReset={handleResetSearch}
      searchPlaceholder="搜索员工姓名、部门、职位、手机号、邮箱..."
      searchLoading={totalLoading}
      showFieldSelector={true}
      fields={metadata.fields}
      userConfig={userConfig}
      onFieldConfigChange={updateUserConfig}
      onFieldConfigReset={resetToDefault}
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
      primaryActions={[
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
      data={processedData}
      columns={columns}
      loading={totalLoading}
      tableInstance={tableInstance}
      onTableReady={setTableInstance}
      initialSorting={[{ id: 'full_name', desc: false }]}
      initialPagination={{ pageIndex: 0, pageSize: 50 }}
      enableExport={false}
      showGlobalFilter={false}
      showColumnToggle={false}
      modal={
        <EmployeeModal
          mode={modalMode}
          employeeId={selectedEmployeeId}
          open={isDetailModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      }
    />
  );
}