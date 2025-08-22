import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { 
  EmployeeStatistics, 
  StatisticsQueryParams,
  EmployeeTrends,
  DepartmentStatistics 
} from '@/types/statistics';
import { EDUCATION_LEVEL_MAP, CATEGORY_MAP } from '@/types/statistics';

// 计算年龄
const calculateAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// 获取年龄分组
const getAgeGroup = (birthDate?: string): keyof EmployeeStatistics['byAgeGroup'] => {
  if (!birthDate) return 'unknown';
  
  const age = calculateAge(birthDate);
  
  if (age < 25) return 'under25';
  if (age <= 35) return 'age25to35';
  if (age <= 45) return 'age36to45';
  if (age <= 55) return 'age46to55';
  return 'above55';
};

// 获取学历分组
const getEducationGroup = (degree?: string): keyof EmployeeStatistics['byEducation'] => {
  if (!degree) return 'unknown';
  
  // 遍历映射找到匹配的学历
  for (const [key, value] of Object.entries(EDUCATION_LEVEL_MAP)) {
    if (degree.includes(key)) {
      return value;
    }
  }
  
  return 'unknown';
};

// 获取综合员工统计信息
export const useEmployeeStatistics = (params?: StatisticsQueryParams) => {
  return useQuery({
    queryKey: ['employee-statistics', params],
    queryFn: async (): Promise<EmployeeStatistics> => {
      // 直接从视图获取所有需要的信息
      let query = supabase
        .from('view_employee_basic_info')
        .select('*');
        
      // 应用过滤条件
      if (params?.employmentStatus) {
        query = query.eq('employment_status', params.employmentStatus);
      }
      
      if (params?.departmentId) {
        query = query.eq('department_id', params.departmentId);
      }
      
      if (params?.dateRange) {
        query = query
          .gte('hire_date', params.dateRange.start)
          .lte('hire_date', params.dateRange.end);
      }
      
      const { data: employees, error: employeesError } = await query;
      
      if (employeesError) throw employeesError;
      
      // 获取员工ID列表
      const employeeIds = employees?.map(e => e.employee_id) || [];
      
      // 3. 获取员工教育信息
      const { data: educations, error: educationError } = await supabase
        .from('employee_education')
        .select('employee_id, degree')
        .in('employee_id', employeeIds.filter(id => id !== null) as string[]);
        
      if (educationError) throw educationError;
      
      // 创建数据映射
      const educationMap = new Map(educations?.map(e => [e.employee_id, e.degree]) || []);
      
      // 初始化统计对象
      const statistics: EmployeeStatistics = {
        total: employees?.length || 0,
        byCategory: { regular: 0, contract: 0, other: 0 },
        byGender: { male: 0, female: 0, other: 0, unknown: 0 },
        byEducation: { 
          doctorate: 0, 
          master: 0, 
          bachelor: 0, 
          associate: 0, 
          highSchool: 0, 
          unknown: 0 
        },
        byDepartment: [],
        byStatus: { active: 0, inactive: 0, terminated: 0 },
        byAgeGroup: {
          under25: 0,
          age25to35: 0,
          age36to45: 0,
          age46to55: 0,
          above55: 0,
          unknown: 0
        },
        salary: {
          total: 0,
          average: 0,
          median: 0,
          min: 0,
          max: 0
        }
      };
      
      // 部门统计映射
      const departmentMap = new Map<string, { name: string; count: number }>();
      
      // 遍历员工进行统计
      employees?.forEach(employee => {
        const education = employee.employee_id ? educationMap.get(employee.employee_id) : null;
        
        // 按类别统计
        if (employee.category_name) {
          const categoryKey = CATEGORY_MAP[employee.category_name] || 'other';
          statistics.byCategory[categoryKey]++;
        } else {
          statistics.byCategory.other++;
        }
        
        // 按性别统计
        if (employee.gender === '男' || employee.gender === 'male') {
          statistics.byGender.male++;
        } else if (employee.gender === '女' || employee.gender === 'female') {
          statistics.byGender.female++;
        } else if (employee.gender === 'other') {
          statistics.byGender.other++;
        } else {
          statistics.byGender.unknown++;
        }
        
        // 按学历统计
        const educationGroup = getEducationGroup(education || undefined);
        statistics.byEducation[educationGroup]++;
        
        // 按部门统计
        if (employee.department_name) {
          const current = departmentMap.get(employee.department_name) || { 
            name: employee.department_name, 
            count: 0 
          };
          current.count++;
          departmentMap.set(employee.department_name, current);
        }
        
        // 按状态统计
        if (employee.employment_status) {
          const status = employee.employment_status as keyof typeof statistics.byStatus;
          if (status in statistics.byStatus) {
            statistics.byStatus[status]++;
          }
        }
        
        // 按年龄段统计
        const ageGroup = getAgeGroup(employee.date_of_birth || undefined);
        statistics.byAgeGroup[ageGroup]++;
      });
      
      // 转换部门统计数据
      statistics.byDepartment = Array.from(departmentMap.entries()).map(([name, data]) => ({
        departmentId: name, // 使用部门名称作为ID（因为数据中没有部门ID）
        departmentName: data.name,
        count: data.count
      })).sort((a, b) => b.count - a.count);
      
      // 薪资统计暂时设置为0，因为薪资数据结构不同
      statistics.salary = {
        total: 0,
        average: 0,
        median: 0,
        min: 0,
        max: 0
      };
      
      return statistics;
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
};

// 获取员工趋势数据
export const useEmployeeTrends = (months: number = 12) => {
  return useQuery({
    queryKey: ['employee-trends', months],
    queryFn: async (): Promise<EmployeeTrends> => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      
      // 1. 获取当前所有活跃员工数量作为基准
      const { data: currentEmployees, error: currentError } = await supabase
        .from('view_employee_basic_info')
        .select('employee_id')
        .eq('employment_status', 'active');
        
      if (currentError) throw currentError;
      const currentTotal = currentEmployees?.length || 0;
      
      // 2. 获取历史招聘和离职数据
      const { data: employees, error } = await supabase
        .from('employees')
        .select('hire_date, termination_date')
        .or(`hire_date.gte.${startDate.toISOString()},termination_date.gte.${startDate.toISOString()},termination_date.is.null`);
        
      if (error) throw error;
      
      // 按月统计招聘和离职
      const monthlyData = new Map<string, { hires: number; terminations: number }>();
      
      // 初始化月份数据
      for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = date.toISOString().substring(0, 7); // YYYY-MM
        monthlyData.set(key, { hires: 0, terminations: 0 });
      }
      
      // 统计招聘和离职数据
      employees?.forEach(employee => {
        if (employee.hire_date) {
          const month = employee.hire_date.substring(0, 7);
          const data = monthlyData.get(month);
          if (data) data.hires++;
        }
        
        if (employee.termination_date) {
          const month = employee.termination_date.substring(0, 7);
          const data = monthlyData.get(month);
          if (data) data.terminations++;
        }
      });
      
      // 转换为趋势数据
      const trends: EmployeeTrends = {
        headcount: [],
        hires: [],
        terminations: [],
        turnoverRate: []
      };
      
      // 从当前员工数量开始，倒推历史数据
      const sortedMonths = Array.from(monthlyData.entries())
        .sort((a, b) => b[0].localeCompare(a[0])); // 降序排列，从最新开始
      
      let runningTotal = currentTotal;
      
      // 倒序处理，计算每个月的员工数量
      sortedMonths.forEach(([month, data], index) => {
        if (index === 0) {
          // 当前月份，使用实际当前员工数
          trends.headcount.unshift({
            date: month,
            value: runningTotal
          });
        } else {
          // 历史月份，通过当前数据倒推
          runningTotal = runningTotal - data.hires + data.terminations;
          trends.headcount.unshift({
            date: month,
            value: Math.max(0, runningTotal) // 确保不为负数
          });
        }
        
        trends.hires.unshift({
          date: month,
          value: data.hires
        });
        
        trends.terminations.unshift({
          date: month,
          value: data.terminations
        });
        
        // 计算流动率 (离职人数 / 当月员工总数)
        const monthlyTotal = trends.headcount[0].value; // 获取当月员工数
        const turnoverRate = monthlyTotal > 0 
          ? (data.terminations / monthlyTotal) * 100 
          : 0;
          
        trends.turnoverRate.unshift({
          date: month,
          value: Number(turnoverRate.toFixed(2))
        });
      });
      
      return trends;
    },
    staleTime: 30 * 60 * 1000, // 30分钟缓存
  });
};

// 内部服务函数：获取员工统计数据（不是Hook）
const fetchEmployeeStatistics = async (params: StatisticsQueryParams = {}): Promise<EmployeeStatistics> => {
  const { data: employees, error } = await supabase
    .from('v_employees_with_details' as any)
    .select('*')
    .eq('is_active', true);

  if (error) {
    throw new Error(`获取员工数据失败: ${error.message}`);
  }

  const filteredEmployees = employees?.filter((employee: any) => {
    if (params.departmentId && employee.department_id !== params.departmentId) return false;
    return true;
  }) || [];

  const statistics: EmployeeStatistics = {
    total: filteredEmployees.length,
    byStatus: { active: 0, inactive: 0, terminated: 0 },
    byGender: { male: 0, female: 0, other: 0, unknown: 0 },
    byEducation: {
      doctorate: 0,
      master: 0, 
      bachelor: 0,
      associate: 0,
      highSchool: 0,
      unknown: 0
    },
    byAgeGroup: {
      under25: 0,
      age25to35: 0,
      age36to45: 0,
      age46to55: 0,
      above55: 0,
      unknown: 0
    },
    byDepartment: [],
    byCategory: {
      regular: 0,
      contract: 0,
      other: 0
    },
    salary: {
      total: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0
    }
  };

  const departmentMap = new Map<string, { name: string; count: number }>();
  const positionMap = new Map<string, { name: string; count: number }>();
  const categoryMap = new Map<string, { name: string; count: number }>();

  filteredEmployees.forEach((employee: any) => {
    // 按部门统计
    if (employee.department_name) {
      const current = departmentMap.get(employee.department_name) || { 
        name: employee.department_name, 
        count: 0 
      };
      current.count++;
      departmentMap.set(employee.department_name, current);
    }
    
    // 按状态统计
    if (employee.employment_status) {
      const status = employee.employment_status as keyof typeof statistics.byStatus;
      if (status in statistics.byStatus) {
        statistics.byStatus[status]++;
      }
    }
    
    // 按年龄段统计
    const ageGroup = getAgeGroup(employee.date_of_birth);
    statistics.byAgeGroup[ageGroup]++;
  });
  
  // 转换部门统计数据
  statistics.byDepartment = Array.from(departmentMap.entries()).map(([name, data]) => ({
    departmentId: name,
    departmentName: name,
    count: data.count
  }));

  return statistics;
};

// 获取部门统计信息
export const useEmployeeStatisticsByDepartment = (departmentId: string) => {
  return useQuery({
    queryKey: ['department-statistics', departmentId],
    queryFn: async (): Promise<DepartmentStatistics> => {
      const params: StatisticsQueryParams = { departmentId };
      const stats = await fetchEmployeeStatistics(params);
      
      return {
        departmentId,
        departmentName: stats.byDepartment.find(d => d.departmentId === departmentId)?.departmentName || '',
        statistics: ((): Omit<EmployeeStatistics, 'byDepartment'> => {
          const { byDepartment, ...rest } = stats;
          return rest;
        })()
      };
    },
    enabled: !!departmentId,
    staleTime: 5 * 60 * 1000,
  });
};