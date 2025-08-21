import { useMemo, useCallback } from 'react';
import type { PayrollStatusType } from './usePayrollTableColumns';
import type { BasePayrollData } from '@/components/payroll/PayrollTableContainer';

// 搜索字段配置
export interface SearchFieldConfig {
  key: string;
  getter: (item: any) => string | undefined;
  searchable?: boolean;
}

// 数据处理配置
export interface DataProcessorConfig {
  // 搜索配置
  searchQuery?: string;
  searchFields?: SearchFieldConfig[];
  
  // 筛选配置
  statusFilter?: PayrollStatusType | 'all';
  
  // 数据转换配置
  idField?: string;
  payrollIdField?: string;
  statusField?: string;
  
  // 兼容性配置
  ensureCompatibility?: boolean;
}

// 默认搜索字段配置
const defaultSearchFields: SearchFieldConfig[] = [
  { key: 'employee_name', getter: (item) => item.employee_name },
  { key: 'department_name', getter: (item) => item.department_name },
  { key: 'position_name', getter: (item) => item.position_name },
  { key: 'category_name', getter: (item) => item.category_name },
  { key: 'payroll_status', getter: (item) => item.payroll_status || item.status },
  { key: 'pay_date', getter: (item) => item.pay_date || item.actual_pay_date || item.scheduled_pay_date },
  { key: 'gross_pay', getter: (item) => item.gross_pay?.toString() },
  { key: 'net_pay', getter: (item) => item.net_pay?.toString() },
  { key: 'last_operator', getter: (item) => item.last_operator },
];

/**
 * 薪资数据处理Hook
 * 统一处理数据格式转换、搜索过滤等逻辑
 */
export function usePayrollDataProcessor<T extends BasePayrollData = BasePayrollData>(
  rawData: T[] = [],
  config: DataProcessorConfig = {}
) {
  const {
    searchQuery = '',
    searchFields = defaultSearchFields,
    statusFilter = 'all',
    idField = 'id',
    payrollIdField = 'payroll_id',
    statusField = 'payroll_status',
    ensureCompatibility = true,
  } = config;

  // 数据格式转换
  const normalizedData = useMemo(() => {
    return rawData.map((item: any) => {
      const normalized = { ...item };
      
      // 确保有统一的ID字段
      if (!normalized[idField] && normalized[payrollIdField]) {
        normalized[idField] = normalized[payrollIdField];
      }
      if (!normalized[payrollIdField] && normalized[idField]) {
        normalized[payrollIdField] = normalized[idField];
      }
      
      // 确保有统一的状态字段 - 优先使用明确映射的 status 字段
      const primaryStatus = normalized.status || normalized.payroll_status || normalized[statusField];
      normalized.status = primaryStatus;
      normalized[statusField] = primaryStatus;
      
      // 兼容性处理：确保employee字段存在
      if (ensureCompatibility && !normalized.employee && normalized.employee_id) {
        normalized.employee = {
          id: normalized.employee_id,
          employee_name: normalized.employee_name,
          id_number: null
        };
      }
      
      // 为表格提供key字段
      normalized.key = normalized[idField] || normalized[payrollIdField];
      
      return normalized as T;
    });
  }, [rawData, idField, payrollIdField, statusField, ensureCompatibility]);

  // 状态过滤
  const statusFilteredData = useMemo(() => {
    if (statusFilter === 'all') {
      return normalizedData;
    }
    
    return normalizedData.filter(item => {
      const itemStatus = item[statusField] || item.status;
      return itemStatus === statusFilter;
    });
  }, [normalizedData, statusFilter, statusField]);

  // 搜索过滤
  const searchFilteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return statusFilteredData;
    }
    
    const query = searchQuery.toLowerCase().trim();
    
    return statusFilteredData.filter(item => {
      // 搜索所有配置的字段
      const searchableFields = searchFields
        .map(field => field.getter(item))
        .filter(Boolean); // 过滤掉空值
      
      // 检查是否任一字段包含搜索关键词
      return searchableFields.some(field => 
        field && field.toLowerCase().includes(query)
      );
    });
  }, [statusFilteredData, searchQuery, searchFields]);

  // 最终处理后的数据
  const processedData = searchFilteredData;

  // 数据统计
  const statistics = useMemo(() => {
    const totalCount = rawData.length;
    const filteredCount = processedData.length;
    const statusCounts: Record<string, number> = {};
    
    // 统计各状态的数量
    processedData.forEach(item => {
      const status = item[statusField] || item.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return {
      total: totalCount,
      filtered: filteredCount,
      statusCounts,
      filterRate: totalCount > 0 ? (filteredCount / totalCount) : 0,
    };
  }, [rawData.length, processedData, statusField]);

  // 数据处理函数
  const processingUtils = useMemo(() => ({
    // 根据ID获取记录
    getRecordById: (id: string) => {
      return processedData.find(item => 
        item[idField] === id || item[payrollIdField] === id
      );
    },
    
    // 根据状态获取记录
    getRecordsByStatus: (status: PayrollStatusType) => {
      return processedData.filter(item => 
        (item[statusField] || item.status) === status
      );
    },
    
    // 根据员工ID获取记录
    getRecordsByEmployeeId: (employeeId: string) => {
      return processedData.filter(item => item.employee_id === employeeId);
    },
    
    // 检查记录是否存在
    hasRecord: (id: string) => {
      return processedData.some(item => 
        item[idField] === id || item[payrollIdField] === id
      );
    },
    
    // 获取唯一的员工ID列表
    getUniqueEmployeeIds: () => {
      const employeeIds = new Set<string>();
      processedData.forEach(item => {
        if (item.employee_id) {
          employeeIds.add(item.employee_id);
        }
      });
      return Array.from(employeeIds);
    },
    
    // 获取唯一的状态列表
    getUniqueStatuses: () => {
      const statuses = new Set<string>();
      processedData.forEach(item => {
        const status = item[statusField] || item.status;
        if (status) {
          statuses.add(status);
        }
      });
      return Array.from(statuses);
    },
    
    // 批量获取记录
    getBatchRecords: (ids: string[]) => {
      return processedData.filter(item => 
        ids.includes(item[idField] || '') || ids.includes(item[payrollIdField] || '')
      );
    },
    
    // 验证数据完整性
    validateDataIntegrity: () => {
      const issues: string[] = [];
      
      processedData.forEach((item, index) => {
        // 检查必要字段
        if (!item[idField] && !item[payrollIdField]) {
          issues.push(`记录 ${index + 1}: 缺少ID字段`);
        }
        if (!item.employee_id) {
          issues.push(`记录 ${index + 1}: 缺少员工ID`);
        }
        if (!item.employee_name) {
          issues.push(`记录 ${index + 1}: 缺少员工姓名`);
        }
      });
      
      return {
        isValid: issues.length === 0,
        issues,
      };
    },
  }), [processedData, idField, payrollIdField, statusField]);

  return {
    // 处理后的数据
    processedData,
    normalizedData,
    statusFilteredData,
    searchFilteredData,
    
    // 统计信息
    statistics,
    
    // 工具函数
    utils: processingUtils,
    
    // 快捷属性
    isEmpty: processedData.length === 0,
    hasData: processedData.length > 0,
    totalCount: statistics.total,
    filteredCount: statistics.filtered,
    
    // 配置信息
    config: {
      searchQuery,
      statusFilter,
      searchFields,
      idField,
      payrollIdField,
      statusField,
    },
  };
}

/**
 * 简化版数据处理Hook
 * 只处理基本的数据格式转换
 */
export function useSimplePayrollDataProcessor<T extends BasePayrollData = BasePayrollData>(
  rawData: T[] = []
) {
  return usePayrollDataProcessor(rawData, {
    ensureCompatibility: true,
  });
}

/**
 * 搜索数据处理Hook
 * 专门用于搜索和筛选
 */
export function useSearchablePayrollData<T extends BasePayrollData = BasePayrollData>(
  rawData: T[] = [],
  searchQuery: string = '',
  statusFilter: PayrollStatusType | 'all' = 'all',
  customSearchFields?: SearchFieldConfig[]
) {
  return usePayrollDataProcessor(rawData, {
    searchQuery,
    statusFilter,
    searchFields: customSearchFields || defaultSearchFields,
  });
}

export default usePayrollDataProcessor;