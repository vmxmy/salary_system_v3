import React, { useState, useMemo, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../components/common/DataTable';
import { ConfigActionToolbar, CommonActions } from '../../components/common/ConfigActionToolbar';
import { ConfigSearchFilter, type FilterConfig } from '../../components/common/ConfigSearchFilter';
import { BulkActionsBar, CommonBulkActions } from '../../components/common/BulkActionsBar';
import { ConfigFormModal, useConfigModal } from '../../components/common/ConfigFormModal';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { TaxConfigForm } from '../../components/payroll/TaxConfigForm';
import { useToast } from '../../hooks/useToast';
import { useTaxConfigs, useTaxConfigOptions } from '../../hooks/useTaxConfigs';
import type { TaxConfig, TaxBracket } from '../../lib/taxConfigApi';

/**
 * 个税配置管理页面
 * 重构后使用组件化设计，代码更加清晰和可维护
 */
export default function TaxConfigPage() {
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
    refresh
  } = useTaxConfigs();
  
  // 获取选项数据
  const { taxTypeOptions, regionOptions } = useTaxConfigOptions();
  
  // 模态窗口状态管理
  const createModal = useConfigModal();
  const editModal = useConfigModal();
  const viewModal = useConfigModal();
  
  // 选中项和编辑项状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingConfig, setEditingConfig] = useState<TaxConfig | null>(null);
  const [viewingConfig, setViewingConfig] = useState<TaxConfig | null>(null);
  
  // 搜索和过滤状态
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({
    tax_type: '',
    region: '',
    is_active: null
  });

  // 过滤配置
  const filterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'tax_type',
      label: '税种类型',
      type: 'select',
      options: taxTypeOptions,
      placeholder: '选择税种'
    },
    {
      key: 'region',
      label: '适用地区',
      type: 'select',
      options: regionOptions,
      placeholder: '选择地区'
    },
    {
      key: 'is_active',
      label: '状态',
      type: 'toggle',
      defaultValue: null
    }
  ], [taxTypeOptions, regionOptions]);

  // 获取税种标签 - 使用 useCallback 优化
  const getTaxTypeLabel = useCallback((type: string) => {
    const typeMap: Record<string, string> = {
      income_tax: '综合所得税',
      year_end_bonus: '年终奖税',
      labor_income: '劳务报酬税',
      author_income: '稿酬所得税'
    };
    return typeMap[type] || type;
  }, []);

  // 表格列定义
  const columns = useMemo<ColumnDef<TaxConfig>[]>(() => [
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
      accessorKey: 'tax_type',
      header: '税种类型',
      cell: ({ row }) => (
        <span className="badge badge-primary">
          {getTaxTypeLabel(row.original.tax_type)}
        </span>
      ),
      size: 120
    },
    {
      accessorKey: 'region',
      header: '适用地区',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.region}</span>
      ),
      size: 120
    },
    {
      id: 'exemptions',
      header: '免征额',
      cell: ({ row }) => {
        const exemptions = row.original.exemptions;
        if (!exemptions || !exemptions.basic) {
          return <span className="text-base-content/60">-</span>;
        }
        return (
          <span className="text-sm">
            ¥{exemptions.basic.toLocaleString()}
          </span>
        );
      },
      size: 100
    },
    {
      id: 'brackets',
      header: '税率级数',
      cell: ({ row }) => {
        const brackets = row.original.brackets;
        if (!brackets || !Array.isArray(brackets)) {
          return <span className="text-base-content/60">-</span>;
        }
        return (
          <span className="badge badge-outline badge-sm">
            {brackets.length} 级
          </span>
        );
      },
      size: 100
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
            onClick={() => handleView(row.original)}
          >
            查看
          </button>
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
      size: 150
    }
  ], [getTaxTypeLabel]);

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return data.filter(config => {
      // 搜索过滤
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!config.region.toLowerCase().includes(searchLower) &&
            !getTaxTypeLabel(config.tax_type).toLowerCase().includes(searchLower) &&
            !(config.description?.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      
      // 税种过滤
      if (filters.tax_type && config.tax_type !== filters.tax_type) {
        return false;
      }
      
      // 地区过滤
      if (filters.region && config.region !== filters.region) {
        return false;
      }
      
      // 状态过滤
      if (filters.is_active !== null && config.is_active !== filters.is_active) {
        return false;
      }
      
      return true;
    });
  }, [data, searchTerm, filters, getTaxTypeLabel]);

  // 处理创建配置
  const handleCreate = useCallback(async (formData: TaxConfig) => {
    try {
      await createConfig(formData);
      createModal.close();
      showToast('税务配置创建成功', 'success');
    } catch (error) {
      showToast('创建失败: ' + (error as Error).message, 'error');
      throw error;
    }
  }, [createConfig, createModal, showToast]);

  // 处理更新配置
  const handleUpdate = useCallback(async (formData: TaxConfig) => {
    if (!editingConfig?.id) return;
    
    try {
      await updateConfig(editingConfig.id, formData);
      editModal.close();
      setEditingConfig(null);
      showToast('税务配置更新成功', 'success');
    } catch (error) {
      showToast('更新失败: ' + (error as Error).message, 'error');
      throw error;
    }
  }, [updateConfig, editingConfig, editModal, showToast]);

  // 处理查看
  const handleView = useCallback((config: TaxConfig) => {
    setViewingConfig(config);
    viewModal.open();
  }, [viewModal]);

  // 处理编辑
  const handleEdit = useCallback((config: TaxConfig) => {
    setEditingConfig(config);
    editModal.open();
  }, [editModal]);

  // 处理删除
  const handleDelete = useCallback(async (config: TaxConfig) => {
    if (!confirm(`确定要删除 "${config.region} - ${getTaxTypeLabel(config.tax_type)}" 配置吗？`)) return;
    
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
  const handleToggleStatus = useCallback(async (config: TaxConfig) => {
    try {
      await toggleConfigStatus(config.id, !config.is_active);
      showToast(`配置已${config.is_active ? '停用' : '启用'}`, 'success');
    } catch (error) {
      showToast('状态切换失败: ' + (error as Error).message, 'error');
    }
  }, [toggleConfigStatus, showToast]);

  // 处理批量状态切换
  const handleBulkToggleStatus = useCallback(async (ids: string[], enable: boolean) => {
    try {
      await Promise.all(ids.map(id => {
        const config = data.find(c => c.id === id);
        if (config) {
          return toggleConfigStatus(id, enable);
        }
      }));
      setSelectedIds([]);
      showToast(`成功${enable ? '启用' : '停用'} ${ids.length} 个配置`, 'success');
    } catch (error) {
      showToast(`批量${enable ? '启用' : '停用'}失败`, 'error');
    }
  }, [data, toggleConfigStatus, showToast]);

  // 处理过滤器变化
  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // 处理清除过滤器
  const handleClearFilters = useCallback(() => {
    setFilters({
      tax_type: '',
      region: '',
      is_active: null
    });
    setSearchTerm('');
  }, []);

  // 渲染税率表预览 - 使用 useCallback 优化并添加安全检查
  const renderTaxBracketsPreview = useCallback((brackets: TaxBracket[]) => {
    if (!brackets || !Array.isArray(brackets)) {
      return <div className="text-base-content/60">暂无税率表数据</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>级数</th>
              <th>起征额</th>
              <th>上限</th>
              <th>税率</th>
              <th>速算扣除</th>
            </tr>
          </thead>
          <tbody>
            {brackets.map((bracket, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>¥{(bracket.min || 0).toLocaleString()}</td>
                <td>{bracket.max ? `¥${bracket.max.toLocaleString()}` : '无上限'}</td>
                <td>{((bracket.rate || 0) * 100).toFixed(2)}%</td>
                <td>¥{(bracket.deduction || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, []);

  // 页面操作按钮
  const pageActions = [
    CommonActions.create(() => createModal.open()),
    CommonActions.refresh(() => refresh(), loading)
  ];

  // 批量操作
  const bulkActions = [
    CommonBulkActions.delete(handleBulkDelete),
    CommonBulkActions.enable((ids) => handleBulkToggleStatus(ids, true)),
    CommonBulkActions.disable((ids) => handleBulkToggleStatus(ids, false))
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
          title="个税配置管理"
          description="管理个人所得税的税率、免征额和专项扣除等配置信息"
          actions={pageActions}
        />

      {/* 搜索和过滤 */}
      <ConfigSearchFilter
        searchPlaceholder="搜索地区或税种..."
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
        title="创建税务配置"
        size="xl"
        submitLabel="创建"
        onSubmit={() => {}}
      >
        <TaxConfigForm
          mode="create"
          onSubmit={handleCreate}
        />
      </ConfigFormModal>

      {/* 编辑配置模态窗口 */}
      <ConfigFormModal
        isOpen={editModal.isOpen}
        onClose={() => {
          editModal.close();
          setEditingConfig(null);
        }}
        title="编辑税务配置"
        size="xl"
        submitLabel="更新"
        onSubmit={() => {}}
      >
        {editingConfig && (
          <TaxConfigForm
            mode="edit"
            initialData={editingConfig}
            onSubmit={handleUpdate}
          />
        )}
      </ConfigFormModal>

      {/* 查看配置模态窗口 */}
      <ConfigFormModal
        isOpen={viewModal.isOpen}
        onClose={() => {
          viewModal.close();
          setViewingConfig(null);
        }}
        title="查看税务配置"
        size="xl"
        showSubmit={false}
      >
        {viewingConfig && (
          <div className="space-y-4">
            <TaxConfigForm
              mode="edit"
              initialData={viewingConfig}
              onSubmit={async () => {}}
              readonly={true}
            />
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title text-base">税率表详情</h3>
                {renderTaxBracketsPreview(viewingConfig.brackets)}
              </div>
            </div>
          </div>
        )}
      </ConfigFormModal>
      </div>
    </ErrorBoundary>
  );
}