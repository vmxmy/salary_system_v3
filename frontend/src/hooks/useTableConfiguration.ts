import { useState, useEffect, useCallback, useMemo } from 'react';
import { metadataService } from '@/services/metadata.service';
import type { TableMetadata } from '@/services/metadata.service';
import { columnConfigService } from '@/services/column-config.service';
import type { UserTableConfig, ActionColumn } from '@/services/column-config.service';
import type { ColumnDef } from '@tanstack/react-table';

export interface UseTableConfigurationReturn {
  // 元数据状态
  metadata: TableMetadata | null;
  metadataLoading: boolean;
  metadataError: string | null;
  
  // 用户配置状态
  userConfig: UserTableConfig | null;
  
  // 动态列定义
  columns: ColumnDef<any>[];
  
  // 操作方法
  updateUserConfig: (config: UserTableConfig) => void;
  resetToDefault: () => void;
  
  // 刷新方法
  refreshMetadata: () => Promise<void>;
}

/**
 * 表格配置管理 Hook
 * 统一管理表格元数据、用户配置和动态列生成
 */
export function useTableConfiguration(tableName: string, actions?: ActionColumn): UseTableConfigurationReturn {
  // 状态管理
  const [metadata, setMetadata] = useState<TableMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [userConfig, setUserConfig] = useState<UserTableConfig | null>(null);

  // 加载元数据
  const loadMetadata = useCallback(async () => {
    try {
      console.log('Loading metadata for table:', tableName);
      setMetadataLoading(true);
      setMetadataError(null);
      
      let tableMetadata: TableMetadata;
      
      // 根据表名获取相应的元数据
      switch (tableName) {
        case 'employees':
        case 'v_employee_current_status':
          tableMetadata = await metadataService.getEmployeeViewMetadata();
          break;
        case 'payroll':
        case 'payrolls':
        case 'view_payroll_summary':
          tableMetadata = await metadataService.getPayrollViewMetadata();
          break;
        default:
          throw new Error(`Unsupported table: ${tableName}`);
      }
      
      console.log('Loaded metadata:', tableMetadata);
      setMetadata(tableMetadata);
      
      // 加载或创建用户配置
      let config = columnConfigService.loadUserConfig(tableMetadata.tableName);
      if (!config) {
        console.log('Creating default user config for table:', tableMetadata.tableName);
        config = columnConfigService.createDefaultUserConfig(tableMetadata);
        columnConfigService.saveUserConfig(tableMetadata.tableName, config);
      }
      console.log('User config:', config);
      setUserConfig(config);
      
    } catch (error) {
      console.error('Failed to load table metadata:', error);
      setMetadataError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setMetadataLoading(false);
    }
  }, [tableName]);

  // 初始化加载
  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // 生成动态列定义
  const columns = useMemo(() => {
    if (!metadata || !userConfig) return [];
    
    // 调试: 检查表格元数据和列配置
    console.log('=== Table Configuration Debug ===');
    console.log('Metadata fields:', metadata?.fields?.map(f => ({ name: f.name, label: f.label, visible: f.visible })));
    console.log('User config columns:', userConfig?.columns?.filter(c => c.visible).map(c => ({ field: c.field, visible: c.visible, label: c.label })));
    
    const generatedColumns = columnConfigService.generateColumns(metadata, userConfig, actions);
    console.log('Generated columns:', generatedColumns.map(c => ({ id: c.id, header: typeof c.header })));
    
    return generatedColumns;
  }, [metadata, userConfig, actions]);

  // 更新用户配置
  const updateUserConfig = useCallback((newConfig: UserTableConfig) => {
    if (!metadata) return;
    
    setUserConfig(newConfig);
    columnConfigService.saveUserConfig(metadata.tableName, newConfig);
  }, [metadata]);

  // 重置为默认配置
  const resetToDefault = useCallback(() => {
    if (!metadata) return;
    
    const defaultConfig = columnConfigService.resetToDefault(metadata);
    setUserConfig(defaultConfig);
  }, [metadata]);

  // 刷新元数据
  const refreshMetadata = useCallback(async () => {
    // 清除缓存并重新加载
    metadataService.clearCache(tableName);
    await loadMetadata();
  }, [tableName, loadMetadata]);

  return {
    metadata,
    metadataLoading,
    metadataError,
    userConfig,
    columns,
    updateUserConfig,
    resetToDefault,
    refreshMetadata,
  };
}