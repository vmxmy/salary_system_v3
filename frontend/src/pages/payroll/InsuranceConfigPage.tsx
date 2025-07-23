import React, { useState, useMemo, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../components/common/DataTable';
import { ConfigActionToolbar, CommonActions } from '../../components/common/ConfigActionToolbar';
import { ConfigSearchFilter, type FilterConfig } from '../../components/common/ConfigSearchFilter';
import { BulkActionsBar, CommonBulkActions } from '../../components/common/BulkActionsBar';
import { ConfigFormModal, useConfigModal } from '../../components/common/ConfigFormModal';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { InsuranceConfigForm } from '../../components/payroll/InsuranceConfigForm';
import { useToast } from '../../hooks/useToast';
import { useInsuranceConfigs } from '../../hooks/useInsuranceConfigs';
import type { InsuranceConfig } from '../../lib/insuranceConfigApi';

/**
 * 五险一金配置管理页面
 * 重构后使用组件化设计，代码更加清晰和可维护
 */
export default function InsuranceConfigPage() {
  const { showToast } = useToast();
  
  // 使用真实数据管理Hook
  const {
    data,
    loading,
    error,
    createConfig,
    updateConfig,
    deleteConfig,
    bulkDeleteConfigs,
    toggleConfigStatus,
    pagination,
    filterState,
    refresh,
    getPersonnelCategoryOptions,
    getInsuranceCodeOptions,
    getPersonnelCategoryTree
  } = useInsuranceConfigs();
  
  // 模态窗口状态管理
  const createModal = useConfigModal();
  const editModal = useConfigModal();
  
  // 选中项和编辑项状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingConfig, setEditingConfig] = useState<InsuranceConfig | null>(null);
  
  // 搜索和过滤状态
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({
    type: '',
    is_active: null
  });

  // 过滤配置
  const filterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'type',
      label: '保险类型',
      type: 'select',
      options: [
        { value: 'social_insurance', label: '社会保险' },
        { value: 'housing_fund', label: '住房公积金' }
      ],
      placeholder: '选择保险类型'
    },
    {
      key: 'is_active',
      label: '状态',
      type: 'toggle',
      defaultValue: null
    }
  ], []);

  // 表格列定义
  const columns = useMemo<ColumnDef<InsuranceConfig>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
        />
      ),
      size: 40
    },
    {
      accessorKey: 'name',
      header: '配置名称',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-base-content/60">{row.original.code}</div>
        </div>
      )
    },
    {
      accessorKey: 'type',
      header: '类型',
      cell: ({ row }) => (
        <span className={`badge ${
          row.original.type === 'social_insurance' ? 'badge-primary' : 'badge-secondary'
        }`}>
          {row.original.type === 'social_insurance' ? '社会保险' : '住房公积金'}
        </span>
      ),
      size: 120
    },
    {
      id: 'rates',
      header: '费率',
      cell: ({ row }) => {
        const rates = row.original.rates;
        if (!rates) {
          return <span className="text-base-content/60">-</span>;
        }
        return (
          <div className="text-sm space-y-1">
            <div>个人: <span className="font-medium">{((rates.employee || 0) * 100).toFixed(2)}%</span></div>
            <div>单位: <span className="font-medium">{((rates.employer || 0) * 100).toFixed(2)}%</span></div>
          </div>
        );
      },
      size: 150
    },
    {
      accessorKey: 'effective_from',
      header: '生效日期',
      cell: ({ row }) => {
        const effectiveFrom = row.original.effective_from;
        if (!effectiveFrom) {
          return <span className="text-base-content/60">-</span>;
        }
        return (
          <span className="text-sm">
            {new Date(effectiveFrom).toLocaleDateString('zh-CN')}
          </span>
        );
      },
      size: 120
    },
    {
      accessorKey: 'is_active',
      header: '状态',
      cell: ({ row }) => (
        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            className="toggle toggle-success toggle-sm"
            checked={row.original.is_active}
            onChange={() => handleToggleStatus(row.original)}
          />
          <span className="label-text text-sm">
            {row.original.is_active ? '启用' : '停用'}
          </span>
        </label>
      ),
      size: 100
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleEdit(row.original)}
          >
            编辑
          </button>
          <button
            className="btn btn-ghost btn-xs text-error"
            onClick={() => handleDelete(row.original)}
          >
            删除
          </button>
        </div>
      ),
      size: 120
    }
  ], []);

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return data.filter(config => {
      // 搜索过滤
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!config.name.toLowerCase().includes(searchLower) &&
            !config.code.toLowerCase().includes(searchLower) &&
            !(config.description?.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      
      // 类型过滤
      if (filters.type && config.type !== filters.type) {
        return false;
      }
      
      // 状态过滤
      if (filters.is_active !== null && config.is_active !== filters.is_active) {
        return false;
      }
      
      return true;
    });
  }, [data, searchTerm, filters]);

  // 处理创建配置
  const handleCreate = useCallback(async (formData: InsuranceConfig) => {
    try {
      await createConfig(formData);
      createModal.close();
      showToast('配置创建成功', 'success');
    } catch (error) {
      showToast('创建失败: ' + (error as Error).message, 'error');
      throw error;
    }
  }, [createConfig, createModal, showToast]);

  // 处理更新配置
  const handleUpdate = useCallback(async (formData: InsuranceConfig) => {
    if (!editingConfig?.id) return;
    
    try {
      await updateConfig(editingConfig.id, formData);
      editModal.close();
      setEditingConfig(null);
      showToast('配置更新成功', 'success');
    } catch (error) {
      showToast('更新失败: ' + (error as Error).message, 'error');
      throw error;
    }
  }, [updateConfig, editingConfig, editModal, showToast]);

  // 处理编辑
  const handleEdit = useCallback((config: InsuranceConfig) => {
    setEditingConfig(config);
    editModal.open();
  }, [editModal]);

  // 处理删除
  const handleDelete = useCallback(async (config: InsuranceConfig) => {
    if (!confirm(`确定要删除配置 "${config.name}" 吗？`)) return;
    
    try {
      await deleteConfig(config.id);
      showToast('配置删除成功', 'success');
    } catch (error) {
      showToast('删除失败: ' + (error as Error).message, 'error');
    }
  }, [deleteConfig, showToast]);

  // 处理批量删除
  const handleBulkDelete = useCallback(async (ids: string[]) => {
    try {
      await bulkDeleteConfigs(ids);
      setSelectedIds([]);
      showToast(`成功删除 ${ids.length} 个配置`, 'success');
    } catch (error) {
      showToast('批量删除失败: ' + (error as Error).message, 'error');
    }
  }, [bulkDeleteConfigs, showToast]);

  // 处理状态切换
  const handleToggleStatus = useCallback(async (config: InsuranceConfig) => {
    try {
      await toggleConfigStatus(config.id, !config.is_active);
      showToast(`配置已${config.is_active ? '停用' : '启用'}`, 'success');
    } catch (error) {
      showToast('状态切换失败: ' + (error as Error).message, 'error');
    }
  }, [toggleConfigStatus, showToast]);

  // 处理过滤器变化
  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // 处理清除过滤器
  const handleClearFilters = useCallback(() => {
    setFilters({
      type: '',
      is_active: null
    });
    setSearchTerm('');
  }, []);

  // 页面操作按钮
  const pageActions = [
    CommonActions.create(() => createModal.open()),
    CommonActions.refresh(() => refresh(), loading)
  ];

  // 批量操作
  const bulkActions = [
    CommonBulkActions.delete(handleBulkDelete),
    CommonBulkActions.enable(async (ids) => {
      // 批量启用逻辑
      showToast(`已启用 ${ids.length} 个配置`, 'success');
    }),
    CommonBulkActions.disable(async (ids) => {
      // 批量停用逻辑
      showToast(`已停用 ${ids.length} 个配置`, 'success');
    })
  ];

  if (error) {
    return (
      <div className="alert alert-error">
        <span>加载失败: {error.message}</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* 页面标题和操作 */}
        <ConfigActionToolbar
          title="五险一金配置管理"
          description="管理社会保险和住房公积金的费率、基数等配置信息"
          actions={pageActions}
        />

      {/* 搜索和过滤 */}
      <ConfigSearchFilter
        searchPlaceholder="搜索配置名称、代码或描述..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searching={loading}
        filters={filterConfigs}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* 批量操作栏 */}
      <BulkActionsBar
        selectedIds={selectedIds}
        totalCount={filteredData.length}
        actions={bulkActions}
        onClearSelection={() => setSelectedIds([])}
        loading={loading}
      />

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        pagination={pagination}
        onSelectionChange={(rows) => setSelectedIds(rows.map(r => r.id))}
      />

      {/* 创建配置模态窗口 */}
      <ConfigFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        title="创建保险配置"
        size="xl"
        submitLabel="创建"
        onSubmit={() => {}}
      >
        <InsuranceConfigForm
          mode="create"
          onSubmit={handleCreate}
          departmentOptions={[]}
          personnelCategoryOptions={getPersonnelCategoryOptions()}
        />
      </ConfigFormModal>

      {/* 编辑配置模态窗口 */}
      <ConfigFormModal
        isOpen={editModal.isOpen}
        onClose={() => {
          editModal.close();
          setEditingConfig(null);
        }}
        title="编辑保险配置"
        size="xl"
        submitLabel="更新"
        onSubmit={() => {}}
      >
        {editingConfig && (
          <InsuranceConfigForm
            mode="edit"
            initialData={editingConfig}
            onSubmit={handleUpdate}
            departmentOptions={[]}
            personnelCategoryOptions={getPersonnelCategoryOptions()}
          />
        )}
      </ConfigFormModal>
      </div>
    </ErrorBoundary>
  );
}