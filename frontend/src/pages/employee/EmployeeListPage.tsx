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
  } = useTableConfiguration('employees');

  // 客户端数据处理
  const { sortEmployees, paginateEmployees } = useEmployeeListFiltering();

  // 状态管理
  const [sorting, setSorting] = useState<SortingState>([{ id: 'full_name', desc: false }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-base-content">{t('employee:list.title')}</h1>
        <p className="text-base-content/70 mt-2">{t('employee:list.description')}</p>
      </header>

      {/* 工具栏：搜索框和字段选择器 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <SimpleSearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          onReset={handleResetSearch}
          loading={totalLoading}
          placeholder="搜索员工姓名、部门、职位、手机号、邮箱..."
          className="flex-1 max-w-md"
        />
        
        <FieldSelector
          fields={metadata.fields}
          userConfig={userConfig}
          onChange={updateUserConfig}
          onReset={resetToDefault}
          className="shrink-0"
        />
      </div>

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
          enableExport={true}
          exportFileName="employees"
          showGlobalFilter={false}
          showColumnToggle={false}
        />
      </div>
    </div>
  );
}