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
        .in('employee_id', employeeIds);
        
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
        const education = educationMap.get(employee.employee_id);
        
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
        const educationGroup = getEducationGroup(education);
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
          statistics.byStatus[employee.employment_status]++;
        }
        
        // 按年龄段统计
        const ageGroup = getAgeGroup(employee.date_of_birth);
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
      
      // 获取指定期间的员工数据
      const { data: employees, error } = await supabase
        .from('employees')
        .select('hire_date, termination_date')
        .or(`hire_date.gte.${startDate.toISOString()},termination_date.gte.${startDate.toISOString()}`);
        
      if (error) throw error;
      
      // 按月统计
      const monthlyData = new Map<string, { hires: number; terminations: number; total: number }>();
      
      // 初始化月份数据
      for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = date.toISOString().substring(0, 7); // YYYY-MM
        monthlyData.set(key, { hires: 0, terminations: 0, total: 0 });
      }
      
      // 统计数据
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
      
      let cumulativeTotal = 0;
      Array.from(monthlyData.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([month, data]) => {
          cumulativeTotal = cumulativeTotal + data.hires - data.terminations;
          
          trends.headcount.push({
            date: month,
            value: cumulativeTotal
          });
          
          trends.hires.push({
            date: month,
            value: data.hires
          });
          
          trends.terminations.push({
            date: month,
            value: data.terminations
          });
          
          // 计算流动率
          const turnoverRate = cumulativeTotal > 0 
            ? (data.terminations / cumulativeTotal) * 100 
            : 0;
            
          trends.turnoverRate.push({
            date: month,
            value: Number(turnoverRate.toFixed(2))
          });
        });
      
      return trends;
    },
    staleTime: 30 * 60 * 1000, // 30分钟缓存
  });
};

// 获取部门统计信息
export const useEmployeeStatisticsByDepartment = (departmentId: string) => {
  return useQuery({
    queryKey: ['department-statistics', departmentId],
    queryFn: async (): Promise<DepartmentStatistics> => {
      // 使用通用统计函数，但添加部门过滤
      const params: StatisticsQueryParams = { departmentId };
      const stats = await useEmployeeStatistics(params);
      
      return {
        departmentId,
        departmentName: stats.queryData?.byDepartment.find(d => d.departmentId === departmentId)?.departmentName || '',
        statistics: {
          ...stats.queryData!,
          byDepartment: [] // 部门统计中不需要再包含部门分组
        }
      };
    },
    enabled: !!departmentId,
    staleTime: 5 * 60 * 1000,
  });
};