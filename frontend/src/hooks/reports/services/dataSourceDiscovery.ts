/**
 * Simplified Data Source Discovery Service
 * 简化的数据源发现服务
 */

import { DATA_SOURCE_CONFIG } from '../config/dataSourceConfig';
import { DataSourceLogger, safeExecute, safeBatchExecute } from '../utils/errorHandling';
import { createTableQuery, discoverTablesFromError, batchValidateTables, type TableMetadata } from '../utils/queryUtils';

// 数据源接口
export interface DataSource {
  name: string;
  type: 'table' | 'view';
  schema: string;
  description: string;
  recordCount: number;
  lastUpdated: string;
  columns?: ColumnInfo[];
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default?: string;
  character_maximum_length?: number;
  display_name?: string;
  description?: string;
  is_key?: boolean;
}

// 发现策略接口
interface DiscoveryStrategy {
  name: string;
  priority: number;
  canDiscover(): Promise<boolean>;
  discover(): Promise<DataSource[]>;
}

// 基于错误反馈的发现策略 (仅在预定义策略失败时使用)
class ErrorBasedDiscoveryStrategy implements DiscoveryStrategy {
  name = 'error-based';
  priority = 1;

  async canDiscover(): Promise<boolean> {
    // 只在明确启用时才使用错误探测策略，避免无意义的404请求
    const forceErrorDiscovery = localStorage.getItem('force-error-discovery') === 'true';
    
    if (forceErrorDiscovery) {
      DataSourceLogger.info('error-discovery', 'Error-based discovery manually enabled via localStorage');
    } else {
      DataSourceLogger.info('error-discovery', 'Error-based discovery disabled (set localStorage.setItem("force-error-discovery", "true") to enable)');
    }
    
    return forceErrorDiscovery; // 默认关闭，只在需要时手动启用
  }

  async discover(): Promise<DataSource[]> {
    DataSourceLogger.info('discovery', 'Starting error-based discovery');

    // 通过查询不存在的表来触发错误，从错误信息中提取可用表名
    const discoveredNames = await discoverTablesFromError();
    
    if (discoveredNames.length === 0) {
      DataSourceLogger.warn('discovery', 'No tables discovered through error-based method');
      return [];
    }

    DataSourceLogger.info('discovery', `Found ${discoveredNames.length} potential tables`, { tables: discoveredNames });

    // 验证发现的表
    const validationResults = await batchValidateTables(discoveredNames);
    const dataSources: DataSource[] = [];

    for (const [tableName, metadata] of validationResults) {
      if (metadata.exists) {
        dataSources.push(this.metadataToDataSource(metadata));
      }
    }

    DataSourceLogger.info('discovery', `Validated ${dataSources.length} existing tables from ${discoveredNames.length} candidates`);
    return dataSources;
  }

  private metadataToDataSource(metadata: TableMetadata): DataSource {
    return {
      name: metadata.name,
      type: metadata.type,
      schema: metadata.schema,
      description: metadata.comment || `${metadata.type} ${metadata.name}`,
      recordCount: metadata.recordCount,
      lastUpdated: new Date().toISOString(),
    };
  }
}

// 预定义表列表策略
class PredefinedTablesStrategy implements DiscoveryStrategy {
  name = 'predefined';
  priority = 2;

  // 基于业务需求筛选的报表数据源列表 (2025-08-30优化)
  private readonly KNOWN_TABLES = [
    // 薪资相关视图 (核心报表数据源)
    'view_payroll_summary',           // 薪资汇总 - 最重要的报表数据源
    'view_payroll_unified',           // 薪资详情 - 包含完整薪资组件
    'view_payroll_trend_unified',     // 薪资趋势 - 统计分析专用
    'view_department_payroll_statistics', // 部门薪资统计
    'view_payroll_approval_summary',  // 薪资审批汇总
    'view_monthly_payroll_trend',     // 月度薪资趋势
    
    // 员工相关视图 (人员报表数据源)  
    'view_employees_active',          // 在职员工 - 最常用
    'view_employees_all',             // 全体员工 - 包含历史数据
    'view_employee_basic_info',       // 员工基本信息
    'view_employee_category_hierarchy', // 员工分类层级
    'view_employee_contribution_bases_by_period', // 员工缴费基数
    
    // 组织架构视图 (组织报表数据源)
    'view_department_hierarchy',      // 部门层级结构
    'view_positions_with_details',    // 职位详情统计
    
    // 专业报表视图 (高级报表功能)
    'report_payroll_pivot_detail',    // 薪资透视报表
    'v_standard_insurance_components', // 标准保险组件
    
    // 核心数据表 (基于实际数据库验证 2025-08-30)
    'employees',                      // 员工基础信息表 ✓
    'departments',                    // 部门信息表 ✓
    'positions',                      // 职位信息表 ✓
    'payrolls',                       // 薪资记录表 (注意：不是payroll_results) ✓
    'payroll_periods',               // 薪资周期表 ✓
    'salary_components',             // 薪资组件表 ✓
    'employee_categories',           // 员工类别表 ✓
    'employee_category_assignments', // 员工类别分配表 ✓
    'payroll_items',                 // 薪资项目表 ✓
    
    // 辅助数据表 (实际存在的表)
    'user_profiles',                 // 用户档案表 ✓
    'report_templates',              // 报表模板表 ✓
    'system_settings',               // 系统设置表 (注意：不是system_configs) ✓
  ] as const;

  async canDiscover(): Promise<boolean> {
    return true;
  }

  async discover(): Promise<DataSource[]> {
    DataSourceLogger.info('discovery', 'Starting predefined tables discovery');

    const validationResults = await batchValidateTables([...this.KNOWN_TABLES]);
    const dataSources: DataSource[] = [];

    for (const [tableName, metadata] of validationResults) {
      if (metadata.exists) {
        const dataSource = this.createDataSourceFromMetadata(metadata);
        
        // 为已知的重要视图添加特殊标记
        if (tableName.startsWith('view_payroll_')) {
          dataSource.description = `🎯 ${dataSource.description} (薪资核心视图)`;
        }
        
        dataSources.push(dataSource);
      }
    }

    DataSourceLogger.info('discovery', `Found ${dataSources.length} existing tables from predefined list`);
    return dataSources;
  }

  private createDataSourceFromMetadata(metadata: TableMetadata): DataSource {
    return {
      name: metadata.name,
      type: this.inferTableType(metadata.name),
      schema: metadata.schema,
      description: this.generateDescription(metadata.name, metadata.recordCount),
      recordCount: metadata.recordCount,
      lastUpdated: new Date().toISOString(),
    };
  }

  private inferTableType(tableName: string): 'table' | 'view' {
    return tableName.startsWith('view_') ? 'view' : 'table';
  }

  private generateDescription(tableName: string, recordCount: number): string {
    const type = this.inferTableType(tableName);
    const countInfo = recordCount > 0 ? `(${recordCount} 条记录)` : '(无数据)';
    
    // 基于报表业务需求的描述映射 (2025-08-30优化)
    const descriptions: Record<string, string> = {
      // 薪资报表数据源 (核心业务数据)
      'view_payroll_summary': '薪资汇总视图 - 员工薪资列表展示',
      'view_payroll_unified': '薪资统一视图 - 包含薪资明细项目',
      'view_payroll_trend_unified': '薪资趋势视图 - 统计分析专用',
      'view_department_payroll_statistics': '部门薪资统计视图 - 部门维度分析',
      'view_payroll_approval_summary': '薪资审批汇总视图 - 审批状态统计',
      'view_monthly_payroll_trend': '月度薪资趋势视图 - 时间序列分析',
      
      // 员工报表数据源 (人力资源数据)
      'view_employees_active': '在职员工视图 - 当前活跃员工名单',
      'view_employees_all': '全员工视图 - 包含所有员工状态',
      'view_employee_basic_info': '员工基本信息视图 - 个人档案数据',
      'view_employee_category_hierarchy': '员工类别层级视图 - 人员分类统计',
      'view_employee_contribution_bases_by_period': '员工分期缴费基数视图 - 社保公积金基数',
      
      // 组织架构数据源 (组织管理数据)
      'view_department_hierarchy': '部门层级视图 - 组织架构树状结构',
      'view_positions_with_details': '职位详情视图 - 岗位配置和统计信息',
      
      // 专业报表数据源 (高级分析)
      'report_payroll_pivot_detail': '薪资透视报表 - 多维度交叉分析',
      'v_standard_insurance_components': '标准保险组件视图 - 社保公积金组件配置',
      
      // 核心业务数据表 (实际存在的表)
      'employees': '员工基础信息表 - 人员档案数据',
      'departments': '部门信息表 - 组织架构数据',
      'positions': '职位信息表 - 岗位职级定义',
      'payrolls': '薪资记录表 - 员工薪资发放记录',
      'payroll_periods': '薪资周期表 - 发薪周期管理',
      'salary_components': '薪资组件表 - 工资项目配置',
      'employee_categories': '员工类别表 - 人员分类定义',
      'employee_category_assignments': '员工类别分配表 - 人员分类关系',
      'payroll_items': '薪资项目表 - 具体薪资构成项',
      
      // 辅助数据表 (系统配置和模板)
      'user_profiles': '用户档案表 - 用户基本信息',
      'report_templates': '报表模板表 - 报表配置模板',
      'system_settings': '系统设置表 - 全局配置参数',
    };

    const customDescription = descriptions[tableName];
    return customDescription 
      ? `${customDescription} ${countInfo}`
      : `${type === 'view' ? '视图' : '表'} ${tableName} ${countInfo}`;
  }
}

// 数据源发现服务
export class DataSourceDiscoveryService {
  private strategies: DiscoveryStrategy[] = [
    new PredefinedTablesStrategy(),
    new ErrorBasedDiscoveryStrategy(),
  ];

  constructor() {
    // 按优先级排序策略
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  // 发现所有可用的数据源
  async discoverAll(): Promise<DataSource[]> {
    DataSourceLogger.info('service', 'Starting comprehensive data source discovery');

    const allDataSources = new Map<string, DataSource>();
    let totalDiscovered = 0;

    for (const strategy of this.strategies) {
      const strategyContext = `strategy-${strategy.name}`;
      
      try {
        const canDiscover = await strategy.canDiscover();
        if (!canDiscover) {
          DataSourceLogger.info(strategyContext, 'Strategy not available, skipping');
          continue;
        }

        DataSourceLogger.info(strategyContext, 'Executing discovery strategy');
        const sources = await strategy.discover();
        
        // 合并结果，优先级高的策略覆盖低优先级的
        for (const source of sources) {
          const existing = allDataSources.get(source.name);
          if (!existing || strategy.priority > (existing as any).priority) {
            allDataSources.set(source.name, { ...source, priority: strategy.priority } as any);
            totalDiscovered++;
          }
        }

        DataSourceLogger.info(strategyContext, `Discovered ${sources.length} data sources`);
        
      } catch (error) {
        DataSourceLogger.warn(strategyContext, 'Discovery strategy failed', { error });
      }
    }

    const finalSources = Array.from(allDataSources.values()).map(source => {
      const { priority, ...cleanSource } = source as any;
      return cleanSource as DataSource;
    });

    // 按记录数和名称排序
    finalSources.sort((a, b) => {
      // 优先显示有数据的表/视图
      if (a.recordCount > 0 && b.recordCount === 0) return -1;
      if (a.recordCount === 0 && b.recordCount > 0) return 1;
      
      // 其次按记录数降序
      if (a.recordCount !== b.recordCount) {
        return b.recordCount - a.recordCount;
      }
      
      // 最后按名称升序
      return a.name.localeCompare(b.name);
    });

    DataSourceLogger.info('service', `Discovery completed: ${finalSources.length} unique data sources found`, {
      withData: finalSources.filter(s => s.recordCount > 0).length,
      views: finalSources.filter(s => s.type === 'view').length,
      tables: finalSources.filter(s => s.type === 'table').length,
    });

    return finalSources;
  }

  // 获取指定数据源的列信息
  async getColumns(tableName: string): Promise<ColumnInfo[]> {
    const result = await safeExecute(
      async () => {
        const query = createTableQuery(tableName);
        const columns = await query.inferColumns();
        
        return columns.map(col => ({
          column_name: col.name,
          data_type: col.type,
          is_nullable: col.nullable,
          column_default: col.defaultValue,
          character_maximum_length: col.maxLength,
          display_name: col.name,
          description: col.description,
          is_key: col.isKey,
        }));
      },
      `get-columns-${tableName}`
    );

    return result.data ?? [];
  }

  // 验证数据源是否存在并返回基本信息
  async validateDataSource(tableName: string): Promise<{
    exists: boolean;
    recordCount: number;
    sampleData?: Record<string, unknown>;
    error?: string;
  }> {
    const result = await safeExecute(
      async () => {
        const query = createTableQuery(tableName);
        const [exists, recordCount, sampleData] = await Promise.all([
          query.exists(),
          query.getRecordCount(),
          query.getSampleData(1).catch(() => []),
        ]);

        return {
          exists,
          recordCount,
          sampleData: sampleData[0],
        };
      },
      `validate-${tableName}`
    );

    if (result.success && result.data) {
      return result.data;
    } else {
      return {
        exists: false,
        recordCount: 0,
        error: result.error?.message || 'Validation failed',
      };
    }
  }

  // 智能推荐薪资数据源
  async recommendPayrollDataSource(): Promise<{
    recommended: string | null;
    alternatives: string[];
    analysis: Array<{
      tableName: string;
      score: number;
      reasons: string[];
      recordCount: number;
      hasPayrollFields: boolean;
    }>;
  }> {
    DataSourceLogger.info('recommendation', 'Starting payroll data source recommendation');

    const dataSources = await this.discoverAll();
    const analysis = await this.analyzePayrollSuitability(dataSources);

    // 按评分排序
    analysis.sort((a, b) => b.score - a.score);

    const recommended = analysis.length > 0 && analysis[0].score > 0 ? analysis[0].tableName : null;
    const alternatives = analysis.slice(1, 4).map(a => a.tableName);

    DataSourceLogger.info('recommendation', 'Payroll recommendation completed', {
      recommended,
      topScore: analysis[0]?.score || 0,
      alternatives: alternatives.length,
    });

    return { recommended, alternatives, analysis };
  }

  private async analyzePayrollSuitability(dataSources: DataSource[]) {
    const { results } = await safeBatchExecute(
      dataSources,
      async (source) => {
        let score = 0;
        const reasons: string[] = [];
        let hasPayrollFields = false;

        // 表名评分
        const nameScore = this.calculateNameScore(source.name);
        score += nameScore.score;
        reasons.push(...nameScore.reasons);

        // 记录数评分
        if (source.recordCount > 0) {
          const recordScore = Math.min(
            source.recordCount / DATA_SOURCE_CONFIG.SCORING_WEIGHTS.RECORD_SCORE_DIVISOR,
            DATA_SOURCE_CONFIG.SCORING_WEIGHTS.MAX_RECORD_SCORE
          );
          score += recordScore;
          reasons.push(`有 ${source.recordCount} 条记录 (+${recordScore.toFixed(1)})`);
        } else {
          reasons.push('无数据记录');
        }

        // 字段结构评分
        try {
          const columns = await this.getColumns(source.name);
          const fieldScore = this.calculateFieldScore(columns);
          score += fieldScore.score;
          reasons.push(...fieldScore.reasons);
          hasPayrollFields = fieldScore.hasPayrollFields;
        } catch (error) {
          reasons.push('无法分析字段结构');
        }

        return {
          tableName: source.name,
          score,
          reasons,
          recordCount: source.recordCount,
          hasPayrollFields,
        };
      },
      'payroll-analysis',
      { concurrency: 3, continueOnError: true }
    );

    return results.filter(result => result !== null) as Array<{
      tableName: string;
      score: number;
      reasons: string[];
      recordCount: number;
      hasPayrollFields: boolean;
    }>;
  }

  private calculateNameScore(tableName: string) {
    let score = 0;
    const reasons: string[] = [];

    const keywords = DATA_SOURCE_CONFIG.KEYWORDS.PAYROLL;
    for (const keyword of keywords) {
      if (tableName.toLowerCase().includes(keyword.toLowerCase())) {
        score += DATA_SOURCE_CONFIG.SCORING_WEIGHTS.PAYROLL_KEYWORD;
        reasons.push(`表名包含关键词: ${keyword} (+${DATA_SOURCE_CONFIG.SCORING_WEIGHTS.PAYROLL_KEYWORD})`);
      }
    }

    return { score, reasons };
  }

  private calculateFieldScore(columns: ColumnInfo[]) {
    let score = 0;
    const reasons: string[] = [];
    let hasPayrollFields = false;

    const payrollFields = columns.filter(col =>
      DATA_SOURCE_CONFIG.KEYWORDS.PAYROLL_FIELDS.some(pf =>
        col.column_name.toLowerCase().includes(pf.toLowerCase())
      )
    );

    const employeeFields = columns.filter(col =>
      DATA_SOURCE_CONFIG.KEYWORDS.EMPLOYEE.some(ef =>
        col.column_name.toLowerCase().includes(ef.toLowerCase())
      )
    );

    const dateFields = columns.filter(col =>
      DATA_SOURCE_CONFIG.KEYWORDS.DATE_FIELDS.some(df =>
        col.column_name.toLowerCase().includes(df.toLowerCase())
      )
    );

    if (payrollFields.length > 0) {
      const fieldScore = payrollFields.length * DATA_SOURCE_CONFIG.SCORING_WEIGHTS.PAYROLL_FIELD;
      score += fieldScore;
      hasPayrollFields = true;
      reasons.push(`包含薪资字段: ${payrollFields.map(f => f.column_name).join(', ')} (+${fieldScore})`);
    }

    if (employeeFields.length > 0) {
      const fieldScore = employeeFields.length * DATA_SOURCE_CONFIG.SCORING_WEIGHTS.EMPLOYEE_FIELD;
      score += fieldScore;
      reasons.push(`包含员工字段: ${employeeFields.map(f => f.column_name).join(', ')} (+${fieldScore})`);
    }

    if (dateFields.length > 0) {
      const fieldScore = dateFields.length * DATA_SOURCE_CONFIG.SCORING_WEIGHTS.DATE_FIELD;
      score += fieldScore;
      reasons.push(`包含日期字段: ${dateFields.map(f => f.column_name).join(', ')} (+${fieldScore})`);
    }

    return { score, reasons, hasPayrollFields };
  }
}

// 单例服务实例
let discoveryServiceInstance: DataSourceDiscoveryService | null = null;

export const getDataSourceDiscoveryService = (): DataSourceDiscoveryService => {
  if (!discoveryServiceInstance) {
    discoveryServiceInstance = new DataSourceDiscoveryService();
  }
  return discoveryServiceInstance;
};