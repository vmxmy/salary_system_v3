// 员工统计相关类型定义

// 基础统计信息
export interface EmployeeStatistics {
  // 总体统计
  total: number;
  
  // 按人员类别统计
  byCategory: {
    regular: number;      // 正编人员
    contract: number;     // 聘用人员
    other: number;        // 其他
  };
  
  // 按性别统计
  byGender: {
    male: number;         // 男性
    female: number;       // 女性
    other: number;        // 其他
    unknown: number;      // 未知
  };
  
  // 按学历统计
  byEducation: {
    doctorate: number;    // 博士
    master: number;       // 硕士
    bachelor: number;     // 本科
    associate: number;    // 专科
    highSchool: number;   // 高中及以下
    unknown: number;      // 未知
  };
  
  // 按部门统计
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    count: number;
  }>;
  
  // 按在职状态统计
  byStatus: {
    active: number;       // 在职
    inactive: number;     // 离职
    terminated: number;   // 终止
  };
  
  // 按年龄段统计
  byAgeGroup: {
    under25: number;      // 25岁以下
    age25to35: number;    // 25-35岁
    age36to45: number;    // 36-45岁
    age46to55: number;    // 46-55岁
    above55: number;      // 55岁以上
    unknown: number;      // 未知
  };
  
  // 薪资统计
  salary: {
    total: number;        // 总薪资
    average: number;      // 平均薪资
    median: number;       // 中位数薪资
    min: number;          // 最低薪资
    max: number;          // 最高薪资
  };
}

// 统计查询参数
export interface StatisticsQueryParams {
  // 过滤条件
  departmentId?: string;
  employmentStatus?: 'active' | 'inactive' | 'terminated';
  categoryName?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// 趋势数据点
export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

// 员工增长趋势
export interface EmployeeTrends {
  // 员工数量趋势
  headcount: TrendDataPoint[];
  
  // 入职趋势
  hires: TrendDataPoint[];
  
  // 离职趋势
  terminations: TrendDataPoint[];
  
  // 流动率趋势
  turnoverRate: TrendDataPoint[];
}

// 部门统计详情
export interface DepartmentStatistics {
  departmentId: string;
  departmentName: string;
  statistics: Omit<EmployeeStatistics, 'byDepartment'>;
}

// 学历映射
export const EDUCATION_LEVEL_MAP: Record<string, keyof EmployeeStatistics['byEducation']> = {
  '博士研究生': 'doctorate',
  '博士学位': 'doctorate',
  '博士': 'doctorate',
  '硕士研究生': 'master',
  '硕士学位': 'master',
  '硕士': 'master',
  '研究生': 'master',
  '学士学位': 'bachelor',
  '本科': 'bachelor',
  '大学本科': 'bachelor',
  '大学专科': 'associate',
  '专科': 'associate',
  '大专': 'associate',
  '高中': 'highSchool',
  '中专': 'highSchool',
  '初中': 'highSchool',
  '小学': 'highSchool',
};

// 人员类别映射
export const CATEGORY_MAP: Record<string, keyof EmployeeStatistics['byCategory']> = {
  // 正编人员类别
  '公务员': 'regular',
  '参照公务员管理': 'regular',
  '事业管理人员': 'regular',
  '事业技术工人': 'regular',
  '执业类专技人员': 'regular',
  '管理类专技人员': 'regular',
  '机关工勤': 'regular',
  // 聘用人员类别
  '综合类': 'contract',
  '专项人员': 'contract',
  '项目经理': 'contract',
  '项目服务专员': 'contract',
  // 其他类别
  '临时人员': 'other',
  '劳务派遣': 'other',
};