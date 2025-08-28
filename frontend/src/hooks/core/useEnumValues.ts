import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from './useErrorHandler';

/**
 * 枚举值类型定义
 */
export interface EnumValue {
  enum_name: string;
  enum_value: string;
  sort_order: number; // 数据库返回real类型，前端转换为number
  label?: string; // 显示标签（可选，用于国际化）
}

/**
 * 枚举值映射类型
 */
export interface EnumValueMap {
  [enumName: string]: EnumValue[];
}

/**
 * 状态显示配置
 */
export interface StatusDisplayConfig {
  label: string;
  color: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error' | 'neutral';
  icon?: string;
  description?: string;
}

/**
 * 查询键管理
 */
export const enumQueryKeys = {
  all: ['enum-values'] as const,
  byName: (enumName: string) => [...enumQueryKeys.all, 'by-name', enumName] as const,
  multiple: (enumNames: string[]) => [...enumQueryKeys.all, 'multiple', enumNames.sort()] as const,
} as const;

/**
 * 动态获取数据库枚举值的Hook
 * 
 * @param enumNames 要获取的枚举类型名称数组
 * @param enabled 是否启用查询
 */
export function useEnumValues(enumNames: string[], enabled = true) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: enumQueryKeys.multiple(enumNames),
    queryFn: async (): Promise<EnumValueMap> => {
      const { data, error } = await supabase.rpc('get_enum_values', {
        p_enum_names: enumNames
      });

      if (error) {
        handleError(error, { customMessage: '获取枚举值失败' });
        throw error;
      }

      // 按枚举名称分组
      const enumMap: EnumValueMap = {};
      (data || []).forEach((item: EnumValue) => {
        if (!enumMap[item.enum_name]) {
          enumMap[item.enum_name] = [];
        }
        enumMap[item.enum_name].push(item);
      });

      // 按排序顺序排序
      Object.keys(enumMap).forEach(enumName => {
        enumMap[enumName].sort((a, b) => a.sort_order - b.sort_order);
      });

      return enumMap;
    },
    enabled,
    staleTime: 30 * 60 * 1000, // 30分钟缓存，枚举值变化较少
    gcTime: 60 * 60 * 1000, // 1小时垃圾回收
  });
}

/**
 * 获取单个枚举类型的值
 * 
 * @param enumName 枚举类型名称
 * @param enabled 是否启用查询
 */
export function useSingleEnumValues(enumName: string, enabled = true) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: enumQueryKeys.byName(enumName),
    queryFn: async (): Promise<EnumValue[]> => {
      // 使用已创建的数据库函数获取单个枚举类型的值
      const { data, error } = await supabase.rpc('get_enum_values', {
        p_enum_names: [enumName]
      });

      if (error) {
        handleError(error, { customMessage: `获取${enumName}枚举值失败` });
        throw error;
      }

      return (data || []).sort((a, b) => a.sort_order - b.sort_order);
    },
    enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * 薪资状态专用Hook - 提供完整的状态配置
 */
export function usePayrollStatusEnum() {
  const enumQuery = useSingleEnumValues('payroll_status');

  // 状态显示配置映射
  const statusDisplayMap: Record<string, StatusDisplayConfig> = {
    draft: {
      label: '草稿',
      color: 'neutral',
      icon: '📝',
      description: '薪资记录已创建但未提交审核'
    },
    calculating: {
      label: '计算中',
      color: 'info',
      icon: '🔄',
      description: '系统正在进行薪资计算'
    },
    calculated: {
      label: '计算完成',
      color: 'primary',
      icon: '✅',
      description: '薪资计算完成，等待审核'
    },
    approved: {
      label: '已审批',
      color: 'success',
      icon: '👍',
      description: '薪资已审核通过，准备发放'
    },
    paid: {
      label: '已发放',
      color: 'success',
      icon: '💰',
      description: '薪资已成功发放给员工'
    },
    cancelled: {
      label: '已取消',
      color: 'error',
      icon: '❌',
      description: '薪资记录已被取消'
    },
    pending: {
      label: '待处理',
      color: 'warning',
      icon: '⏳',
      description: '薪资记录待进一步处理'
    }
  };

  return {
    // 原始查询数据
    ...enumQuery,
    
    // 增强的状态数据
    statusOptions: enumQuery.data?.map(item => ({
      ...item,
      ...statusDisplayMap[item.enum_value],
      value: item.enum_value,
      label: statusDisplayMap[item.enum_value]?.label || item.enum_value
    })) || [],

    // 工具函数
    utils: {
      // 获取状态显示配置
      getStatusConfig: (status: string): StatusDisplayConfig => {
        return statusDisplayMap[status] || {
          label: status,
          color: 'neutral',
          description: '未知状态'
        };
      },

      // 获取状态标签
      getStatusLabel: (status: string): string => {
        return statusDisplayMap[status]?.label || status;
      },

      // 获取状态颜色
      getStatusColor: (status: string): StatusDisplayConfig['color'] => {
        return statusDisplayMap[status]?.color || 'neutral';
      },

      // 检查状态是否存在
      isValidStatus: (status: string): boolean => {
        return enumQuery.data?.some(item => item.enum_value === status) || false;
      },

      // 获取所有状态值
      getAllStatusValues: (): string[] => {
        return enumQuery.data?.map(item => item.enum_value) || [];
      }
    }
  };
}

/**
 * 薪资周期状态专用Hook
 */
export function usePeriodStatusEnum() {
  const enumQuery = useSingleEnumValues('period_status_enum');

  const statusDisplayMap: Record<string, StatusDisplayConfig> = {
    preparing: {
      label: '准备中',
      color: 'neutral',
      icon: '🔧',
      description: '数据导入阶段'
    },
    ready: {
      label: '就绪',
      color: 'info',
      icon: '✅',
      description: '数据完整，可开始处理'
    },
    processing: {
      label: '处理中',
      color: 'warning',
      icon: '⚙️',
      description: '薪资计算进行中'
    },
    review: {
      label: '审核中',
      color: 'primary',
      icon: '👀',
      description: '等待审核确认'
    },
    approved: {
      label: '已审批',
      color: 'success',
      icon: '✅',
      description: '可执行发放'
    },
    completed: {
      label: '已完成',
      color: 'success',
      icon: '🎉',
      description: '发放完成'
    },
    closed: {
      label: '已关闭',
      color: 'neutral',
      icon: '🔒',
      description: '周期结束，数据归档'
    }
  };

  return {
    ...enumQuery,
    
    statusOptions: enumQuery.data?.map(item => ({
      ...item,
      ...statusDisplayMap[item.enum_value],
      value: item.enum_value,
      label: statusDisplayMap[item.enum_value]?.label || item.enum_value
    })) || [],

    utils: {
      getStatusConfig: (status: string): StatusDisplayConfig => {
        return statusDisplayMap[status] || {
          label: status,
          color: 'neutral',
          description: '未知状态'
        };
      },

      getStatusLabel: (status: string): string => {
        return statusDisplayMap[status]?.label || status;
      },

      getStatusColor: (status: string): StatusDisplayConfig['color'] => {
        return statusDisplayMap[status]?.color || 'neutral';
      },

      isValidStatus: (status: string): boolean => {
        return enumQuery.data?.some(item => item.enum_value === status) || false;
      },

      getAllStatusValues: (): string[] => {
        return enumQuery.data?.map(item => item.enum_value) || [];
      }
    }
  };
}

/**
 * 通用枚举值Hook - 支持多种枚举类型
 */
export function useMultipleEnums(enumConfigs: Array<{
  enumName: string;
  displayMap?: Record<string, StatusDisplayConfig>;
}>) {
  const enumNames = enumConfigs.map(config => config.enumName);
  const enumQuery = useEnumValues(enumNames);

  const enhancedEnums = enumConfigs.reduce((acc, config) => {
    const enumData = enumQuery.data?.[config.enumName] || [];
    const displayMap = config.displayMap || {};

    acc[config.enumName] = {
      values: enumData,
      options: enumData.map(item => ({
        ...item,
        ...displayMap[item.enum_value],
        value: item.enum_value,
        label: displayMap[item.enum_value]?.label || item.enum_value
      })),
      utils: {
        getConfig: (value: string) => displayMap[value] || { label: value, color: 'neutral' as const },
        getLabel: (value: string) => displayMap[value]?.label || value,
        getColor: (value: string) => displayMap[value]?.color || 'neutral' as const,
        isValid: (value: string) => enumData.some(item => item.enum_value === value),
        getAllValues: () => enumData.map(item => item.enum_value)
      }
    };

    return acc;
  }, {} as Record<string, any>);

  return {
    ...enumQuery,
    enums: enhancedEnums
  };
}