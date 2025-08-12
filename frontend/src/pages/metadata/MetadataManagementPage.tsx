import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MetadataTable } from '@/components/metadata/MetadataTable';
import { MetadataToolbar } from '@/components/metadata/MetadataToolbar';
import { MetadataActions } from '@/components/metadata/MetadataActions';
import { useToast } from '@/contexts/ToastContext';
import { useMetadataStore } from '@/stores/metadata.store';
import { payrollService, PayrollService } from '@/services/payroll.service';
import { metadataService } from '@/services/metadata.service';
import { PayrollExportService } from '@/services/payroll-export.service';
import * as XLSX from 'xlsx';
import { getCurrentYearMonth } from '@/lib/dateUtils';
import type { EmployeeMetadata, FilterOptions } from '@/types/metadata';

export default function MetadataManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const {
    employees,
    loading,
    filters,
    pagination,
    selectedRows,
    setEmployees,
    setLoading,
    setFilters,
    setPagination,
    setSelectedRows,
    clearSelection
  } = useMetadataStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // 简化的筛选状态
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [activeSearchText, setActiveSearchText] = useState('');

  // 从URL参数初始化
  useEffect(() => {
    const month = searchParams.get('month');
    const status = searchParams.get('status');
    const page = searchParams.get('page');
    
    if (month) {
      setSelectedMonth(month);
    }
    if (status) {
      setStatusFilter(status);
    }
    if (page) {
      setPagination({ ...pagination, current: parseInt(page) });
    }
  }, []);

  // 处理搜索
  const handleSearch = () => {
    setActiveSearchText(searchText);
    setPagination({ ...pagination, current: 1 });
  };

  // 获取员工数据 - 使用现有的服务层
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // 构建筛选参数
      const serviceFilters: any = {
        page: pagination.current,
        pageSize: pagination.pageSize
      };

      // 转换筛选条件
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        serviceFilters.startDate = `${year}-${month.padStart(2, '0')}-01`;
        serviceFilters.endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().slice(0, 10);
      }
      if (statusFilter !== 'all') {
        serviceFilters.status = statusFilter;
      }
      if (activeSearchText) {
        serviceFilters.search = activeSearchText;
      }

      // 调用服务层获取数据
      const result = await PayrollService.getPayrolls(serviceFilters);

      // 转换数据格式以匹配前端接口
      const transformedData = result.data.map((item: any) => ({
        payroll_id: item.payroll_id,
        employee_id: item.employee_id,
        employee_name: item.employee_name || item.employee?.employee_name,
        id_number: item.employee?.id_number,
        department_name: item.department_name,
        position_name: '未知职务', // 服务层暂未返回此字段
        category_name: '未知类别', // 服务层暂未返回此字段
        pay_period_start: item.pay_period_start,
        pay_period_end: item.pay_period_end,
        pay_date: item.pay_date,
        gross_pay: item.gross_pay,
        total_deductions: item.total_deductions,
        net_pay: item.net_pay,
        status: item.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      setEmployees(transformedData);
      setPagination({
        ...pagination,
        total: result.total,
        current: result.page
      });
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      showError('获取员工数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 监听筛选条件变化
  useEffect(() => {
    fetchEmployees();
    
    // 更新URL参数
    const params = new URLSearchParams();
    if (selectedMonth) params.set('month', selectedMonth);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (pagination.current > 1) params.set('page', pagination.current.toString());
    setSearchParams(params);
  }, [selectedMonth, statusFilter, activeSearchText, pagination.current, pagination.pageSize]);


  // 处理分页变化
  const handlePaginationChange = (page: number, pageSize?: number) => {
    setPagination({
      ...pagination,
      current: page,
      pageSize: pageSize || pagination.pageSize
    });
  };

  // 处理批量操作
  const handleBatchAction = async (action: string) => {
    // export-all 不需要选中项
    if (action === 'export-all') {
      await handleExportAll();
      return;
    }
    
    // 其他操作需要选中项
    if (selectedRows.length === 0 && action !== 'add') {
      showError('请先选择要操作的员工');
      return;
    }

    switch (action) {
      case 'export':
        await handleExport();
        break;
      case 'delete':
        await handleBatchDelete();
        break;
      case 'lock':
        await handleBatchLock();
        break;
      case 'unlock':
        await handleBatchUnlock();
        break;
      case 'add':
        // TODO: 实现新增员工功能
        showSuccess('新增员工功能正在开发中');
        break;
      default:
        break;
    }
  };

  // 处理导出 - 使用Excel服务
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 如果有选中的行，只导出选中的数据
      const dataToExport = selectedRows.length > 0 
        ? employees.filter(emp => selectedRows.includes(emp.payroll_id))
        : employees;

      if (dataToExport.length === 0) {
        showError('没有可导出的数据');
        return;
      }

      // 使用XLSX直接导出数据
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '薪资数据');
      
      // 设置列宽
      worksheet['!cols'] = [
        { wch: 15 }, // employee_name
        { wch: 20 }, // id_number
        { wch: 20 }, // department_name
        { wch: 15 }, // position_name
        { wch: 15 }, // category_name
        { wch: 12 }, // pay_period_start
        { wch: 12 }, // pay_period_end
        { wch: 12 }, // pay_date
        { wch: 12 }, // gross_pay
        { wch: 12 }, // total_deductions
        { wch: 12 }, // net_pay
        { wch: 20 }, // primary_bank_account
        { wch: 15 }, // bank_name
        { wch: 10 }  // status
      ];
      
      const filename = `薪资数据_${filters.period || '全部'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);

      showSuccess(`成功导出 ${dataToExport.length} 条记录`);
    } catch (error) {
      console.error('Export failed:', error);
      showError('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  // 处理导出全部 - 获取所有数据并导出
  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      // 获取所有数据（不分页）
      const serviceFilters = {
        search: filters.searchText,
        page: 1,
        pageSize: 10000 // 获取所有数据
      };

      const result = await payrollService.getPayrolls(serviceFilters);
      
      if (!result.data || result.data.length === 0) {
        showError('没有可导出的数据');
        return;
      }

      // 转换数据格式以匹配 EmployeeMetadata 接口
      const exportData = result.data.map((item: any) => ({
        ...item,
        position_name: item.position_name || '',
        category_name: item.category_name || '',
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString()
      }));
      
      // 使用XLSX直接导出数据
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '薪资数据');
      
      // 设置列宽
      worksheet['!cols'] = [
        { wch: 15 }, // employee_name
        { wch: 20 }, // id_number
        { wch: 20 }, // department_name
        { wch: 15 }, // position_name
        { wch: 15 }, // category_name
        { wch: 12 }, // pay_period_start
        { wch: 12 }, // pay_period_end
        { wch: 12 }, // pay_date
        { wch: 12 }, // gross_pay
        { wch: 12 }, // total_deductions
        { wch: 12 }, // net_pay
        { wch: 20 }, // primary_bank_account
        { wch: 15 }, // bank_name
        { wch: 10 }  // status
      ];
      
      const filename = `薪资数据_全部_${filters.period || '所有期间'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);

      showSuccess(`成功导出全部 ${exportData.length} 条记录`);
    } catch (error) {
      console.error('Export all failed:', error);
      showError('导出全部数据失败');
    } finally {
      setIsExporting(false);
    }
  };

  // 处理批量删除 - 使用服务层
  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedRows.length} 条记录吗？`)) {
      return;
    }

    try {
      // 调用服务层批量删除（仅限草稿状态）
      const deletePromises = selectedRows.map(payrollId => 
        payrollService.deletePayroll(payrollId)
      );
      
      await Promise.all(deletePromises);

      showSuccess(`成功删除 ${selectedRows.length} 条记录`);
      clearSelection();
      fetchEmployees();
    } catch (error) {
      console.error('Batch delete failed:', error);
      showError('批量删除失败');
    }
  };

  // 处理批量锁定 - 使用服务层
  const handleBatchLock = async () => {
    try {
      await payrollService.updateBatchPayrollStatus(selectedRows, 'approved');

      showSuccess(`成功锁定 ${selectedRows.length} 条记录`);
      clearSelection();
      fetchEmployees();
    } catch (error) {
      console.error('Batch lock failed:', error);
      showError('批量锁定失败');
    }
  };

  // 处理批量解锁 - 使用服务层
  const handleBatchUnlock = async () => {
    try {
      await payrollService.updateBatchPayrollStatus(selectedRows, 'draft');

      showSuccess(`成功解锁 ${selectedRows.length} 条记录`);
      clearSelection();
      fetchEmployees();
    } catch (error) {
      console.error('Batch unlock failed:', error);
      showError('批量解锁失败');
    }
  };

  // 计算统计信息
  const statistics = useMemo(() => {
    if (!employees.length) return null;

    const totalSalary = employees.reduce((sum, emp) => sum + (parseFloat(emp.gross_pay) || 0), 0);
    const totalDeductions = employees.reduce((sum, emp) => sum + (parseFloat(emp.total_deductions) || 0), 0);
    const averageSalary = totalSalary / employees.length;

    return {
      totalEmployees: pagination.total,
      totalSalary,
      totalDeductions,
      averageSalary,
      departmentCount: new Set(employees.map(e => e.department_name)).size,
      positionCount: new Set(employees.map(e => e.position_name)).size
    };
  }, [employees, pagination.total]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-content">
            薪资元数据管理
          </h1>
          <p className="text-base-content/60 mt-1">
            管理员工薪资数据，支持查看、编辑、导入导出等操作
          </p>
        </div>
        
        {/* 统计信息 */}
        {statistics && (
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">总人数</div>
              <div className="stat-value text-primary">
                {statistics.totalEmployees}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">应发总额</div>
              <div className="stat-value text-sm">
                ¥{statistics.totalSalary.toLocaleString()}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">扣除总额</div>
              <div className="stat-value text-sm">
                ¥{statistics.totalDeductions.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 工具栏 */}
      <MetadataToolbar
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        searchText={searchText}
        onSearchChange={setSearchText}
        onSearch={handleSearch}
        onExport={handleExportAll}
        isExporting={isExporting}
      />

      {/* 操作栏 */}
      <MetadataActions
        selectedCount={selectedRows.length}
        onAction={handleBatchAction}
        isExporting={isExporting}
        isImporting={isImporting}
      />

      {/* 数据表格 */}
      <MetadataTable
        data={employees}
        loading={loading}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        onRefresh={fetchEmployees}
      />
    </div>
  );
}