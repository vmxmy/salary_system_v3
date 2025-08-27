import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { DataTable } from '@/components/common/DataTable';
import { createDataTableColumnHelper } from '@/components/common/DataTable/utils';
import { formatCurrency } from '@/lib/format';
import type { BasePayrollData } from './PayrollTableContainer';

interface PayrollPivotTableProps {
  data: BasePayrollData[];
  loading?: boolean;
  showColumnToggle?: boolean;
}

// 薪资明细项接口
interface PayrollDetailItem {
  item_id: string;
  payroll_id: string;
  employee_id: string;
  employee_name: string;
  component_name: string;
  component_type: 'earning' | 'deduction';
  category: string;
  amount: number;
  item_notes?: string;
}

// 薪资组件分类排序定义
const CATEGORY_ORDER: Record<string, number> = {
  // earning 组 (基本工资和津贴补助)
  'basic_salary': 1,
  'benefits': 2,
  
  // 扣除项按指定顺序
  'other_deductions': 3,      // 其他扣发
  'personal_tax': 4,          // 个人所得税
  'personal_insurance': 5,    // 个人扣缴
  'employer_insurance': 6,    // 单位扣缴
};

// 按分类对薪资组件进行分组和排序
const groupAndSortComponents = (details: PayrollDetailItem[]) => {
  const componentMap = new Map<string, { category: string; type: 'earning' | 'deduction' }>();
  
  // 收集组件信息
  details.forEach(detail => {
    if (!componentMap.has(detail.component_name)) {
      componentMap.set(detail.component_name, {
        category: detail.category,
        type: detail.component_type
      });
    }
  });
  
  // 获取所有唯一组件并按类别分组
  const componentsByCategory: Record<string, string[]> = {};
  
  Array.from(componentMap.entries()).forEach(([componentName, info]) => {
    const category = info.category;
    if (!componentsByCategory[category]) {
      componentsByCategory[category] = [];
    }
    componentsByCategory[category].push(componentName);
  });
  
  // 对每个类别内的组件进行排序
  Object.keys(componentsByCategory).forEach(category => {
    componentsByCategory[category].sort();
  });
  
  // 按类别顺序组织最终的组件列表
  const sortedComponents: string[] = [];
  const sortedCategories = Object.keys(componentsByCategory)
    .sort((a, b) => (CATEGORY_ORDER[a] || 999) - (CATEGORY_ORDER[b] || 999));
  
  sortedCategories.forEach(category => {
    sortedComponents.push(...componentsByCategory[category]);
  });
  
  return sortedComponents;
};

// 透视表行数据接口
interface PivotRowData {
  employee_name: string;
  employee_id: string;
  [key: string]: string | number; // 动态薪资组件字段
}

export function PayrollPivotTable({ data, loading, showColumnToggle = false }: PayrollPivotTableProps) {
  
  // 提取所有薪资记录的ID，确保ID有效且不为空
  const payrollIds = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data
      .map(item => item?.id || item?.payroll_id)
      .filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim().length > 0));
  }, [data]);

  // 使用单个查询获取所有薪资明细数据，避免Hook顺序问题
  const { data: allRawDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['payroll-batch-details', payrollIds],
    queryFn: async () => {
      if (!payrollIds.length) return [];
      
      // 批量查询所有薪资详情
      const { data: batchDetails, error } = await supabase
        .from('view_payroll_unified')
        .select('*')
        .in('payroll_id', payrollIds)
        .not('item_id', 'is', null);

      if (error) throw error;
      return batchDetails || [];
    },
    enabled: payrollIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
  
  // 转换和处理明细数据
  const allDetails = useMemo(() => {
    if (!allRawDetails || !Array.isArray(allRawDetails)) {
      return [];
    }
    
    const details: PayrollDetailItem[] = [];
    
    allRawDetails.forEach((item: any) => {
      const employeeData = data?.find(d => (d.id || d.payroll_id) === item.payroll_id);
      
      details.push({
        item_id: item.item_id || '',
        payroll_id: item.payroll_id || '',
        employee_id: item.employee_id || '',
        employee_name: employeeData?.employee_name || item.employee_name || '',
        component_name: item.component_name || '',
        component_type: item.component_type || 'earning',
        category: item.category || '',
        amount: item.amount || 0,
        item_notes: item.item_notes || ''
      });
    });
    
    // 按类别和组件名排序
    return details.sort((a, b) => {
      const categoryOrder = (a.category || '').localeCompare(b.category || '');
      if (categoryOrder !== 0) return categoryOrder;
      return (a.component_name || '').localeCompare(b.component_name || '');
    });
  }, [allRawDetails, data]);

  // 检查加载状态
  const isLoading = loading || isDetailsLoading;
  const hasData = allDetails.length > 0;

  // 构建透视表数据
  const { pivotData, componentColumns } = useMemo(() => {
    if (!allDetails.length) {
      return { pivotData: [], componentColumns: [] };
    }

    // 使用分组排序函数获取有序的薪资组件
    const sortedComponents = groupAndSortComponents(allDetails);
    
    // 按员工分组数据
    const employeeGroups = allDetails.reduce((acc, detail) => {
      const key = detail.employee_name;
      if (!acc[key]) {
        acc[key] = {
          employee_name: detail.employee_name,
          employee_id: detail.employee_id,
        };
      }
      // 使用组件名作为字段名，存储金额
      acc[key][detail.component_name] = detail.amount;
      return acc;
    }, {} as Record<string, PivotRowData>);

    // 转换为数组格式
    const pivotRows = Object.values(employeeGroups);
    
    console.log('🔄 [PayrollPivotTable] Pivot data constructed:', {
      employeeCount: pivotRows.length,
      componentCount: sortedComponents.length,
      sampleEmployee: pivotRows[0]?.employee_name,
      sampleComponents: sortedComponents.slice(0, 5)
    });

    return {
      pivotData: pivotRows,
      componentColumns: sortedComponents
    };
  }, [allDetails]);

  // 获取分类信息用于列标题
  const getCategoryInfo = useMemo(() => {
    const categoryMap = new Map<string, { category: string; type: 'earning' | 'deduction' }>();
    // 确保 allDetails 是数组
    if (Array.isArray(allDetails)) {
      allDetails.forEach(detail => {
        if (!categoryMap.has(detail.component_name)) {
          categoryMap.set(detail.component_name, {
            category: detail.category,
            type: detail.component_type
          });
        }
      });
    }
    return categoryMap;
  }, [allDetails]);

  // 分类颜色映射 - 统一表头文字颜色，保留背景色区分
  const CATEGORY_COLORS: Record<string, string> = {
    'basic_salary': 'bg-primary/30 text-base-content border-2 border-primary/40 font-bold', // 基本工资 - 主色背景
    'benefits': 'bg-secondary/30 text-base-content border-2 border-secondary/40 font-bold',  // 津贴补助 - 次色背景
    'other_deductions': 'bg-warning/30 text-base-content border-2 border-warning/40 font-bold', // 其他扣发 - 警告色背景
    'personal_tax': 'bg-error/30 text-base-content border-2 border-error/40 font-bold',      // 个人所得税 - 错误色背景
    'personal_insurance': 'bg-info/30 text-base-content border-2 border-info/40 font-bold',  // 个人扣缴 - 信息色背景
    'employer_insurance': 'bg-accent/30 text-base-content border-2 border-accent/40 font-bold', // 单位扣缴 - 强调色背景
  };

  // 创建透视表列定义
  const columnHelper = createDataTableColumnHelper<PivotRowData>();
  const columns = useMemo(() => {
    const baseColumns = [
      columnHelper.accessor('employee_name', {
        header: '员工姓名',
        cell: (info) => (
          <span className="text-base-content/90">
            {info.getValue()}
          </span>
        ),
        enableColumnFilter: true,
        filterFn: 'includesString',
        size: 120,
        minSize: 100
      })
    ];

    // 为每个薪资组件创建列，使用背景颜色区分分类
    const componentCols = componentColumns.map(componentName => {
      const categoryInfo = getCategoryInfo.get(componentName);
      const categoryColors = categoryInfo ? CATEGORY_COLORS[categoryInfo.category] || 'bg-base-200/50 text-base-content font-bold border-2 border-base-300' : 'bg-base-200/50 text-base-content font-bold border-2 border-base-300';
      const isEarning = categoryInfo?.type === 'earning';
      
      return columnHelper.accessor(componentName as any, {
        header: () => (
          <div className={`text-center p-2 rounded-md font-medium ${categoryColors}`}>
            {componentName}
          </div>
        ),
        cell: (info) => {
          const value = info.getValue() as number;
          if (value === undefined || value === null || value === 0) {
            return <span className="text-base-content/40">-</span>;
          }
          
          // 直接显示原始数据，保持数据库中的正负号
          return (
            <span className="font-mono text-base-content/90">
              {formatCurrency(value)}
            </span>
          );
        },
        enableColumnFilter: true,
        filterFn: (row, columnId, value) => {
          const cellValue = row.getValue(columnId) as number;
          if (!value || value === '') return true;
          
          // 如果是数字，支持范围筛选 (例如: >1000, <5000, 1000-5000)
          const numericValue = cellValue || 0;
          const filterStr = value.toString().toLowerCase();
          
          if (filterStr.startsWith('>')) {
            const threshold = parseFloat(filterStr.slice(1));
            return !isNaN(threshold) && numericValue > threshold;
          }
          if (filterStr.startsWith('<')) {
            const threshold = parseFloat(filterStr.slice(1));
            return !isNaN(threshold) && numericValue < threshold;
          }
          if (filterStr.includes('-')) {
            const [min, max] = filterStr.split('-').map((s: string) => parseFloat(s.trim()));
            return !isNaN(min) && !isNaN(max) && numericValue >= min && numericValue <= max;
          }
          
          // 默认精确匹配或包含匹配
          return numericValue.toString().includes(filterStr) || 
                 formatCurrency(numericValue).includes(value);
        },
        size: 130,
        minSize: 110
      });
    });

    return [...baseColumns, ...componentCols];
  }, [columnHelper, componentColumns, getCategoryInfo]);

  // 优化加载状态 - 如果有部分数据就显示，减少等待感
  if (isLoading && !hasData) {
    return <LoadingScreen />;
  }

  if (!pivotData || !Array.isArray(pivotData) || pivotData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg className="w-16 h-16 text-base-content/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
            d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-medium text-base-content/60 mb-2">暂无薪资数据</h3>
        <p className="text-sm text-base-content/40">当前选择的薪资记录中没有明细数据</p>
      </div>
    );
  }

  return (
    <div>
      {/* 加载进度提示 */}
      {isLoading && hasData && (
        <div className="alert alert-info mb-4">
          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>正在加载薪资明细数据...</span>
        </div>
      )}
      
      <DataTable
        data={pivotData}
        columns={columns as any}
        loading={false} // 已经在上面处理了加载状态
        showGlobalFilter={true}
        showColumnToggle={showColumnToggle}
        enableExport={false}
        exportFileName="薪资透视表"
      />
    </div>
  );
}