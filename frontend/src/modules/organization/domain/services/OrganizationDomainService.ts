/**
 * Organization 领域服务
 * 
 * 提供复杂的组织架构相关业务逻辑，处理部门和职位的关系管理
 */

import { Injectable, ServiceLifetime } from '../../../../core/di/DIContainer';
import { DomainError } from '../../../../shared/domain/errors/DomainError';
import { Department, DepartmentStatus, DepartmentType } from '../entities/Department';
import { Position, PositionStatus, WorkLocation } from '../entities/Position';
import { EmployeeEnhanced } from '../../../payroll-import/domain/entities/EmployeeEnhanced';

/**
 * 组织架构信息
 */
export interface OrganizationStructure {
  /** 部门层级结构 */
  departmentHierarchy: DepartmentNode[];
  /** 职位分布 */
  positionDistribution: PositionDistribution[];
  /** 员工分布统计 */
  employeeDistribution: EmployeeDistribution;
  /** 组织健康度指标 */
  healthMetrics: OrganizationHealthMetrics;
}

/**
 * 部门节点（用于构建树形结构）
 */
export interface DepartmentNode {
  /** 部门信息 */
  department: Department;
  /** 子部门 */
  children: DepartmentNode[];
  /** 部门职位数量 */
  positionCount: number;
  /** 部门员工数量 */
  employeeCount: number;
  /** 层级深度 */
  level: number;
}

/**
 * 职位分布信息
 */
export interface PositionDistribution {
  /** 部门ID */
  departmentId: string;
  /** 部门名称 */
  departmentName: string;
  /** 职位列表 */
  positions: Array<{
    position: Position;
    employeeCount: number;
    vacancyCount: number;
    utilizationRate: number;
  }>;
  /** 部门职位总数 */
  totalPositions: number;
  /** 部门员工总数 */
  totalEmployees: number;
}

/**
 * 员工分布统计
 */
export interface EmployeeDistribution {
  /** 按部门统计 */
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    percentage: number;
  }>;
  /** 按职位级别统计 */
  byLevel: Array<{
    level: string;
    employeeCount: number;
    percentage: number;
  }>;
  /** 按工作地点统计 */
  byLocation: Array<{
    location: WorkLocation;
    employeeCount: number;
    percentage: number;
  }>;
  /** 总员工数 */
  totalEmployees: number;
}

/**
 * 组织健康度指标
 */
export interface OrganizationHealthMetrics {
  /** 管理跨度（平均下属数量） */
  managementSpan: number;
  /** 组织层级深度 */
  hierarchyDepth: number;
  /** 职位空置率 */
  vacancyRate: number;
  /** 部门活跃率 */
  departmentActiveRate: number;
  /** 职位活跃率 */
  positionActiveRate: number;
  /** 管理者覆盖率 */
  managerCoverageRate: number;
  /** 组织平衡度评分 */
  balanceScore: number;
}

/**
 * 部门重组方案
 */
export interface DepartmentReorganization {
  /** 重组类型 */
  type: 'merge' | 'split' | 'restructure' | 'dissolve';
  /** 源部门 */
  sourceDepartments: Department[];
  /** 目标部门配置 */
  targetDepartments: Array<{
    name: string;
    type: DepartmentType;
    parentId?: string;
    description?: string;
  }>;
  /** 员工转移计划 */
  employeeTransferPlan: Array<{
    employeeId: string;
    fromDepartmentId: string;
    toDepartmentId: string;
    newPositionId?: string;
    effectiveDate: Date;
  }>;
  /** 职位调整计划 */
  positionAdjustmentPlan: Array<{
    positionId: string;
    fromDepartmentId: string;
    toDepartmentId: string;
    adjustments?: Partial<Position>;
  }>;
  /** 重组原因 */
  reason: string;
  /** 预期效果 */
  expectedOutcomes: string[];
  /** 风险评估 */
  risks: Array<{
    risk: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
}

/**
 * 职位设计建议
 */
export interface PositionDesignSuggestion {
  /** 建议类型 */
  type: 'create' | 'modify' | 'combine' | 'eliminate';
  /** 目标职位 */
  targetPosition?: Position;
  /** 建议的职位配置 */
  suggestedPosition: {
    name: string;
    level: string;
    departmentId: string;
    salaryRange: { min: number; max: number };
    headcount: number;
    requirements: string[];
    responsibilities: string[];
  };
  /** 建议原因 */
  reason: string;
  /** 影响分析 */
  impact: {
    affectedEmployees: number;
    budgetImpact: number;
    workloadRedistribution: string;
  };
  /** 实施优先级 */
  priority: 'high' | 'medium' | 'low';
}

/**
 * Organization 领域服务
 */
@Injectable(ServiceLifetime.Singleton)
export class OrganizationDomainService {
  constructor() {}

  /**
   * 构建组织架构
   */
  buildOrganizationStructure(
    departments: Department[],
    positions: Position[],
    employees: EmployeeEnhanced[]
  ): OrganizationStructure {
    
    // 构建部门层级结构
    const departmentHierarchy = this.buildDepartmentHierarchy(departments, positions, employees);
    
    // 计算职位分布
    const positionDistribution = this.calculatePositionDistribution(departments, positions, employees);
    
    // 计算员工分布
    const employeeDistribution = this.calculateEmployeeDistribution(departments, positions, employees);
    
    // 计算组织健康度指标
    const healthMetrics = this.calculateOrganizationHealth(
      departmentHierarchy,
      positionDistribution,
      employeeDistribution
    );

    return {
      departmentHierarchy,
      positionDistribution,
      employeeDistribution,
      healthMetrics
    };
  }

  /**
   * 验证部门层级关系
   */
  validateDepartmentHierarchy(departments: Department[]): {
    isValid: boolean;
    issues: Array<{
      type: 'circular_reference' | 'orphaned_department' | 'invalid_parent' | 'duplicate_name';
      departmentId: string;
      message: string;
    }>;
    suggestions: string[];
  } {
    
    const issues: Array<{
      type: 'circular_reference' | 'orphaned_department' | 'invalid_parent' | 'duplicate_name';
      departmentId: string;
      message: string;
    }> = [];
    const suggestions: string[] = [];

    // 检查循环引用
    for (const dept of departments) {
      if (this.hasCircularReference(dept, departments)) {
        issues.push({
          type: 'circular_reference',
          departmentId: dept.id!,
          message: `部门 ${dept.name} 存在循环引用`
        });
      }
    }

    // 检查孤儿部门（除根部门外没有父部门的部门）
    const rootDepartments = departments.filter(d => !d.parentId);
    if (rootDepartments.length > 1) {
      rootDepartments.slice(1).forEach(dept => {
        issues.push({
          type: 'orphaned_department',
          departmentId: dept.id!,
          message: `部门 ${dept.name} 可能是孤儿部门`
        });
      });
      suggestions.push('建议设置统一的根部门或明确部门层级关系');
    }

    // 检查无效的父部门引用
    for (const dept of departments) {
      if (dept.parentId && !departments.find(d => d.id === dept.parentId)) {
        issues.push({
          type: 'invalid_parent',
          departmentId: dept.id!,
          message: `部门 ${dept.name} 的父部门不存在`
        });
      }
    }

    // 检查重复部门名称
    const nameGroups = departments.reduce((groups, dept) => {
      const key = dept.name.toLowerCase();
      groups[key] = groups[key] || [];
      groups[key].push(dept);
      return groups;
    }, {} as Record<string, Department[]>);

    Object.values(nameGroups).forEach(group => {
      if (group.length > 1) {
        group.forEach(dept => {
          issues.push({
            type: 'duplicate_name',
            departmentId: dept.id!,
            message: `部门名称 ${dept.name} 重复`
          });
        });
      }
    });

    if (issues.length > 0) {
      suggestions.push('建议修复层级关系问题后重新验证');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * 分析职位冗余和缺失
   */
  analyzePositionGaps(
    departments: Department[],
    positions: Position[],
    employees: EmployeeEnhanced[]
  ): {
    redundantPositions: Array<{
      position: Position;
      reason: string;
      suggestion: string;
    }>;
    missingPositions: Array<{
      departmentId: string;
      departmentName: string;
      suggestedPosition: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    overallocatedPositions: Array<{
      position: Position;
      currentCount: number;
      recommendedCount: number;
      excessCount: number;
    }>;
    underallocatedPositions: Array<{
      position: Position;
      currentCount: number;
      recommendedCount: number;
      shortageCount: number;
    }>;
  } {
    
    const redundantPositions: Array<{
      position: Position;
      reason: string;
      suggestion: string;
    }> = [];

    const missingPositions: Array<{
      departmentId: string;
      departmentName: string;
      suggestedPosition: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    const overallocatedPositions: Array<{
      position: Position;
      currentCount: number;
      recommendedCount: number;
      excessCount: number;
    }> = [];

    const underallocatedPositions: Array<{
      position: Position;
      currentCount: number;
      recommendedCount: number;
      shortageCount: number;
    }> = [];

    // 分析每个职位的利用率
    for (const position of positions) {
      const employeeCount = employees.filter(emp => 
        emp.positionId === position.id && emp.isActive
      ).length;

      // 检查冗余职位（长期无人担任）
      if (employeeCount === 0 && position.isActive) {
        redundantPositions.push({
          position,
          reason: '职位长期空置',
          suggestion: '考虑合并到其他职位或暂停招聘'
        });
      }

      // 检查超配职位
      if (employeeCount > position.headcount) {
        overallocatedPositions.push({
          position,
          currentCount: employeeCount,
          recommendedCount: position.headcount,
          excessCount: employeeCount - position.headcount
        });
      }

      // 检查欠配职位
      if (employeeCount < position.headcount && position.openings > 0) {
        underallocatedPositions.push({
          position,
          currentCount: employeeCount,
          recommendedCount: position.headcount,
          shortageCount: position.headcount - employeeCount
        });
      }
    }

    // 分析部门缺失职位
    for (const department of departments) {
      const deptPositions = positions.filter(pos => pos.departmentId === department.id);
      const deptEmployees = employees.filter(emp => 
        emp.departmentId === department.id && emp.isActive
      );

      // 检查是否缺少管理职位
      const hasManager = deptPositions.some(pos => 
        pos.level === 'manager' || pos.level === 'senior' || pos.name.includes('主管') || pos.name.includes('经理')
      );

      if (!hasManager && deptEmployees.length > 5) {
        missingPositions.push({
          departmentId: department.id!,
          departmentName: department.name,
          suggestedPosition: `${department.name}主管`,
          reason: '部门员工超过5人但缺少管理职位',
          priority: 'high'
        });
      }

      // 检查是否缺少专业职位
      if (department.type === DepartmentType.CORE_BUSINESS && deptPositions.length < 3) {
        missingPositions.push({
          departmentId: department.id!,
          departmentName: department.name,
          suggestedPosition: `${department.name}专员`,
          reason: '核心业务部门职位类型偏少',
          priority: 'medium'
        });
      }
    }

    return {
      redundantPositions,
      missingPositions,
      overallocatedPositions,
      underallocatedPositions
    };
  }

  /**
   * 生成部门重组建议
   */
  generateReorganizationSuggestion(
    departments: Department[],
    positions: Position[],
    employees: EmployeeEnhanced[],
    criteria: {
      maxDepartmentSize?: number;
      minDepartmentSize?: number;
      maxHierarchyDepth?: number;
      consolidateSimilarFunctions?: boolean;
    }
  ): DepartmentReorganization[] {
    
    const suggestions: DepartmentReorganization[] = [];

    // 分析部门规模
    const departmentSizes = departments.map(dept => ({
      department: dept,
      employeeCount: employees.filter(emp => emp.departmentId === dept.id).length,
      positionCount: positions.filter(pos => pos.departmentId === dept.id).length
    }));

    // 建议合并小部门
    if (criteria.minDepartmentSize) {
      const smallDepartments = departmentSizes.filter(ds => 
        ds.employeeCount < criteria.minDepartmentSize && 
        ds.department.status === DepartmentStatus.ACTIVE
      );

      if (smallDepartments.length >= 2) {
        suggestions.push({
          type: 'merge',
          sourceDepartments: smallDepartments.map(sd => sd.department),
          targetDepartments: [{
            name: '综合业务部',
            type: DepartmentType.SUPPORT,
            description: '整合小规模部门，提高管理效率'
          }],
          employeeTransferPlan: smallDepartments.flatMap(sd => 
            employees
              .filter(emp => emp.departmentId === sd.department.id)
              .map(emp => ({
                employeeId: emp.id!,
                fromDepartmentId: sd.department.id!,
                toDepartmentId: 'new-integrated-dept',
                effectiveDate: new Date()
              }))
          ),
          positionAdjustmentPlan: [],
          reason: '提高小部门管理效率，减少管理成本',
          expectedOutcomes: ['降低管理成本', '提高协作效率', '简化组织架构'],
          risks: [{
            risk: '员工可能对变动有抵触情绪',
            severity: 'medium',
            mitigation: '提前沟通，说明重组益处'
          }]
        });
      }
    }

    // 建议拆分大部门
    if (criteria.maxDepartmentSize) {
      const largeDepartments = departmentSizes.filter(ds => 
        ds.employeeCount > criteria.maxDepartmentSize
      );

      largeDepartments.forEach(largeDept => {
        const deptEmployees = employees.filter(emp => emp.departmentId === largeDept.department.id);
        const functionGroups = this.groupEmployeesByFunction(deptEmployees, positions);

        if (functionGroups.length > 1) {
          suggestions.push({
            type: 'split',
            sourceDepartments: [largeDept.department],
            targetDepartments: functionGroups.map((group, index) => ({
              name: `${largeDept.department.name}${index + 1}部`,
              type: largeDept.department.type,
              parentId: largeDept.department.parentId,
              description: `${largeDept.department.name}拆分后的子部门`
            })),
            employeeTransferPlan: [],
            positionAdjustmentPlan: [],
            reason: '部门规模过大，拆分以提高管理效率',
            expectedOutcomes: ['提高管理精度', '增强团队凝聚力', '明确职责分工'],
            risks: [{
              risk: '可能影响部门间协作',
              severity: 'medium',
              mitigation: '建立清晰的协作流程和沟通机制'
            }]
          });
        }
      });
    }

    return suggestions;
  }

  /**
   * 优化职位设计
   */
  optimizePositionDesign(
    department: Department,
    positions: Position[],
    employees: EmployeeEnhanced[]
  ): PositionDesignSuggestion[] {
    
    const suggestions: PositionDesignSuggestion[] = [];
    const deptPositions = positions.filter(pos => pos.departmentId === department.id);
    const deptEmployees = employees.filter(emp => emp.departmentId === department.id);

    // 分析职位利用率
    for (const position of deptPositions) {
      const positionEmployees = deptEmployees.filter(emp => emp.positionId === position.id);
      const utilizationRate = position.headcount > 0 ? positionEmployees.length / position.headcount : 0;

      // 建议合并低利用率职位
      if (utilizationRate < 0.5 && positionEmployees.length <= 2) {
        const similarPositions = deptPositions.filter(pos => 
          pos.id !== position.id && 
          pos.level === position.level &&
          pos.requirements.some(req => position.requirements.includes(req))
        );

        if (similarPositions.length > 0) {
          suggestions.push({
            type: 'combine',
            targetPosition: position,
            suggestedPosition: {
              name: `${position.name}/多岗位组合`,
              level: position.level,
              departmentId: department.id!,
              salaryRange: {
                min: Math.min(position.salaryRange.min, ...similarPositions.map(p => p.salaryRange.min)),
                max: Math.max(position.salaryRange.max, ...similarPositions.map(p => p.salaryRange.max))
              },
              headcount: position.headcount + similarPositions.reduce((sum, p) => sum + p.headcount, 0),
              requirements: [...new Set([...position.requirements, ...similarPositions.flatMap(p => p.requirements)])],
              responsibilities: [...new Set([...position.responsibilities, ...similarPositions.flatMap(p => p.responsibilities)])]
            },
            reason: '职位利用率低，可与相似职位合并',
            impact: {
              affectedEmployees: positionEmployees.length,
              budgetImpact: 0,
              workloadRedistribution: '工作内容将整合，提高工作饱和度'
            },
            priority: 'medium'
          });
        }
      }

      // 建议创建新职位
      if (utilizationRate > 1.2) {
        suggestions.push({
          type: 'create',
          suggestedPosition: {
            name: `${position.name}助理`,
            level: 'junior',
            departmentId: department.id!,
            salaryRange: {
              min: position.salaryRange.min * 0.7,
              max: position.salaryRange.max * 0.8
            },
            headcount: Math.ceil(positionEmployees.length * 0.3),
            requirements: position.requirements.slice(0, -1), // 降低要求
            responsibilities: position.responsibilities.filter(r => !r.includes('负责') && !r.includes('主导'))
          },
          reason: '职位超负荷，建议创建辅助职位',
          impact: {
            affectedEmployees: 0,
            budgetImpact: position.salaryRange.min * 0.7 * Math.ceil(positionEmployees.length * 0.3),
            workloadRedistribution: '分担部分工作负荷'
          },
          priority: 'high'
        });
      }
    }

    return suggestions;
  }

  // ==================== 私有方法 ====================

  private buildDepartmentHierarchy(
    departments: Department[],
    positions: Position[],
    employees: EmployeeEnhanced[]
  ): DepartmentNode[] {
    
    const departmentMap = new Map(departments.map(dept => [dept.id!, dept]));
    const rootDepartments = departments.filter(dept => !dept.parentId);

    const buildNode = (department: Department, level: number = 0): DepartmentNode => {
      const children = departments
        .filter(dept => dept.parentId === department.id)
        .map(child => buildNode(child, level + 1));

      const positionCount = positions.filter(pos => pos.departmentId === department.id).length;
      const employeeCount = employees.filter(emp => emp.departmentId === department.id).length;

      return {
        department,
        children,
        positionCount,
        employeeCount,
        level
      };
    };

    return rootDepartments.map(dept => buildNode(dept));
  }

  private calculatePositionDistribution(
    departments: Department[],
    positions: Position[],
    employees: EmployeeEnhanced[]
  ): PositionDistribution[] {
    
    return departments.map(department => {
      const deptPositions = positions.filter(pos => pos.departmentId === department.id);
      const deptEmployees = employees.filter(emp => emp.departmentId === department.id);

      const positionDetails = deptPositions.map(position => {
        const positionEmployees = deptEmployees.filter(emp => emp.positionId === position.id);
        const employeeCount = positionEmployees.length;
        const vacancyCount = Math.max(0, position.headcount - employeeCount);
        const utilizationRate = position.headcount > 0 ? employeeCount / position.headcount : 0;

        return {
          position,
          employeeCount,
          vacancyCount,
          utilizationRate
        };
      });

      return {
        departmentId: department.id!,
        departmentName: department.name,
        positions: positionDetails,
        totalPositions: deptPositions.length,
        totalEmployees: deptEmployees.length
      };
    });
  }

  private calculateEmployeeDistribution(
    departments: Department[],
    positions: Position[],
    employees: EmployeeEnhanced[]
  ): EmployeeDistribution {
    
    const totalEmployees = employees.length;

    // 按部门统计
    const byDepartment = departments.map(dept => {
      const employeeCount = employees.filter(emp => emp.departmentId === dept.id).length;
      return {
        departmentId: dept.id!,
        departmentName: dept.name,
        employeeCount,
        percentage: totalEmployees > 0 ? (employeeCount / totalEmployees) * 100 : 0
      };
    });

    // 按职位级别统计
    const levelGroups = employees.reduce((groups, emp) => {
      const position = positions.find(pos => pos.id === emp.positionId);
      const level = position?.level || 'unknown';
      groups[level] = (groups[level] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);

    const byLevel = Object.entries(levelGroups).map(([level, count]) => ({
      level,
      employeeCount: count,
      percentage: totalEmployees > 0 ? (count / totalEmployees) * 100 : 0
    }));

    // 按工作地点统计
    const locationGroups = employees.reduce((groups, emp) => {
      const position = positions.find(pos => pos.id === emp.positionId);
      const location = position?.workLocation || WorkLocation.OFFICE;
      groups[location] = (groups[location] || 0) + 1;
      return groups;
    }, {} as Record<WorkLocation, number>);

    const byLocation = Object.entries(locationGroups).map(([location, count]) => ({
      location: location as WorkLocation,
      employeeCount: count,
      percentage: totalEmployees > 0 ? (count / totalEmployees) * 100 : 0
    }));

    return {
      byDepartment,
      byLevel,
      byLocation,
      totalEmployees
    };
  }

  private calculateOrganizationHealth(
    hierarchy: DepartmentNode[],
    positionDistribution: PositionDistribution[],
    employeeDistribution: EmployeeDistribution
  ): OrganizationHealthMetrics {
    
    // 计算管理跨度
    const managementSpan = this.calculateAverageSpan(hierarchy);
    
    // 计算层级深度
    const hierarchyDepth = this.calculateMaxDepth(hierarchy);
    
    // 计算空置率
    const totalPositions = positionDistribution.reduce((sum, dist) => sum + dist.totalPositions, 0);
    const totalVacancies = positionDistribution.reduce((sum, dist) => 
      sum + dist.positions.reduce((vacSum, pos) => vacSum + pos.vacancyCount, 0), 0
    );
    const vacancyRate = totalPositions > 0 ? (totalVacancies / totalPositions) * 100 : 0;

    // 计算活跃率
    const activeDepartments = this.countActiveDepartments(hierarchy);
    const totalDepartments = this.countTotalDepartments(hierarchy);
    const departmentActiveRate = totalDepartments > 0 ? (activeDepartments / totalDepartments) * 100 : 0;

    const activePositions = positionDistribution.reduce((sum, dist) => 
      sum + dist.positions.filter(pos => pos.position.isActive).length, 0
    );
    const positionActiveRate = totalPositions > 0 ? (activePositions / totalPositions) * 100 : 0;

    // 计算管理者覆盖率（简化计算）
    const managerCoverageRate = employeeDistribution.byLevel
      .filter(level => level.level.includes('manager') || level.level.includes('主管'))
      .reduce((sum, level) => sum + level.percentage, 0);

    // 计算组织平衡度评分
    const balanceScore = this.calculateBalanceScore(
      managementSpan,
      hierarchyDepth,
      vacancyRate,
      departmentActiveRate
    );

    return {
      managementSpan,
      hierarchyDepth,
      vacancyRate,
      departmentActiveRate,
      positionActiveRate,
      managerCoverageRate,
      balanceScore
    };
  }

  private hasCircularReference(department: Department, allDepartments: Department[]): boolean {
    const visited = new Set<string>();
    let current = department;

    while (current.parentId) {
      if (visited.has(current.id!)) {
        return true; // 发现循环
      }
      visited.add(current.id!);
      
      const parent = allDepartments.find(d => d.id === current.parentId);
      if (!parent) {
        break; // 父部门不存在
      }
      current = parent;
    }

    return false;
  }

  private groupEmployeesByFunction(
    employees: EmployeeEnhanced[],
    positions: Position[]
  ): EmployeeEnhanced[][] {
    
    const functionGroups: EmployeeEnhanced[][] = [];
    const positionMap = new Map(positions.map(pos => [pos.id!, pos]));

    // 简化的功能分组逻辑
    const functions = new Map<string, EmployeeEnhanced[]>();
    
    employees.forEach(employee => {
      const position = positionMap.get(employee.positionId || '');
      const functionKey = position?.level || 'general';
      
      if (!functions.has(functionKey)) {
        functions.set(functionKey, []);
      }
      functions.get(functionKey)!.push(employee);
    });

    return Array.from(functions.values());
  }

  private calculateAverageSpan(nodes: DepartmentNode[]): number {
    let totalSpan = 0;
    let managerCount = 0;

    const calculateSpan = (node: DepartmentNode) => {
      if (node.children.length > 0) {
        totalSpan += node.children.length;
        managerCount++;
      }
      node.children.forEach(child => calculateSpan(child));
    };

    nodes.forEach(node => calculateSpan(node));
    return managerCount > 0 ? totalSpan / managerCount : 0;
  }

  private calculateMaxDepth(nodes: DepartmentNode[]): number {
    if (nodes.length === 0) return 0;
    
    return Math.max(...nodes.map(node => {
      if (node.children.length === 0) return node.level + 1;
      return Math.max(node.level + 1, this.calculateMaxDepth(node.children));
    }));
  }

  private countActiveDepartments(nodes: DepartmentNode[]): number {
    return nodes.reduce((count, node) => {
      const activeCount = node.department.status === DepartmentStatus.ACTIVE ? 1 : 0;
      return count + activeCount + this.countActiveDepartments(node.children);
    }, 0);
  }

  private countTotalDepartments(nodes: DepartmentNode[]): number {
    return nodes.reduce((count, node) => {
      return count + 1 + this.countTotalDepartments(node.children);
    }, 0);
  }

  private calculateBalanceScore(
    managementSpan: number,
    hierarchyDepth: number,
    vacancyRate: number,
    departmentActiveRate: number
  ): number {
    
    // 理想的管理跨度是3-7人
    const spanScore = managementSpan >= 3 && managementSpan <= 7 ? 100 : 
                     Math.max(0, 100 - Math.abs(managementSpan - 5) * 10);
    
    // 理想的层级深度是3-5层
    const depthScore = hierarchyDepth >= 3 && hierarchyDepth <= 5 ? 100 :
                      Math.max(0, 100 - Math.abs(hierarchyDepth - 4) * 15);
    
    // 空置率应该控制在10%以下
    const vacancyScore = Math.max(0, 100 - vacancyRate * 5);
    
    // 部门活跃率应该在90%以上
    const activeScore = departmentActiveRate;

    return (spanScore + depthScore + vacancyScore + activeScore) / 4;
  }
}