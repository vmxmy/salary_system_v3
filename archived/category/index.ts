/**
 * 人员类别相关Hook库导出
 * 
 * 这个模块提供了完整的人员类别管理功能：
 * - 人员类别列表和树形结构管理
 * - 人员类别选择器功能
 * - 向后兼容的类别名称Hook
 */

// 人员类别管理
export { 
  usePersonnelCategories, 
  usePersonnelCategoryNames,
  usePersonnelCategorySelector,
  personnelCategoryQueryKeys 
} from './usePersonnelCategories';
export type { PersonnelCategory, PersonnelCategoryTreeNode } from './usePersonnelCategories';