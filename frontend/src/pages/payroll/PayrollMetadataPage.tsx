import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useTableConfiguration } from '@/hooks/useTableConfiguration';
import { ManagementPageLayout, type StatCardProps } from '@/components/layout/ManagementPageLayout';
import { ModernButton } from '@/components/common/ModernButton';
import { useToast } from '@/contexts/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { exportTableToCSV, exportTableToJSON, exportTableToExcel } from '@/components/common/DataTable/utils';
import type { PaginationState, Table } from '@tanstack/react-table';

// 定义薪资元数据接口
interface PayrollMetadata {
  id: string;
  name: string;
  type: 'component' | 'calculation' | 'deduction' | 'benefit';
  description: string;
  category: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // 根据类型添加特定字段
  formula?: string; // 计算公式
  base_amount?: number; // 基础金额
  percentage?: number; // 百分比
  taxable?: boolean; // 是否应税
  mandatory?: boolean; // 是否强制
}

export default function PayrollMetadataPage() {
  const { t } = useTranslation(['common', 'payroll']);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { can } = usePermission();

  // 表格配置管理
  const {
    metadata,
    metadataLoading,
    metadataError,
    userConfig,
    columns,
    updateUserConfig,
    resetToDefault,
  } = useTableConfiguration('payroll_metadata', {
    onViewDetail: (row) => {
      setSelectedMetadataId(row.id);
      setIsDetailModalOpen(true);
    },
  });

  // 状态管理
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState(''); // 实际用于搜索的查询
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<PayrollMetadata['type'] | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PayrollMetadata['status'] | 'all'>('all');
  const [tableInstance, setTableInstance] = useState<Table<any> | null>(null);
  
  // 模态框状态
  const [selectedMetadataId, setSelectedMetadataId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 搜索处理函数 - 手动触发搜索
  const handleSearch = useCallback(() => {
    setActiveSearchQuery(searchQuery);
    // TanStack Table 会自动重置分页到第一页
    if (tableInstance) {
      tableInstance.setPageIndex(0);
    }
  }, [searchQuery, tableInstance]);

  const handleSearchReset = useCallback(() => {
    setSearchQuery('');
    setActiveSearchQuery('');
    // TanStack Table 会自动重置分页到第一页
    if (tableInstance) {
      tableInstance.setPageIndex(0);
    }
  }, [tableInstance]);

  // 模拟数据 - 实际项目中应从API获取
  const mockData: PayrollMetadata[] = [
    {
      id: '1',
      name: '基础工资',
      type: 'component',
      description: '员工基本工资',
      category: '收入',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      base_amount: 0,
      taxable: true,
      mandatory: true,
    },
    {
      id: '2', 
      name: '绩效奖金',
      type: 'component',
      description: '根据绩效评估发放的奖金',
      category: '奖金',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      percentage: 0,
      taxable: true,
      mandatory: false,
    },
    {
      id: '3',
      name: '个人所得税',
      type: 'deduction',
      description: '根据税法计算的个人所得税',
      category: '税务',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      formula: '(gross_pay - 5000) * rate',
      mandatory: true,
    },
    {
      id: '4',
      name: '社会保险',
      type: 'deduction',
      description: '社会保险费用扣除',
      category: '保险',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      percentage: 10.5,
      mandatory: true,
    },
    {
      id: '5',
      name: '住房公积金',
      type: 'benefit',
      description: '公司为员工缴纳的住房公积金',
      category: '福利',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      percentage: 12,
      mandatory: true,
    },
    {
      id: '6',
      name: '加班费计算',
      type: 'calculation',
      description: '加班费用自动计算规则',
      category: '计算',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      formula: 'base_pay / 21.75 / 8 * hours * rate',
    },
  ];

  // 数据处理流程 - 前端过滤和搜索
  const processedData = useMemo(() => {
    let processedItems = mockData;
    
    // 类型过滤
    if (typeFilter !== 'all') {
      processedItems = processedItems.filter(item => item.type === typeFilter);
    }
    
    // 状态过滤
    if (statusFilter !== 'all') {
      processedItems = processedItems.filter(item => item.status === statusFilter);
    }
    
    // 全局模糊搜索 - 使用手动触发的搜索查询
    if (activeSearchQuery.trim()) {
      const query = activeSearchQuery.toLowerCase().trim();
      processedItems = processedItems.filter(metadata => {
        // 搜索所有可能的字段
        const searchableFields = [
          metadata.name,              // 名称
          metadata.description,       // 描述
          metadata.category,          // 分类
          metadata.type,              // 类型
          metadata.status,            // 状态
          metadata.formula,           // 公式
        ].filter(Boolean); // 过滤掉空值
        
        // 检查是否任一字段包含搜索关键词
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(query)
        );
      });
    }
    
    return processedItems;
  }, [typeFilter, statusFilter, activeSearchQuery]);

  // 处理行点击 - 使用模态框替代导航
  const handleRowClick = useCallback((metadata: PayrollMetadata) => {
    setSelectedMetadataId(metadata.id);
    setIsDetailModalOpen(true);
  }, []);

  // 关闭模态框
  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedMetadataId(null);
  }, []);

  // 处理行选择变化 - 稳定的回调，通过ref访问最新数据
  const processedDataRef = useRef(processedData);
  processedDataRef.current = processedData;
  
  const handleRowSelectionChange = useCallback((rowSelection: any) => {
    const selectedRows = Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => {
        const rowIndex = parseInt(index);
        const row = processedDataRef.current[rowIndex];
        return row?.id;
      })
      .filter(Boolean);
    setSelectedIds(selectedRows);
  }, []); // 空依赖数组，使用ref访问最新数据

  // 批量操作处理
  const handleBatchActivate = useCallback(async () => {
    try {
      // TODO: 实现批量激活逻辑
      showSuccess('批量激活成功');
      setSelectedIds([]);
    } catch (error) {
      showError('批量激活失败');
    }
  }, [selectedIds, showSuccess, showError]);

  const handleBatchDeactivate = useCallback(async () => {
    try {
      // TODO: 实现批量停用逻辑
      showSuccess('批量停用成功');
      setSelectedIds([]);
    } catch (error) {
      showError('批量停用失败');
    }
  }, [selectedIds, showSuccess, showError]);

  // 创建新的薪资元数据
  const handleCreate = useCallback(() => {
    // TODO: 实现创建功能
    console.log('Create new payroll metadata');
  }, []);

  // 准备统计卡片数据
  const statCards: StatCardProps[] = useMemo(() => {
    const totalActive = processedData.filter(item => item.status === 'active').length;
    const totalInactive = processedData.filter(item => item.status === 'inactive').length;
    const componentCount = processedData.filter(item => item.type === 'component').length;
    const deductionCount = processedData.filter(item => item.type === 'deduction').length;

    return [
      {
        title: '活跃元数据',
        value: totalActive.toString(),
        description: '当前使用的薪资组件',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        colorClass: 'text-success'
      },
      {
        title: '停用元数据',
        value: totalInactive.toString(),
        description: '暂停使用的薪资组件',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        colorClass: 'text-warning'
      },
      {
        title: '薪资组件',
        value: componentCount.toString(),
        description: '基础工资和奖金项目',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        colorClass: 'text-info'
      },
      {
        title: '扣除项目',
        value: deductionCount.toString(),
        description: '税务和保险扣除',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        colorClass: 'text-error'
      }
    ];
  }, [processedData]);

  // 处理加载状态
  const totalLoading = metadataLoading;

  // 错误处理
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
      title="薪资元数据管理"
      subtitle="管理薪资计算的基础组件、公式和规则"
      statCards={statCards}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      onSearch={handleSearch}
      onSearchReset={handleSearchReset}
      searchPlaceholder="搜索名称、描述、分类、类型..."
      searchLoading={totalLoading}
      showFieldSelector={true}
      fields={metadata?.fields || []}
      userConfig={userConfig}
      onFieldConfigChange={updateUserConfig}
      onFieldConfigReset={resetToDefault}
      primaryActions={[
        <ModernButton
          key="create"
          onClick={handleCreate}
          variant="primary"
          size="md"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          新建元数据
        </ModernButton>
      ]}
      data={processedData}
      columns={columns}
      loading={totalLoading}
      tableInstance={tableInstance || undefined}
      onTableReady={setTableInstance}
      initialSorting={[{ id: 'updated_at', desc: true }]}
      initialPagination={{ pageIndex: 0, pageSize: 20 }}
      enableExport={false}
      showGlobalFilter={false}
      showColumnToggle={false}
      enableRowSelection={true}
      onRowSelectionChange={handleRowSelectionChange}
      customContent={
        <div className="space-y-4">
          {/* 筛选控制 */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* 类型筛选 */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as PayrollMetadata['type'] | 'all')}
                  className="select select-bordered select-sm"
                >
                  <option value="all">所有类型</option>
                  <option value="component">薪资组件</option>
                  <option value="calculation">计算规则</option>
                  <option value="deduction">扣除项目</option>
                  <option value="benefit">福利项目</option>
                </select>

                {/* 状态筛选 */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PayrollMetadata['status'] | 'all')}
                  className="select select-bordered select-sm"
                >
                  <option value="all">所有状态</option>
                  <option value="active">活跃</option>
                  <option value="inactive">停用</option>
                </select>
              </div>
              
              {/* 导出按钮 */}
              <div className="dropdown dropdown-end">
                <ModernButton
                  variant="secondary"
                  size="sm"
                  className="tabindex-0"
                  title={t('common:exportAction')}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  导出
                </ModernButton>
                <ul className="dropdown-content menu p-2 mt-2 w-52 z-50 bg-base-100 border border-base-200 rounded-xl shadow-lg">
                  <li>
                    <a onClick={() => exportTableToCSV(processedData, 'payroll-metadata')} className="rounded-lg">
                      CSV
                    </a>
                  </li>
                  <li>
                    <a onClick={() => exportTableToJSON(processedData, 'payroll-metadata')} className="rounded-lg">
                      JSON
                    </a>
                  </li>
                  <li>
                    <a onClick={() => exportTableToExcel(processedData, 'payroll-metadata')} className="rounded-lg">
                      Excel
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 批量操作栏 */}
          {selectedIds.length > 0 && (
            <div className="card bg-base-100 shadow-sm border border-base-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-base-content/70">
                  已选择 {selectedIds.length} 项
                </span>
                <div className="flex gap-2">
                  <ModernButton
                    size="sm"
                    variant="primary"
                    onClick={handleBatchActivate}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  >
                    批量激活
                  </ModernButton>
                  <ModernButton
                    size="sm"
                    variant="secondary"
                    onClick={handleBatchDeactivate}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  >
                    批量停用
                  </ModernButton>
                  <ModernButton
                    size="sm"
                    variant="secondary"
                    onClick={() => exportTableToExcel(processedData.filter(p => selectedIds.includes(p.id)), 'payroll-metadata-selected')}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }
                  >
                    导出选中
                  </ModernButton>
                </div>
              </div>
            </div>
          )}
        </div>
      }
      modal={
        selectedMetadataId && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg">薪资元数据详情</h3>
              <p className="py-4">元数据 ID: {selectedMetadataId}</p>
              <p className="text-sm text-base-content/70">详情功能待实现...</p>
              <div className="modal-action">
                <button className="btn" onClick={handleCloseModal}>关闭</button>
              </div>
            </div>
          </div>
        )
      }
    />
  );
}