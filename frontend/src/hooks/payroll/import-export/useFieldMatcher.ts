import { useState, useCallback, useMemo } from 'react';
import { ImportDataGroup } from '@/types/payroll-import';
import { performAdvancedFuzzyMatching, getMatchTypeConfig, FUZZY_MATCHING_CONFIG } from './utils/fuzzy-matching';
import { getSalaryComponents, buildDbFieldsMapping } from './utils/field-mapping';

/**
 * 字段匹配信息接口
 */
export interface FieldMatchInfo {
  isMatched: boolean;
  matchType: 'exact' | 'high_fuzzy' | 'medium_fuzzy' | 'low_fuzzy' | 'unmapped';
  score: number;
  matchedField: string;
  allMatches: Array<{
    field: string;
    score: number;
    type: string;
    isExact: boolean;
  }>;
  confidence: string;
  color: string;
  icon: string;
  label: string;
}

/**
 * 匹配统计信息接口
 */
export interface MatchStatistics {
  total: number;
  exact: number;
  highFuzzy: number;
  mediumFuzzy: number;
  lowFuzzy: number;
  unmapped: number;
  matchRate: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Hook 配置接口
 */
export interface FieldMatcherConfig {
  enableLogging?: boolean;
  minThreshold?: number;
  customCandidateFields?: string[];
  dataGroupPatterns?: Record<ImportDataGroup, string[]>;
}

/**
 * 匹配模式类型
 */
export type MatchingMode = 
  | 'one-to-one'     // 1:1 单个字段匹配单个字段
  | 'one-to-many'    // 1:N 单个字段匹配多个候选字段
  | 'many-to-one'    // N:1 多个字段匹配单个候选字段
  | 'many-to-many';  // N:N 多个字段匹配多个候选字段

/**
 * 匹配请求接口
 */
export interface MatchingRequest {
  mode: MatchingMode;
  sourceFields: string | string[];
  candidateFields?: string | string[];
  dataGroup?: ImportDataGroup;
  customConfig?: Partial<FieldMatcherConfig>;
}

/**
 * 批量匹配结果接口
 */
export interface BatchMatchResult {
  mode: MatchingMode;
  sourceFields: string[];
  results: Map<string, FieldMatchInfo>;
  statistics: MatchStatistics;
  bestMatches: Array<{
    sourceField: string;
    targetField: string;
    score: number;
    matchType: string;
  }>;
  unmatchedFields: string[];
}

/**
 * 通用字段匹配 Hook
 * 支持多种匹配模式：n 对 n、1 对 n、n 对 1、1 对 1
 */
export const useFieldMatcher = (config?: FieldMatcherConfig) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<{
    columns: string[];
    dataGroup?: ImportDataGroup;
    results: Map<string, FieldMatchInfo>;
  } | null>(null);

  // 默认配置
  const defaultConfig = useMemo(() => ({
    enableLogging: false,
    minThreshold: FUZZY_MATCHING_CONFIG.THRESHOLDS.MIN_THRESHOLD,
    customCandidateFields: [],
    dataGroupPatterns: {
      [ImportDataGroup.EARNINGS]: [
        '工资', '奖金', '补贴', '津贴', '扣款', '代扣', 
        '基本', '岗位', '绩效', '加班', '交通', '餐费',
        '个税', '社保', '公积金', '应发', '实发', '扣除'
      ],
      [ImportDataGroup.CONTRIBUTION_BASES]: [
        '基数', '保险', '养老', '医疗', '失业', '工伤', '生育', 
        '住房', '公积金', '社保', '五险一金'
      ],
      [ImportDataGroup.CATEGORY_ASSIGNMENT]: [
        '类别', '性质', '在编', '合同', '临时', '正式', '试用'
      ],
      [ImportDataGroup.JOB_ASSIGNMENT]: [
        '部门', '科室', '职位', '岗位', '职务', '级别'
      ]
    },
    ...config
  }), [config]);

  /**
   * 获取候选字段列表（完全动态版本，支持别名匹配）
   */
  const getCandidateFields = useCallback(async (dataGroup?: ImportDataGroup) => {
    try {
      // 导入动态字段获取函数
      const { getDynamicTargetFields } = await import('./utils/field-mapping');
      
      // 完全从数据库获取候选字段
      const dynamicFields = await getDynamicTargetFields(dataGroup);
      const candidateFields: string[] = [];
      
      // 收集所有字段名和别名
      dynamicFields.forEach(field => {
        // 添加主字段名
        candidateFields.push(field.name);
        
        // 添加匹配别名
        if (field.match_aliases) {
          candidateFields.push(...field.match_aliases);
        }
        
        // 如果有显示名称，也加入候选
        if (field.display_name) {
          candidateFields.push(field.display_name);
        }
      });
      
      // 添加自定义候选字段
      if (defaultConfig.customCandidateFields) {
        candidateFields.push(...defaultConfig.customCandidateFields);
      }

      console.log(`🎯 动态获取候选字段完成，共 ${candidateFields.length} 个字段（包含别名）`);
      return [...new Set(candidateFields)]; // 去重
    } catch (error) {
      console.error('❌ 获取动态候选字段失败:', error);
      return [];
    }
  }, [defaultConfig]);

  /**
   * 对单个字段进行完整匹配分析
   */
  const analyzeFieldMatch = useCallback(async (
    columnName: string, 
    dataGroup?: ImportDataGroup
  ): Promise<FieldMatchInfo> => {
    const candidateFields = await getCandidateFields(dataGroup);
    
    if (defaultConfig.enableLogging) {
      console.log(`🔍 [FieldMatcher] 分析 "${columnName}"，候选字段数：${candidateFields.length}`);
    }

    // 🚀 穷尽搜索：与每个候选字段进行完整比较
    let globalBestMatch = { 
      score: 0, 
      type: 'unmapped', 
      field: '', 
      details: null as any,
      isExactMatch: false 
    };

    const allMatchResults: Array<{field: string, score: number, type: string, isExact: boolean}> = [];

    for (const candidateField of candidateFields) {
      // 1. 检查精确匹配
      const isExactMatch = columnName === candidateField || 
                          columnName.toLowerCase() === candidateField.toLowerCase();
      
      if (isExactMatch) {
        allMatchResults.push({
          field: candidateField,
          score: 100,
          type: 'exact',
          isExact: true
        });
        
        // 精确匹配直接设为最佳匹配，但继续比较其他字段
        globalBestMatch = {
          score: 100,
          type: 'exact',
          field: candidateField,
          details: { type: 'exact', algorithm: 'exact_match' },
          isExactMatch: true
        };
        continue;
      }
      
      // 2. 模糊匹配
      const fuzzyMatchResult = performAdvancedFuzzyMatching(columnName, candidateField);
      allMatchResults.push({
        field: candidateField,
        score: fuzzyMatchResult.score,
        type: fuzzyMatchResult.details.type,
        isExact: false
      });
      
      // 3. 更新全局最佳匹配（但不提前返回）
      if (fuzzyMatchResult.score > globalBestMatch.score) {
        globalBestMatch = {
          score: fuzzyMatchResult.score,
          type: fuzzyMatchResult.details.type,
          field: candidateField,
          details: fuzzyMatchResult.details,
          isExactMatch: false
        };
      }
    }

    // 📊 调试日志
    if (defaultConfig.enableLogging) {
      console.log(`📊 [FieldMatcher] "${columnName}" 分析结果:`);
      allMatchResults
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.field} (${result.score}分, ${result.type}${result.isExact ? ', 精确' : ''})`);
        });
      console.log(`  🎯 最终选择: ${globalBestMatch.field} (${globalBestMatch.score}分, ${globalBestMatch.type})`);
    }

    // 构建完整的匹配信息
    const isMatched = globalBestMatch.score >= (defaultConfig.minThreshold || 45);
    const matchConfig = getMatchTypeConfig(globalBestMatch.type);

    return {
      isMatched,
      matchType: globalBestMatch.type as any,
      score: globalBestMatch.score,
      matchedField: globalBestMatch.field,
      allMatches: allMatchResults.filter(r => r.score >= (defaultConfig.minThreshold || 45)),
      confidence: matchConfig.confidence,
      color: matchConfig.color,
      icon: matchConfig.icon,
      label: matchConfig.label
    };
  }, [getCandidateFields, defaultConfig]);

  /**
   * 批量分析多个字段
   */
  const analyzeColumns = useCallback(async (
    columns: string[],
    dataGroup?: ImportDataGroup
  ): Promise<Map<string, FieldMatchInfo>> => {
    setIsLoading(true);
    
    try {
      const results = new Map<string, FieldMatchInfo>();
      
      // 并发分析所有列
      const analysisPromises = columns.map(async (column) => {
        const matchInfo = await analyzeFieldMatch(column, dataGroup);
        return { column, matchInfo };
      });

      const analysisResults = await Promise.all(analysisPromises);
      
      analysisResults.forEach(({ column, matchInfo }) => {
        results.set(column, matchInfo);
      });

      // 缓存最后一次分析结果
      setLastAnalysis({
        columns,
        dataGroup,
        results
      });

      if (defaultConfig.enableLogging) {
        console.log(`✅ [FieldMatcher] 批量分析完成，共处理 ${columns.length} 个字段`);
      }

      return results;
    } finally {
      setIsLoading(false);
    }
  }, [analyzeFieldMatch, defaultConfig]);

  /**
   * 计算匹配统计信息
   */
  const calculateStatistics = useCallback((
    matchResults: Map<string, FieldMatchInfo>
  ): MatchStatistics => {
    const total = matchResults.size;
    let exact = 0, highFuzzy = 0, mediumFuzzy = 0, lowFuzzy = 0, unmapped = 0;

    matchResults.forEach((match) => {
      switch (match.matchType) {
        case 'exact': exact++; break;
        case 'high_fuzzy': highFuzzy++; break;
        case 'medium_fuzzy': mediumFuzzy++; break;
        case 'low_fuzzy': lowFuzzy++; break;
        case 'unmapped': unmapped++; break;
      }
    });

    const matchedTotal = exact + highFuzzy + mediumFuzzy + lowFuzzy;
    const matchRate = total > 0 ? Math.round((matchedTotal / total) * 100) : 0;
    
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (matchRate >= 80) confidence = 'high';
    else if (matchRate >= 50) confidence = 'medium';

    return {
      total,
      exact,
      highFuzzy,
      mediumFuzzy,
      lowFuzzy,
      unmapped,
      matchRate,
      confidence
    };
  }, []);

  /**
   * 获取匹配建议
   */
  const getMatchSuggestions = useCallback((
    columnName: string,
    matchInfo: FieldMatchInfo
  ): string[] => {
    if (matchInfo.isMatched) {
      return [matchInfo.matchedField];
    }

    return matchInfo.allMatches
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(match => match.field);
  }, []);

  /**
   * 灵活的匹配函数 - 支持多种匹配模式
   */
  const performFlexibleMatching = useCallback(async (request: MatchingRequest): Promise<BatchMatchResult> => {
    setIsLoading(true);
    
    try {
      const { mode, sourceFields, candidateFields, dataGroup, customConfig } = request;
      
      // 合并配置
      const mergedConfig = { ...defaultConfig, ...customConfig };
      
      // 标准化输入
      const normalizedSourceFields = Array.isArray(sourceFields) ? sourceFields : [sourceFields];
      
      // 获取候选字段
      let finalCandidateFields: string[];
      if (candidateFields) {
        finalCandidateFields = Array.isArray(candidateFields) ? candidateFields : [candidateFields];
      } else {
        finalCandidateFields = await getCandidateFields(dataGroup);
      }

      const results = new Map<string, FieldMatchInfo>();
      const bestMatches: Array<{ sourceField: string; targetField: string; score: number; matchType: string; }> = [];
      const unmatchedFields: string[] = [];

      if (mergedConfig.enableLogging) {
        console.log(`🚀 [FlexibleMatcher] 模式: ${mode}`);
        console.log(`📥 源字段 (${normalizedSourceFields.length}):`, normalizedSourceFields);
        console.log(`📋 候选字段 (${finalCandidateFields.length}):`, finalCandidateFields);
      }

      // 根据匹配模式执行不同的策略
      switch (mode) {
        case 'one-to-one':
          // 1:1 模式：单个源字段匹配单个最佳候选字段
          for (const sourceField of normalizedSourceFields) {
            const matchInfo = await analyzeFieldMatch(sourceField, dataGroup);
            results.set(sourceField, matchInfo);
            
            if (matchInfo.isMatched) {
              bestMatches.push({
                sourceField,
                targetField: matchInfo.matchedField,
                score: matchInfo.score,
                matchType: matchInfo.matchType
              });
            } else {
              unmatchedFields.push(sourceField);
            }
          }
          break;

        case 'one-to-many':
          // 1:N 模式：单个源字段匹配多个候选字段，返回所有符合阈值的匹配
          for (const sourceField of normalizedSourceFields) {
            const allMatches: Array<{field: string, score: number, type: string, isExact: boolean}> = [];
            
            for (const candidateField of finalCandidateFields) {
              const isExactMatch = sourceField === candidateField || 
                                 sourceField.toLowerCase() === candidateField.toLowerCase();
              
              if (isExactMatch) {
                allMatches.push({ field: candidateField, score: 100, type: 'exact', isExact: true });
              } else {
                const fuzzyResult = performAdvancedFuzzyMatching(sourceField, candidateField);
                if (fuzzyResult.score >= mergedConfig.minThreshold!) {
                  allMatches.push({ 
                    field: candidateField, 
                    score: fuzzyResult.score, 
                    type: fuzzyResult.details.type,
                    isExact: false 
                  });
                }
              }
            }
            
            // 选择最佳匹配作为主要结果，但保留所有匹配信息
            const bestMatch = allMatches.sort((a, b) => b.score - a.score)[0];
            const matchConfig = bestMatch ? getMatchTypeConfig(bestMatch.type) : getMatchTypeConfig('unmapped');
            
            const matchInfo: FieldMatchInfo = {
              isMatched: !!bestMatch,
              matchType: bestMatch?.type as any || 'unmapped',
              score: bestMatch?.score || 0,
              matchedField: bestMatch?.field || '',
              allMatches,
              confidence: matchConfig.confidence,
              color: matchConfig.color,
              icon: matchConfig.icon,
              label: matchConfig.label
            };
            
            results.set(sourceField, matchInfo);
            
            if (bestMatch) {
              bestMatches.push({
                sourceField,
                targetField: bestMatch.field,
                score: bestMatch.score,
                matchType: bestMatch.type
              });
            } else {
              unmatchedFields.push(sourceField);
            }
          }
          break;

        case 'many-to-one':
          // N:1 模式：多个源字段竞争匹配单个候选字段（选择最佳匹配）
          const candidateField = finalCandidateFields[0] || '';
          if (!candidateField) {
            throw new Error('many-to-one 模式需要至少一个候选字段');
          }
          
          let bestSourceMatch = { sourceField: '', score: 0, type: 'unmapped', details: null as any };
          
          for (const sourceField of normalizedSourceFields) {
            const isExactMatch = sourceField === candidateField ||
                               sourceField.toLowerCase() === candidateField.toLowerCase();
            
            if (isExactMatch) {
              bestSourceMatch = { sourceField, score: 100, type: 'exact', details: { type: 'exact' } };
            } else {
              const fuzzyResult = performAdvancedFuzzyMatching(sourceField, candidateField);
              if (fuzzyResult.score > bestSourceMatch.score) {
                bestSourceMatch = {
                  sourceField,
                  score: fuzzyResult.score,
                  type: fuzzyResult.details.type,
                  details: fuzzyResult.details
                };
              }
            }
          }
          
          // 只有最佳匹配的源字段被标记为匹配
          for (const sourceField of normalizedSourceFields) {
            const isWinner = sourceField === bestSourceMatch.sourceField;
            const matchConfig = isWinner ? 
              getMatchTypeConfig(bestSourceMatch.type) : 
              getMatchTypeConfig('unmapped');
            
            const matchInfo: FieldMatchInfo = {
              isMatched: isWinner && bestSourceMatch.score >= mergedConfig.minThreshold!,
              matchType: isWinner ? bestSourceMatch.type as any : 'unmapped',
              score: isWinner ? bestSourceMatch.score : 0,
              matchedField: isWinner ? candidateField : '',
              allMatches: isWinner ? [{ 
                field: candidateField, 
                score: bestSourceMatch.score, 
                type: bestSourceMatch.type, 
                isExact: bestSourceMatch.type === 'exact' 
              }] : [],
              confidence: matchConfig.confidence,
              color: matchConfig.color,
              icon: matchConfig.icon,
              label: matchConfig.label
            };
            
            results.set(sourceField, matchInfo);
            
            if (isWinner && bestSourceMatch.score >= mergedConfig.minThreshold!) {
              bestMatches.push({
                sourceField: bestSourceMatch.sourceField,
                targetField: candidateField,
                score: bestSourceMatch.score,
                matchType: bestSourceMatch.type
              });
            } else if (!isWinner) {
              unmatchedFields.push(sourceField);
            }
          }
          break;

        case 'many-to-many':
          // N:N 模式：多个源字段匹配多个候选字段（全局最优分配）
          // 使用贪心算法或匈牙利算法进行最优分配
          const matchMatrix: Array<Array<{score: number, type: string}>> = [];
          
          // 构建匹配矩阵
          for (let i = 0; i < normalizedSourceFields.length; i++) {
            matchMatrix[i] = [];
            const sourceField = normalizedSourceFields[i];
            
            for (let j = 0; j < finalCandidateFields.length; j++) {
              const candidateField = finalCandidateFields[j];
              
              const isExactMatch = sourceField === candidateField ||
                                 sourceField.toLowerCase() === candidateField.toLowerCase();
              
              if (isExactMatch) {
                matchMatrix[i][j] = { score: 100, type: 'exact' };
              } else {
                const fuzzyResult = performAdvancedFuzzyMatching(sourceField, candidateField);
                matchMatrix[i][j] = { score: fuzzyResult.score, type: fuzzyResult.details.type };
              }
            }
          }
          
          // 使用贪心算法进行分配
          const usedCandidates = new Set<number>();
          
          for (let i = 0; i < normalizedSourceFields.length; i++) {
            const sourceField = normalizedSourceFields[i];
            let bestMatch = { candidateIndex: -1, score: 0, type: 'unmapped' };
            
            // 找到当前源字段的最佳未使用候选字段
            for (let j = 0; j < finalCandidateFields.length; j++) {
              if (!usedCandidates.has(j) && 
                  matchMatrix[i][j].score > bestMatch.score &&
                  matchMatrix[i][j].score >= mergedConfig.minThreshold!) {
                bestMatch = {
                  candidateIndex: j,
                  score: matchMatrix[i][j].score,
                  type: matchMatrix[i][j].type
                };
              }
            }
            
            const matchConfig = getMatchTypeConfig(bestMatch.type);
            const matchInfo: FieldMatchInfo = {
              isMatched: bestMatch.candidateIndex >= 0,
              matchType: bestMatch.type as any,
              score: bestMatch.score,
              matchedField: bestMatch.candidateIndex >= 0 ? finalCandidateFields[bestMatch.candidateIndex] : '',
              allMatches: bestMatch.candidateIndex >= 0 ? [{
                field: finalCandidateFields[bestMatch.candidateIndex],
                score: bestMatch.score,
                type: bestMatch.type,
                isExact: bestMatch.type === 'exact'
              }] : [],
              confidence: matchConfig.confidence,
              color: matchConfig.color,
              icon: matchConfig.icon,
              label: matchConfig.label
            };
            
            results.set(sourceField, matchInfo);
            
            if (bestMatch.candidateIndex >= 0) {
              usedCandidates.add(bestMatch.candidateIndex);
              bestMatches.push({
                sourceField,
                targetField: finalCandidateFields[bestMatch.candidateIndex],
                score: bestMatch.score,
                matchType: bestMatch.type
              });
            } else {
              unmatchedFields.push(sourceField);
            }
          }
          break;
      }

      const statistics = calculateStatistics(results);
      
      if (mergedConfig.enableLogging) {
        console.log(`✅ [FlexibleMatcher] 完成，匹配率: ${statistics.matchRate}%`);
        console.log(`🎯 最佳匹配 (${bestMatches.length}):`, bestMatches);
        console.log(`❌ 未匹配字段 (${unmatchedFields.length}):`, unmatchedFields);
      }

      return {
        mode,
        sourceFields: normalizedSourceFields,
        results,
        statistics,
        bestMatches,
        unmatchedFields
      };
    } finally {
      setIsLoading(false);
    }
  }, [analyzeFieldMatch, getCandidateFields, calculateStatistics, defaultConfig]);

  /**
   * 重置分析状态
   */
  const reset = useCallback(() => {
    setLastAnalysis(null);
    setIsLoading(false);
  }, []);

  return {
    // 核心功能
    analyzeFieldMatch,
    analyzeColumns,
    performFlexibleMatching,
    
    // 统计和分析
    calculateStatistics,
    getMatchSuggestions,
    
    // 状态管理
    isLoading,
    lastAnalysis,
    reset,

    // 配置
    config: defaultConfig
  };
};

/**
 * 简化版本的匹配 Hook，用于快速检查单个字段
 */
export const useSimpleFieldMatcher = () => {
  const { analyzeFieldMatch } = useFieldMatcher({ enableLogging: false });

  const checkFieldMatch = useCallback(async (
    columnName: string,
    dataGroup?: ImportDataGroup
  ): Promise<boolean> => {
    const matchInfo = await analyzeFieldMatch(columnName, dataGroup);
    return matchInfo.isMatched;
  }, [analyzeFieldMatch]);

  return { checkFieldMatch };
};

/**
 * 便捷函数：创建不同模式的匹配请求
 */
export const createMatchingRequest = {
  /**
   * 1:1 匹配：单个字段找最佳匹配
   */
  oneToOne: (sourceField: string, dataGroup?: ImportDataGroup, candidateFields?: string[]): MatchingRequest => ({
    mode: 'one-to-one',
    sourceFields: sourceField,
    candidateFields,
    dataGroup
  }),

  /**
   * 1:N 匹配：单个字段匹配多个候选项
   */
  oneToMany: (sourceField: string, candidateFields: string[], dataGroup?: ImportDataGroup): MatchingRequest => ({
    mode: 'one-to-many',
    sourceFields: sourceField,
    candidateFields,
    dataGroup
  }),

  /**
   * N:1 匹配：多个字段竞争单个目标
   */
  manyToOne: (sourceFields: string[], targetField: string, dataGroup?: ImportDataGroup): MatchingRequest => ({
    mode: 'many-to-one',
    sourceFields,
    candidateFields: targetField,
    dataGroup
  }),

  /**
   * N:N 匹配：多个字段最优分配
   */
  manyToMany: (sourceFields: string[], candidateFields?: string[], dataGroup?: ImportDataGroup): MatchingRequest => ({
    mode: 'many-to-many',
    sourceFields,
    candidateFields,
    dataGroup
  }),

  /**
   * 批量Excel列匹配（最常用场景）
   */
  batchExcelColumns: (excelColumns: string[], dataGroup: ImportDataGroup): MatchingRequest => ({
    mode: 'many-to-many',
    sourceFields: excelColumns,
    dataGroup,
    customConfig: {
      enableLogging: true,
      minThreshold: 45
    }
  })
};

/**
 * 使用示例和类型导出
 */
// 类型已在上方定义并通过interface导出，这里不需要重复导出

/**
 * 使用示例：
 * 
 * // 1. 基础单字段匹配
 * const matcher = useFieldMatcher();
 * const result = await matcher.analyzeFieldMatch('员工姓名', ImportDataGroup.EARNINGS);
 * 
 * // 2. 批量Excel列分析
 * const excelColumns = ['姓名', '基本工资', '绩效奖金', '扣款'];
 * const batchResult = await matcher.analyzeColumns(excelColumns, ImportDataGroup.EARNINGS);
 * 
 * // 3. 灵活模式匹配
 * const request = createMatchingRequest.manyToMany(
 *   ['员工名称', '工资', '奖金'], 
 *   ['employee_name', 'base_salary', 'bonus'],
 *   ImportDataGroup.EARNINGS
 * );
 * const flexibleResult = await matcher.performFlexibleMatching(request);
 * 
 * // 4. 快速字段检查
 * const simpleMatcher = useSimpleFieldMatcher();
 * const isMatched = await simpleMatcher.checkFieldMatch('员工姓名');
 */