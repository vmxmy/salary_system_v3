import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

// 导入优化后的依赖
import { DATA_SOURCE_CONFIG } from './config/dataSourceConfig';
import { DataSourceLogger } from './utils/errorHandling';
import { getDataSourceDiscoveryService } from './services/dataSourceDiscovery';
import type {
  DatabaseObject,
  ColumnInfo,
  DataSourceEnhanced,
  DataSourceQueryOptions,
  ColumnQueryOptions,
  UseDataSourcesReturn,
  UseDataSourcesEnhancedReturn,
  UseTableColumnsReturn,
  PayrollDataSourceRecommendation,
  DataSourceValidationResult,
  AvailableDataSourcesResult,
} from './types/dataSourceTypes';

// 导出类型以保持向后兼容性
export type {
  DatabaseObject,
  ColumnInfo,
  DataSourceEnhanced,
} from './types/dataSourceTypes';

/**
 * 优化后的数据源查询 Hook
 * 使用简化的发现服务和统一的错误处理
 */
export const useDataSources = (options?: DataSourceQueryOptions): UseDataSourcesReturn => {
  const queryClient = useQueryClient();
  
  const queryResult = useQuery({
    queryKey: ['dataSources', 'discovery', options?.schema, options?.type],
    queryFn: async (): Promise<DatabaseObject[]> => {
      DataSourceLogger.info('hook', 'Starting data source discovery');
      
      const discoveryService = getDataSourceDiscoveryService();
      const dataSources = await discoveryService.discoverAll();
      
      // 应用过滤器
      let filteredSources = dataSources;
      
      if (options?.type && options.type !== 'all') {
        filteredSources = dataSources.filter(ds => ds.type === options.type);
      }
      
      if (options?.schema) {
        filteredSources = filteredSources.filter(ds => ds.schema === options.schema);
      }
      
      DataSourceLogger.info('hook', `Returning ${filteredSources.length} filtered data sources`);
      return filteredSources.map(ds => ({
        name: ds.name,
        type: ds.type,
        schema: ds.schema,
        comment: ds.description,
        record_count: ds.recordCount,
        last_updated: ds.lastUpdated,
      }));
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? DATA_SOURCE_CONFIG.CACHE_TIMES.DATA_SOURCES,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ['dataSources'], 
      exact: false 
    });
  }, [queryClient]);

  return {
    ...queryResult,
    dataSources: queryResult.data ?? [],
    refresh,
  };
};

/**
 * 优化后的表列信息查询 Hook
 */
export const useTableColumns = (
  tableName: string, 
  options?: ColumnQueryOptions
): UseTableColumnsReturn => {
  const queryClient = useQueryClient();
  const enabled = (options?.enabled ?? true) && !!tableName;
  
  const queryResult = useQuery({
    queryKey: ['dataSources', 'columns', tableName],
    queryFn: async (): Promise<ColumnInfo[]> => {
      if (!tableName) {
        throw new Error('Table name is required');
      }
      
      DataSourceLogger.info('columns', `Fetching columns for table: ${tableName}`);
      
      const discoveryService = getDataSourceDiscoveryService();
      const columns = await discoveryService.getColumns(tableName);
      
      DataSourceLogger.info('columns', `Found ${columns.length} columns for ${tableName}`);
      return columns;
    },
    enabled,
    staleTime: options?.staleTime ?? DATA_SOURCE_CONFIG.CACHE_TIMES.COLUMNS,
    retry: 1,
  });

  const refresh = useCallback(async () => {
    if (tableName) {
      await queryClient.invalidateQueries({ 
        queryKey: ['dataSources', 'columns', tableName] 
      });
    }
  }, [queryClient, tableName]);

  const columnNames = queryResult.data?.map(col => col.column_name) ?? [];

  return {
    ...queryResult,
    columns: queryResult.data ?? [],
    columnNames,
    refresh,
  };
};

/**
 * 增强版数据源查询 Hook
 * 提供更丰富的数据源信息和类型安全
 */
export const useDataSourcesEnhanced = (
  options?: DataSourceQueryOptions
): UseDataSourcesEnhancedReturn => {
  const queryClient = useQueryClient();
  
  const queryResult = useQuery({
    queryKey: ['dataSources', 'enhanced', options?.schema, options?.type],
    queryFn: async (): Promise<DataSourceEnhanced[]> => {
      DataSourceLogger.info('enhanced', 'Starting enhanced data source discovery');
      
      const discoveryService = getDataSourceDiscoveryService();
      const dataSources = await discoveryService.discoverAll();
      
      // 转换为增强格式
      let enhancedSources = dataSources.map(ds => ({
        schema_name: ds.schema,
        table_name: ds.name,
        table_type: ds.type,
        description: ds.description,
        display_name: ds.name,
        category: inferDataSourceCategory(ds.name),
        record_count: ds.recordCount,
      }));
      
      // 应用过滤器
      if (options?.type && options.type !== 'all') {
        enhancedSources = enhancedSources.filter(ds => ds.table_type === options.type);
      }
      
      if (options?.schema) {
        enhancedSources = enhancedSources.filter(ds => ds.schema_name === options.schema);
      }
      
      return enhancedSources;
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? DATA_SOURCE_CONFIG.CACHE_TIMES.DATA_SOURCES,
    retry: 2,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ['dataSources', 'enhanced'], 
      exact: false 
    });
  }, [queryClient]);

  return {
    ...queryResult,
    dataSources: queryResult.data ?? [],
    refresh,
  };
};

/**
 * 薪资数据源推荐 Hook
 * 使用智能分析推荐最适合的薪资数据源
 */
export const usePayrollDataSourceRecommendation = () => {
  return useQuery({
    queryKey: ['dataSources', 'payroll', 'recommendation'],
    queryFn: async (): Promise<PayrollDataSourceRecommendation> => {
      DataSourceLogger.info('payroll-recommendation', 'Starting payroll data source recommendation');
      
      const discoveryService = getDataSourceDiscoveryService();
      const recommendation = await discoveryService.recommendPayrollDataSource();
      
      DataSourceLogger.info('payroll-recommendation', 'Recommendation completed', {
        recommended: recommendation.recommended,
        alternatives: recommendation.alternatives.length,
      });
      
      return recommendation;
    },
    staleTime: DATA_SOURCE_CONFIG.CACHE_TIMES.DATA_SOURCES,
    retry: 1,
  });
};

/**
 * 数据源验证 Hook
 * 验证指定数据源的可用性和基本信息
 */
export const useDataSourceValidation = (tableName: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['dataSources', 'validation', tableName],
    queryFn: async (): Promise<DataSourceValidationResult> => {
      if (!tableName) {
        throw new Error('Table name is required for validation');
      }
      
      DataSourceLogger.info('validation', `Validating data source: ${tableName}`);
      
      const discoveryService = getDataSourceDiscoveryService();
      const result = await discoveryService.validateDataSource(tableName);
      
      return {
        dataSource: tableName,
        isPreferred: result.exists && result.recordCount > 0,
        available: result.exists,
        recordCount: result.recordCount,
        sampleData: result.sampleData,
        error: result.error,
      };
    },
    enabled: enabled && !!tableName,
    staleTime: DATA_SOURCE_CONFIG.CACHE_TIMES.VALIDATION,
    retry: 1,
  });
};

/**
 * 工具函数：获取可用的报表数据源
 * 简化版本，使用新的发现服务
 */
export async function getAvailableReportDataSources(): Promise<AvailableDataSourcesResult> {
  try {
    DataSourceLogger.info('available-sources', 'Fetching available report data sources');
    
    const discoveryService = getDataSourceDiscoveryService();
    const dataSources = await discoveryService.discoverAll();
    
    // 转换为增强格式
    const enhanced = dataSources.map(ds => ({
      schema_name: ds.schema,
      table_name: ds.name,
      table_type: ds.type,
      description: ds.description,
      display_name: ds.name,
      category: inferDataSourceCategory(ds.name),
      record_count: ds.recordCount,
    }));
    
    // 按记录数和重要性排序
    const sorted = enhanced.sort((a, b) => {
      if (a.record_count > 0 && b.record_count === 0) return -1;
      if (a.record_count === 0 && b.record_count > 0) return 1;
      return (b.record_count || 0) - (a.record_count || 0);
    });
    
    DataSourceLogger.info('available-sources', `Found ${sorted.length} available data sources`);
    
    return { 
      primary: sorted, 
      fallback: [] 
    };
  } catch (error) {
    DataSourceLogger.error('available-sources', 'Failed to get available data sources', { error });
    return { primary: [], fallback: [] };
  }
}

/**
 * 工具函数：选择最佳数据源
 * 简化版本，使用新的验证服务
 */
export async function selectBestDataSource(preferredSource: string): Promise<DataSourceValidationResult> {
  if (!preferredSource) {
    return { 
      dataSource: '', 
      isPreferred: false, 
      available: false, 
      error: 'No data source provided' 
    };
  }
  
  try {
    const discoveryService = getDataSourceDiscoveryService();
    const validation = await discoveryService.validateDataSource(preferredSource);
    
    return {
      dataSource: preferredSource,
      isPreferred: validation.exists && validation.recordCount > 0,
      available: validation.exists,
      recordCount: validation.recordCount,
      sampleData: validation.sampleData,
      error: validation.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      dataSource: preferredSource,
      isPreferred: false,
      available: false,
      error: errorMessage,
    };
  }
}

/**
 * 工具函数：获取推荐字段
 * 简化版本，使用新的列信息服务
 */
export const getRecommendedFields = async (dataSourceName: string): Promise<string[]> => {
  if (!dataSourceName) return [];
  
  try {
    const discoveryService = getDataSourceDiscoveryService();
    const columns = await discoveryService.getColumns(dataSourceName);
    return columns.map(col => col.column_name);
  } catch (error) {
    DataSourceLogger.error('recommended-fields', `Failed to get fields for ${dataSourceName}`, { error });
    return [];
  }
};

/**
 * 工具函数：获取数据源类别
 * 基于表名推断数据源类别
 */
export const getDataSourceCategory = (tableName?: string): string => {
  return inferDataSourceCategory(tableName || '');
};

/**
 * 内部函数：推断数据源类别
 */
function inferDataSourceCategory(tableName: string): string {
  const name = tableName.toLowerCase();
  
  if (name.includes('payroll') || name.includes('salary') || name.includes('pay')) {
    return '薪资管理';
  }
  if (name.includes('employee') || name.includes('staff') || name.includes('personnel')) {
    return '员工管理';
  }
  if (name.includes('department') || name.includes('dept')) {
    return '部门管理';
  }
  if (name.includes('position') || name.includes('job') || name.includes('role')) {
    return '职位管理';
  }
  if (name.includes('report') || name.includes('view_')) {
    return '报表视图';
  }
  if (name.includes('lookup') || name.includes('config') || name.includes('setting')) {
    return '配置数据';
  }
  
  return '其他';
}

/**
 * 表列信息增强查询 Hook
 * 提供更丰富的列信息和类型推断
 */
export const useTableColumnsEnhanced = (tableName?: string, options?: ColumnQueryOptions): UseTableColumnsReturn => {
  return useTableColumns(tableName || '', {
    enabled: (options?.enabled ?? true) && !!tableName,
    staleTime: options?.staleTime,
  });
};

// ============================================================================
// 向后兼容性维护 - 保留原有接口
// ============================================================================
// 清理：移除重复的函数声明，避免 TypeScript 错误

// ============================================================================
// 已废弃的功能 - 仅用于向后兼容
// 新项目请使用上述优化后的 Hook 和服务
// ============================================================================

/**
 * @deprecated 建议使用 recommendPayrollDataSource 服务方法
 */
export async function recommendPayrollDataSource(): Promise<PayrollDataSourceRecommendation> {
  const discoveryService = getDataSourceDiscoveryService();
  return await discoveryService.recommendPayrollDataSource();
}

// 清理：移除所有已废弃的复杂发现逻辑，这些功能现在由
// DataSourceDiscoveryService 统一处理，代码更简洁、可维护

// 清理：原复杂的薪资推荐逻辑已迁移到 DataSourceDiscoveryService

// 清理：列信息发现逻辑已迁移到 TypeSafeTableQuery 和 DataSourceDiscoveryService

// 清理：这些接口和函数已经在上面重新实现或迁移到类型文件

// 清理：这些功能已经重新实现在上面的 Hook 中