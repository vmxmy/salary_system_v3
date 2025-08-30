import { ratio, partial_ratio, token_sort_ratio, token_set_ratio } from 'fuzzball';
import type { ColumnMatchResult, SalaryComponent } from '../types';
import { ImportDataGroup } from '@/types/payroll-import';

/**
 * 模糊匹配配置
 */
export const FUZZY_MATCHING_CONFIG = {
  // 匹配置信度阈值
  THRESHOLDS: {
    EXACT_MATCH: 100,        // 精确匹配
    HIGH_CONFIDENCE: 85,     // 高置信度（可自动导入）
    MEDIUM_CONFIDENCE: 70,   // 中等置信度（显示建议）
    LOW_CONFIDENCE: 55,      // 低置信度（仅作提示）
    MIN_THRESHOLD: 45        // 最低阈值（低于此值不显示）
  },
  
  // 匹配算法权重
  ALGORITHM_WEIGHTS: {
    RATIO: 0.4,              // 基础相似度
    PARTIAL_RATIO: 0.3,      // 部分匹配
    TOKEN_SORT_RATIO: 0.2,   // 词序排列匹配
    TOKEN_SET_RATIO: 0.1     // 词集合匹配
  },
  
  // 中文特殊处理规则
  CHINESE_RULES: {
    IGNORE_CHARS: ['项', '费', '金', '款', '税'],  // 忽略的常用后缀
    BOOST_KEYWORDS: ['基本', '工资', '奖金', '补贴', '津贴', '扣除', '代扣'], // 提升权重的关键词
    BOOST_SCORE: 10  // 关键词匹配的额外分数
  }
} as const;

/**
 * 高级模糊匹配算法
 * 使用 fuzzball.js 进行中文优化的字符串匹配
 */
export const performAdvancedFuzzyMatching = (
  excelColumn: string, 
  dbField: string
): { score: number; details: any } => {
  // 预处理：移除空格和特殊字符
  const cleanExcel = excelColumn.trim().replace(/[\s\-_]/g, '');
  const cleanDbField = dbField.trim().replace(/[\s\-_]/g, '');
  
  // 完全精确匹配（忽略大小写）
  if (cleanExcel.toLowerCase() === cleanDbField.toLowerCase()) {
    return { 
      score: FUZZY_MATCHING_CONFIG.THRESHOLDS.EXACT_MATCH, 
      details: { type: 'exact', algorithm: 'exact_match' }
    };
  }
  
  // 计算各种相似度分数
  const scores = {
    ratio: ratio(cleanExcel, cleanDbField),
    partialRatio: partial_ratio(cleanExcel, cleanDbField),
    tokenSortRatio: token_sort_ratio(cleanExcel, cleanDbField),
    tokenSetRatio: token_set_ratio(cleanExcel, cleanDbField)
  };
  
  // 计算加权平均分数
  const { ALGORITHM_WEIGHTS } = FUZZY_MATCHING_CONFIG;
  const weightedScore = 
    scores.ratio * ALGORITHM_WEIGHTS.RATIO +
    scores.partialRatio * ALGORITHM_WEIGHTS.PARTIAL_RATIO +
    scores.tokenSortRatio * ALGORITHM_WEIGHTS.TOKEN_SORT_RATIO +
    scores.tokenSetRatio * ALGORITHM_WEIGHTS.TOKEN_SET_RATIO;
  
  // 中文特殊处理：关键词匹配加分
  let bonusScore = 0;
  const { BOOST_KEYWORDS, BOOST_SCORE } = FUZZY_MATCHING_CONFIG.CHINESE_RULES;
  
  for (const keyword of BOOST_KEYWORDS) {
    if (cleanExcel.includes(keyword) && cleanDbField.includes(keyword)) {
      bonusScore += BOOST_SCORE;
      break; // 只加一次分
    }
  }
  
  const finalScore = Math.min(100, Math.round(weightedScore + bonusScore));
  
  return {
    score: finalScore,
    details: {
      type: getMatchType(finalScore),
      algorithm: 'fuzzball_weighted',
      scores,
      bonusScore,
      weightedScore: Math.round(weightedScore)
    }
  };
};

/**
 * 根据分数确定匹配类型
 */
const getMatchType = (score: number): string => {
  const { THRESHOLDS } = FUZZY_MATCHING_CONFIG;
  
  if (score >= THRESHOLDS.EXACT_MATCH) return 'exact';
  if (score >= THRESHOLDS.HIGH_CONFIDENCE) return 'high_fuzzy';
  if (score >= THRESHOLDS.MEDIUM_CONFIDENCE) return 'medium_fuzzy';
  if (score >= THRESHOLDS.LOW_CONFIDENCE) return 'low_fuzzy';
  return 'unmapped';
};

/**
 * 智能字段匹配：结合精确匹配和模糊匹配
 * 修复版本：确保每个Excel列都与所有数据库字段进行完整比较
 */
export const performSmartFieldMatching = (
  excelColumns: string[],
  dbFields: Map<string, { type: string; required: boolean }>
): ColumnMatchResult[] => {
  console.log('🧠 使用智能字段匹配（精确+模糊）- 穷尽搜索版本');
  console.log('📥 Excel列名:', excelColumns);
  console.log('📋 数据库字段:', Array.from(dbFields.keys()));

  const matchResults: ColumnMatchResult[] = [];
  const dbFieldsList = Array.from(dbFields.keys());

  excelColumns.forEach(excelColumn => {
    console.log(`🔍 [完整搜索] 分析Excel列: "${excelColumn}"`);
    
    // 🚀 关键修复：与所有数据库字段进行完整比较
    const allMatchScores: Array<{
      dbField: string;
      score: number;
      details: any;
      isExact: boolean;
    }> = [];

    let globalBestMatch = {
      dbField: null as string | null,
      score: 0,
      details: null as any,
      isExact: false
    };

    // 对每个数据库字段都进行完整的匹配测试
    dbFieldsList.forEach(dbField => {
      // 1. 检查精确匹配
      const isExactMatch = excelColumn === dbField || 
                          excelColumn.toLowerCase() === dbField.toLowerCase();
      
      if (isExactMatch) {
        allMatchScores.push({
          dbField,
          score: 100,
          details: { type: 'exact', algorithm: 'exact_match' },
          isExact: true
        });
        
        // 精确匹配优先，但继续比较所有字段
        if (100 > globalBestMatch.score) {
          globalBestMatch = {
            dbField,
            score: 100,
            details: { type: 'exact', algorithm: 'exact_match' },
            isExact: true
          };
        }
        return; // 继续下一个字段
      }

      // 2. 模糊匹配
      const fuzzyResult = performAdvancedFuzzyMatching(excelColumn, dbField);
      allMatchScores.push({
        dbField,
        score: fuzzyResult.score,
        details: fuzzyResult.details,
        isExact: false
      });

      // 3. 更新全局最佳匹配（不提前退出）
      if (fuzzyResult.score > globalBestMatch.score) {
        globalBestMatch = {
          dbField,
          score: fuzzyResult.score,
          details: fuzzyResult.details,
          isExact: false
        };
      }
    });

    // 📊 详细的匹配分析日志
    console.log(`📊 [完整匹配分析] "${excelColumn}":`);
    const topMatches = allMatchScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    topMatches.forEach((match, index) => {
      console.log(`  ${index + 1}. ${match.dbField} (${match.score}分, ${match.details.type}${match.isExact ? ', 精确' : ''})`);
    });
    
    console.log(`  🎯 最终选择: ${globalBestMatch.dbField} (${globalBestMatch.score}分)`);

    // 根据全局最佳匹配结果构建 ColumnMatchResult
    if (globalBestMatch.score >= FUZZY_MATCHING_CONFIG.THRESHOLDS.MIN_THRESHOLD) {
      const fieldInfo = dbFields.get(globalBestMatch.dbField!);
      
      matchResults.push({
        excelColumn,
        dbField: globalBestMatch.dbField,
        matchType: globalBestMatch.details.type as any,
        matchScore: globalBestMatch.score,
        matchDetails: globalBestMatch.details,
        suggestions: [globalBestMatch.dbField!],
        isRequired: fieldInfo?.required || false
      });
      
      console.log(`  ✅ 匹配成功: ${excelColumn} -> ${globalBestMatch.dbField} (${globalBestMatch.score}分, ${globalBestMatch.details.type})`);
    } else {
      // 提供前3个最佳建议（基于完整搜索结果）
      const suggestions = topMatches
        .filter(match => match.score >= FUZZY_MATCHING_CONFIG.THRESHOLDS.LOW_CONFIDENCE)
        .slice(0, 3)
        .map(match => match.dbField);

      matchResults.push({
        excelColumn,
        dbField: null,
        matchType: 'unmapped',
        matchScore: globalBestMatch.score,
        suggestions,
        isRequired: false
      });
      
      console.log(`  ❌ 无有效匹配: ${excelColumn} (最高分: ${globalBestMatch.score}, 阈值: ${FUZZY_MATCHING_CONFIG.THRESHOLDS.MIN_THRESHOLD})`);
    }
  });

  console.log(`✅ 完整匹配分析完成，共处理 ${excelColumns.length} 个Excel列`);
  return matchResults;
};

/**
 * 获取匹配类型的显示配置
 */
export const getMatchTypeConfig = (matchType: string) => {
  switch (matchType) {
    case 'exact':
      return {
        color: 'success',
        label: '精确匹配',
        icon: '✓',
        confidence: '100%'
      };
    case 'high_fuzzy':
      return {
        color: 'success',
        label: '高相似度',
        icon: '✓',
        confidence: '85%+'
      };
    case 'medium_fuzzy':
      return {
        color: 'warning',
        label: '中等相似度',
        icon: '≈',
        confidence: '70%+'
      };
    case 'low_fuzzy':
      return {
        color: 'info',
        label: '低相似度',
        icon: '?',
        confidence: '55%+'
      };
    default:
      return {
        color: 'neutral',
        label: '未匹配',
        icon: '×',
        confidence: '0%'
      };
  }
};