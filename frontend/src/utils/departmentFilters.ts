import type { DepartmentNode, DepartmentSearchFilters, DepartmentPayrollStatistics } from '@/types/department';

/**
 * 过滤部门数据
 */
export function filterDepartments(
  departments: DepartmentNode[],
  filters: DepartmentSearchFilters,
  payrollStats?: Map<string, DepartmentPayrollStatistics>
): DepartmentNode[] {
  return departments.filter(dept => {
    // 搜索词过滤
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const nameMatch = dept.name.toLowerCase().includes(searchLower);
      const pathMatch = dept.full_path?.toLowerCase().includes(searchLower);
      if (!nameMatch && !pathMatch) return false;
    }

    // 父部门过滤
    if (filters.parentId !== undefined) {
      if (dept.parent_department_id !== filters.parentId) return false;
    }

    // 层级过滤
    if (filters.level !== undefined) {
      const deptLevel = dept.level || 1;
      if (filters.level === 4) {
        // 4级及以下
        if (deptLevel < 4) return false;
      } else {
        if (deptLevel !== filters.level) return false;
      }
    }

    // 员工状态过滤
    if (filters.hasEmployees !== undefined) {
      const hasEmployees = (dept.employee_count || 0) > 0;
      if (hasEmployees !== filters.hasEmployees) return false;
    }

    // 员工数量范围过滤
    const employeeCount = dept.employee_count || 0;
    if (filters.employeeCountMin !== undefined) {
      if (employeeCount < filters.employeeCountMin) return false;
    }
    if (filters.employeeCountMax !== undefined) {
      if (employeeCount > filters.employeeCountMax) return false;
    }

    // 平均薪资范围过滤（需要薪资统计数据）
    if (payrollStats && (filters.avgSalaryMin !== undefined || filters.avgSalaryMax !== undefined)) {
      const stats = payrollStats.get(dept.id);
      if (!stats) return false; // 没有薪资数据的部门过滤掉
      
      const avgSalary = stats.avg_gross_pay || 0;
      if (filters.avgSalaryMin !== undefined && avgSalary < filters.avgSalaryMin) return false;
      if (filters.avgSalaryMax !== undefined && avgSalary > filters.avgSalaryMax) return false;
    }

    return true;
  });
}

/**
 * 递归过滤部门树
 */
export function filterDepartmentTree(
  tree: DepartmentNode[],
  filters: DepartmentSearchFilters,
  payrollStats?: Map<string, DepartmentPayrollStatistics>
): DepartmentNode[] {
  const filterNode = (node: DepartmentNode): DepartmentNode | null => {
    // 先检查子节点
    const filteredChildren = node.children
      ?.map(child => filterNode(child))
      .filter((child): child is DepartmentNode => child !== null);

    // 检查当前节点是否匹配
    const nodeMatches = checkNodeMatch(node, filters, payrollStats);
    
    // 如果当前节点匹配，或者有匹配的子节点，则保留
    if (nodeMatches || (filteredChildren && filteredChildren.length > 0)) {
      return {
        ...node,
        children: filteredChildren
      };
    }

    return null;
  };

  return tree
    .map(node => filterNode(node))
    .filter((node): node is DepartmentNode => node !== null);
}

/**
 * 检查单个节点是否匹配过滤条件
 */
function checkNodeMatch(
  node: DepartmentNode,
  filters: DepartmentSearchFilters,
  payrollStats?: Map<string, DepartmentPayrollStatistics>
): boolean {
  // 搜索词匹配
  if (filters.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase();
    const nameMatch = node.name.toLowerCase().includes(searchLower);
    const pathMatch = node.full_path?.toLowerCase().includes(searchLower);
    if (!nameMatch && !pathMatch) return false;
  }

  // 层级过滤
  if (filters.level !== undefined) {
    const nodeLevel = node.level || 1;
    if (filters.level === 4) {
      if (nodeLevel < 4) return false;
    } else {
      if (nodeLevel !== filters.level) return false;
    }
  }

  // 员工状态过滤
  if (filters.hasEmployees !== undefined) {
    const hasEmployees = (node.employee_count || 0) > 0;
    if (hasEmployees !== filters.hasEmployees) return false;
  }

  // 员工数量范围
  const employeeCount = node.employee_count || 0;
  if (filters.employeeCountMin !== undefined && employeeCount < filters.employeeCountMin) return false;
  if (filters.employeeCountMax !== undefined && employeeCount > filters.employeeCountMax) return false;

  // 薪资范围
  if (payrollStats && (filters.avgSalaryMin !== undefined || filters.avgSalaryMax !== undefined)) {
    const stats = payrollStats.get(node.id);
    if (!stats) return false;
    
    const avgSalary = stats.avg_gross_pay || 0;
    if (filters.avgSalaryMin !== undefined && avgSalary < filters.avgSalaryMin) return false;
    if (filters.avgSalaryMax !== undefined && avgSalary > filters.avgSalaryMax) return false;
  }

  return true;
}

/**
 * 获取部门搜索建议
 */
export function getDepartmentSuggestions(
  departments: DepartmentNode[],
  searchTerm: string,
  limit = 10
): DepartmentNode[] {
  if (!searchTerm) return [];

  const searchLower = searchTerm.toLowerCase();
  const suggestions: Array<{ dept: DepartmentNode; score: number }> = [];

  departments.forEach(dept => {
    let score = 0;
    const nameLower = dept.name.toLowerCase();
    const pathLower = dept.full_path?.toLowerCase() || '';

    // 名称完全匹配
    if (nameLower === searchLower) score += 100;
    // 名称开头匹配
    else if (nameLower.startsWith(searchLower)) score += 80;
    // 名称包含匹配
    else if (nameLower.includes(searchLower)) score += 50;
    
    // 路径匹配
    if (pathLower.includes(searchLower)) score += 30;
    
    // 考虑部门规模（大部门权重更高）
    score += Math.min(dept.employee_count || 0, 20);

    if (score > 0) {
      suggestions.push({ dept, score });
    }
  });

  // 按分数排序并返回前N个
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.dept);
}

/**
 * 高亮部门路径中的匹配部分
 */
export function highlightDepartmentPath(
  path: string,
  searchTerm: string,
  separator = ' / '
): Array<{ text: string; isHighlight: boolean }> {
  if (!searchTerm) {
    return [{ text: path, isHighlight: false }];
  }

  const parts = path.split(separator);
  const searchLower = searchTerm.toLowerCase();
  const result: Array<{ text: string; isHighlight: boolean }> = [];

  parts.forEach((part, index) => {
    if (index > 0) {
      result.push({ text: separator, isHighlight: false });
    }

    if (part.toLowerCase().includes(searchLower)) {
      // 分割匹配部分
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      const subParts = part.split(regex);
      
      subParts.forEach((subPart, subIndex) => {
        if (subPart) {
          result.push({
            text: subPart,
            isHighlight: subIndex % 2 === 1
          });
        }
      });
    } else {
      result.push({ text: part, isHighlight: false });
    }
  });

  return result;
}