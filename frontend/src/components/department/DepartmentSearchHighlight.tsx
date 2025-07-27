import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DepartmentSearchHighlightProps {
  text: string;
  searchTerm: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * 高亮显示搜索关键词的组件
 */
export function DepartmentSearchHighlight({
  text,
  searchTerm,
  className,
  highlightClassName = 'bg-warning/30 text-text-primary font-medium'
}: DepartmentSearchHighlightProps) {
  // 分割文本并高亮匹配部分
  const parts = useMemo(() => {
    if (!searchTerm || !text) {
      return [{ text, isHighlight: false }];
    }

    // 转义正则表达式特殊字符
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 创建不区分大小写的正则表达式
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    
    // 分割文本
    const splits = text.split(regex);
    
    // 构建部分数组
    return splits.map((part, index) => ({
      text: part,
      isHighlight: index % 2 === 1 // 奇数索引是匹配的部分
    })).filter(part => part.text); // 过滤空字符串
  }, [text, searchTerm]);

  return (
    <span className={className}>
      {parts.map((part, index) => (
        <span
          key={index}
          className={part.isHighlight ? highlightClassName : undefined}
        >
          {part.text}
        </span>
      ))}
    </span>
  );
}

/**
 * 多字段搜索高亮组件
 */
interface MultiFieldHighlightProps {
  fields: Array<{
    label: string;
    value: string | null | undefined;
    icon?: React.ReactNode;
  }>;
  searchTerm: string;
  className?: string;
}

export function MultiFieldHighlight({
  fields,
  searchTerm,
  className
}: MultiFieldHighlightProps) {
  // 过滤有值的字段
  const validFields = fields.filter(field => field.value);
  
  // 查找包含搜索词的字段
  const matchedFields = useMemo(() => {
    if (!searchTerm) return validFields;
    
    return validFields.filter(field => 
      field.value?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [validFields, searchTerm]);

  // 如果有匹配的字段，只显示匹配的；否则显示所有
  const displayFields = matchedFields.length > 0 ? matchedFields : validFields;

  return (
    <div className={cn('space-y-1', className)}>
      {displayFields.map((field, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          {field.icon && (
            <span className="text-text-tertiary">{field.icon}</span>
          )}
          <span className="text-text-secondary">{field.label}:</span>
          <DepartmentSearchHighlight
            text={field.value || ''}
            searchTerm={searchTerm}
            className="text-text-primary"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * 获取搜索匹配度分数
 */
export function getSearchRelevanceScore(text: string, searchTerm: string): number {
  if (!searchTerm || !text) return 0;
  
  const lowerText = text.toLowerCase();
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  // 完全匹配得分最高
  if (lowerText === lowerSearchTerm) return 100;
  
  // 开头匹配得分较高
  if (lowerText.startsWith(lowerSearchTerm)) return 80;
  
  // 包含匹配得分中等
  if (lowerText.includes(lowerSearchTerm)) {
    // 计算匹配位置，越靠前分数越高
    const position = lowerText.indexOf(lowerSearchTerm);
    const positionScore = 60 - (position / lowerText.length) * 20;
    return Math.round(positionScore);
  }
  
  // 模糊匹配（每个字符都在文本中）
  const chars = lowerSearchTerm.split('');
  const matchedChars = chars.filter(char => lowerText.includes(char));
  const fuzzyScore = (matchedChars.length / chars.length) * 40;
  
  return Math.round(fuzzyScore);
}

/**
 * 按搜索相关性排序
 */
export function sortByRelevance<T>(
  items: T[],
  searchTerm: string,
  getSearchableText: (item: T) => string
): T[] {
  if (!searchTerm) return items;
  
  return [...items].sort((a, b) => {
    const scoreA = getSearchRelevanceScore(getSearchableText(a), searchTerm);
    const scoreB = getSearchRelevanceScore(getSearchableText(b), searchTerm);
    return scoreB - scoreA;
  });
}