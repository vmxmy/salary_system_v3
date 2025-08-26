import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useErrorHandler } from '@/hooks/core/useErrorHandler';
import { payrollQueryKeys } from './usePayroll';

export interface PayrollStatistics {
  totalGrossPay: number;
  totalDeductions: number;  // 扣发合计总额（不包含其他扣除）
  totalNetPay: number;
  totalTax: number;
  totalInsurance: number;
  averageGrossPay: number;
  averageNetPay: number;
  employeeCount: number;
  statusCount: {
    draft: number;
    calculating: number;
    calculated: number;
    approved: number;
    paid: number;
    cancelled: number;
    total: number;
  };
  // 按人员类型分组统计
  byEmployeeType: {
    regular: {  // 正编人员
      employeeCount: number;
      totalGrossPay: number;
      totalDeductions: number;
      totalNetPay: number;
      categories: string[];  // 包含的具体类别
    };
    contracted: {  // 聘用人员
      employeeCount: number;
      totalGrossPay: number;
      totalDeductions: number;
      totalNetPay: number;
      categories: string[];  // 包含的具体类别
    };
  };
}

// 根据根分类名称判断员工类型（现在直接从数据库获取）
function getEmployeeType(rootCategoryName: string | null): 'regular' | 'contracted' | 'unknown' {
  if (!rootCategoryName) return 'unknown';
  
  if (rootCategoryName === '正编') {
    return 'regular';
  }
  if (rootCategoryName === '聘用') {
    return 'contracted';
  }
  
  // 添加调试日志
  console.log(`Unknown root category: "${rootCategoryName}"`);
  return 'unknown';
}

export function usePayrollStatistics(yearMonth: string) {
  const { handleError } = useErrorHandler();
  
  return useQuery({
    queryKey: [...payrollQueryKeys.statistics(), yearMonth],
    queryFn: async () => {
      if (!yearMonth) {
        return null;
      }

      // 解析年月
      const [year, month] = yearMonth.split('-');
      const periodCode = `${year}-${month}`;
      
      // 直接从 view_payroll_summary 获取该月的薪资数据
      const { data: payrollData, error } = await supabase
        .from('view_payroll_summary')
        .select('*')
        .eq('period_code', periodCode);
      
      if (error) {
        handleError(error, { customMessage: '获取薪资统计失败' });
        throw error;
      }
      
      const data = payrollData || [];
      
      // 计算统计数据
      const statistics: PayrollStatistics = {
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalTax: 0,
        totalInsurance: 0,
        averageGrossPay: 0,
        averageNetPay: 0,
        employeeCount: data.length,
        statusCount: {
          draft: 0,
          calculating: 0,
          calculated: 0,
          approved: 0,
          paid: 0,
          cancelled: 0,
          total: data.length
        },
        byEmployeeType: {
          regular: {
            employeeCount: 0,
            totalGrossPay: 0,
            totalDeductions: 0,
            totalNetPay: 0,
            categories: []
          },
          contracted: {
            employeeCount: 0,
            totalGrossPay: 0,
            totalDeductions: 0,
            totalNetPay: 0,
            categories: []
          }
        }
      };

      // 用于收集已出现的人员类别
      const regularCategories = new Set<string>();
      const contractedCategories = new Set<string>();

      console.log(`Processing ${data.length} payroll records for ${periodCode}`);

      // 累计计算
      data.forEach((payroll: any) => {
        const grossPay = payroll.gross_pay || 0;
        const deductions = payroll.total_deductions || 0;
        const netPay = payroll.net_pay || 0;
        const categoryName = payroll.category_name;
        const rootCategoryName = payroll.root_category_name; // 使用新的根分类字段
        
        // 总体统计
        statistics.totalGrossPay += grossPay;
        statistics.totalDeductions += deductions;
        statistics.totalNetPay += netPay;
        
        // 按人员类型分组统计 - 使用根分类而不是具体分类
        const employeeType = getEmployeeType(rootCategoryName);
        
        if (employeeType === 'regular') {
          statistics.byEmployeeType.regular.employeeCount++;
          statistics.byEmployeeType.regular.totalGrossPay += grossPay;
          statistics.byEmployeeType.regular.totalDeductions += deductions;
          statistics.byEmployeeType.regular.totalNetPay += netPay;
          if (categoryName) regularCategories.add(categoryName);
        } else if (employeeType === 'contracted') {
          statistics.byEmployeeType.contracted.employeeCount++;
          statistics.byEmployeeType.contracted.totalGrossPay += grossPay;
          statistics.byEmployeeType.contracted.totalDeductions += deductions;
          statistics.byEmployeeType.contracted.totalNetPay += netPay;
          if (categoryName) contractedCategories.add(categoryName);
        }
        
        // 统计状态数量 - 使用 payroll_status 字段
        const status = payroll.payroll_status;
        if (status && status in statistics.statusCount) {
          statistics.statusCount[status as keyof typeof statistics.statusCount]++;
        }
      });

      console.log('Classification results:', {
        regular: {
          count: statistics.byEmployeeType.regular.employeeCount,
          categories: Array.from(regularCategories)
        },
        contracted: {
          count: statistics.byEmployeeType.contracted.employeeCount,
          categories: Array.from(contractedCategories)
        },
        totalProcessed: data.length
      });

      // 设置实际包含的人员类别
      statistics.byEmployeeType.regular.categories = Array.from(regularCategories);
      statistics.byEmployeeType.contracted.categories = Array.from(contractedCategories);

      // 计算平均值
      if (statistics.employeeCount > 0) {
        statistics.averageGrossPay = statistics.totalGrossPay / statistics.employeeCount;
        statistics.averageNetPay = statistics.totalNetPay / statistics.employeeCount;
      }

      // TODO: 从明细中获取税和保险的具体金额
      // 注意：totalDeductions 现在是扣发合计（个人保险+个税，不含其他扣除）
      // 暂时使用估算值
      statistics.totalTax = statistics.totalDeductions * 0.3; // 假设30%是个税
      statistics.totalInsurance = statistics.totalDeductions * 0.7; // 假设70%是保险

      return statistics;
    },
    enabled: !!yearMonth,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
}