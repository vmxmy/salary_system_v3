import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  terminatedEmployees: number;
  newEmployeesThisMonth: number;
  totalDepartments: number;
  newDepartmentsThisMonth: number;
  totalPositions: number;
  lastPayrollTotal: number;
  lastPayrollDate: string | null;
  lastPayrollEmployeeCount: number;
  nextPayrollDate: string;
  daysUntilNextPayroll: number;
}

export interface RecentActivity {
  activityType: 'new_employee' | 'payroll_completed' | 'department_created';
  entityName: string;
  activityDate: string;
  additionalInfo: string | null;
}

export interface MonthlyPayrollTrend {
  month: string;
  employeeCount: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  avgNetPay: number;
}

class DashboardService {
  async getDashboardStats(): Promise<DashboardStats> {
    const { data, error } = await supabase
      .from('v_dashboard_stats')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }

    return {
      totalEmployees: data?.total_employees || 0,
      activeEmployees: data?.active_employees || 0,
      terminatedEmployees: data?.terminated_employees || 0,
      newEmployeesThisMonth: data?.new_employees_this_month || 0,
      totalDepartments: data?.total_departments || 0,
      newDepartmentsThisMonth: data?.new_departments_this_month || 0,
      totalPositions: data?.total_positions || 0,
      lastPayrollTotal: data?.last_payroll_total || 0,
      lastPayrollDate: data?.last_payroll_date,
      lastPayrollEmployeeCount: data?.last_payroll_employee_count || 0,
      nextPayrollDate: data?.next_payroll_date,
      daysUntilNextPayroll: data?.days_until_next_payroll || 0,
    };
  }

  async getRecentActivities(): Promise<RecentActivity[]> {
    const { data, error } = await supabase
      .from('v_recent_activities')
      .select('*')
      .order('activity_date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }

    return (data || []).map(activity => ({
      activityType: activity.activity_type,
      entityName: activity.entity_name,
      activityDate: activity.activity_date,
      additionalInfo: activity.additional_info,
    }));
  }

  async getMonthlyPayrollTrend(): Promise<MonthlyPayrollTrend[]> {
    const { data, error } = await supabase
      .from('v_monthly_payroll_trend')
      .select('*')
      .order('month', { ascending: false })
      .limit(12);

    if (error) {
      console.error('Error fetching monthly payroll trend:', error);
      throw error;
    }

    return (data || []).map(trend => ({
      month: trend.month,
      employeeCount: trend.employee_count,
      totalGrossPay: trend.total_gross_pay,
      totalDeductions: trend.total_deductions,
      totalNetPay: trend.total_net_pay,
      avgNetPay: trend.avg_net_pay,
    }));
  }
}

export const dashboardService = new DashboardService();