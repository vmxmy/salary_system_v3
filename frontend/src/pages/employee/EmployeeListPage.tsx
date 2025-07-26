import { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  useAllEmployees, 
  useEmployeeListFiltering
} from '@/hooks/useEmployees';
import { useTableConfiguration } from '@/hooks/useTableConfiguration';
import { DataTable } from '@/components/common/DataTable';
import { SimpleSearchBox } from '@/components/common/AdvancedSearchBox';
import { FieldSelector } from '@/components/common/FieldSelector';
import { PageToolbar } from '@/components/common/PageToolbar';
import { ModernButton } from '@/components/common/ModernButton';
import { EmployeeDetailModal } from '@/components/employee/EmployeeDetailModal';
import type { SortingState } from '@tanstack/react-table';

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
      setIsDetailModalOpen(true);
    },
  });

  // 客户端数据处理
  const { sortEmployees, paginateEmployees } = useEmployeeListFiltering();

  // 状态管理
  const [sorting, setSorting] = useState<SortingState>([{ id: 'full_name', desc: false }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 数据处理流程
  const processedData = useMemo(() => {
    let data = [...allEmployees];
    
    // 1. 全局模糊搜索
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
    
    // 2. 排序
    if (sorting.length > 0) {
      const { id, desc } = sorting[0];
      data = sortEmployees(data, id, desc ? 'desc' : 'asc');
    }
    
    return data;
  }, [allEmployees, searchQuery, sorting, sortEmployees]);

  // 分页处理
  const paginatedData = useMemo(() => {
    return paginateEmployees(processedData, pagination.pageIndex + 1, pagination.pageSize);
  }, [processedData, pagination, paginateEmployees]);

  // 搜索处理函数
  const handleSearch = () => {
    // 重置分页到第一页
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const handleResetSearch = () => {
    setSearchQuery('');
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
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

  // 准备导出功能
  const handleExport = () => {
    // 这里可以实现数据导出功能
    console.log('导出员工数据', processedData);
  };

  return (
    <div className="p-6 space-y-6">
      <PageToolbar
        title={t('employee:list.title')}
        subtitle={t('employee:list.description')}
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
          <ModernButton
            variant="secondary"
            size="md"
            onClick={handleExport}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            {t('common:common.export')}
          </ModernButton>
        }
        extraActions={[
          <ModernButton
            key="add-employee"
            variant="primary"
            size="md"
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
          data={paginatedData.data}
          columns={columns}
          loading={totalLoading}
          pageCount={paginatedData.totalPages}
          totalRows={paginatedData.total}
          currentPage={pagination.pageIndex + 1}
          onPaginationChange={setPagination}
          onSortingChange={setSorting}
          enableExport={false}
          showGlobalFilter={false}
          showColumnToggle={false}
        />
      </div>

      {/* 员工详情模态框 */}
      <EmployeeDetailModal
        employeeId={selectedEmployeeId}
        open={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEmployeeId(null);
        }}
      />
    </div>
  );
}