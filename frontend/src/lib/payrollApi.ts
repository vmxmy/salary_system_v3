import { supabase } from './supabaseClient';
import type { 
  SalaryComponent, 
  Payroll, 
  PayrollItem,
  SalaryComponentWithDetails,
  PayrollWithDetails,
  PayrollItemWithDetails
} from '../types/employee_new';

// 薪资管理数据访问层
export class PayrollAPI {
  
  /**
   * 获取薪资组件列表
   */
  static async getSalaryComponents(): Promise<SalaryComponentWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('salary_components')
        .select('*')
        .order('name');

      if (error) throw error;

      return data as SalaryComponentWithDetails[];

    } catch (error) {
      console.error('获取薪资组件失败:', error);
      throw new Error('获取薪资组件失败');
    }
  }

  /**
   * 获取单个薪资组件
   */
  static async getSalaryComponent(id: string): Promise<SalaryComponentWithDetails> {
    try {
      const { data, error } = await supabase
        .from('salary_components')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('薪资组件不存在');

      return data as SalaryComponentWithDetails;

    } catch (error) {
      console.error('获取薪资组件失败:', error);
      throw new Error('获取薪资组件失败');
    }
  }

  /**
   * 创建薪资组件
   */
  static async createSalaryComponent(componentData: Omit<SalaryComponent, 'id' | 'created_at'>): Promise<SalaryComponent> {
    try {
      const { data, error } = await supabase
        .from('salary_components')
        .insert([componentData])
        .select()
        .single();

      if (error) throw error;

      return data as SalaryComponent;

    } catch (error) {
      console.error('创建薪资组件失败:', error);
      throw new Error('创建薪资组件失败');
    }
  }

  /**
   * 更新薪资组件
   */
  static async updateSalaryComponent(id: string, componentData: Partial<SalaryComponent>): Promise<SalaryComponent> {
    try {
      const { data, error } = await supabase
        .from('salary_components')
        .update(componentData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as SalaryComponent;

    } catch (error) {
      console.error('更新薪资组件失败:', error);
      throw new Error('更新薪资组件失败');
    }
  }

  /**
   * 删除薪资组件
   */
  static async deleteSalaryComponent(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('salary_components')
        .delete()
        .eq('id', id);

      if (error) throw error;

    } catch (error) {
      console.error('删除薪资组件失败:', error);
      throw new Error('删除薪资组件失败');
    }
  }

  /**
   * 获取薪资单列表（带分页和过滤）
   */
  static async getPayrolls(
    page = 0,
    pageSize = 20,
    filters: { 
      employee_id?: string; 
      status?: string; 
      pay_period_start?: string; 
      pay_period_end?: string 
    } = {}
  ): Promise<{ 
    data: PayrollWithDetails[]; 
    total: number; 
    page: number; 
    pageSize: number 
  }> {
    try {
      let query = supabase
        .from('payrolls')
        .select(`
          *,
          employees(full_name),
          departments(name)
        `, { count: 'exact' });

      // 应用过滤条件
      if (filters.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.pay_period_start) {
        query = query.gte('pay_period_start', filters.pay_period_start);
      }

      if (filters.pay_period_end) {
        query = query.lte('pay_period_end', filters.pay_period_end);
      }

      // 分页
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await query
        .range(from, to)
        .order('pay_date', { ascending: false });

      if (error) throw error;

      // 格式化数据
      const formattedData = data.map(payroll => ({
        ...payroll,
        employee_name: (payroll as any).employees?.full_name || '未知员工',
        department_name: (payroll as any).departments?.name || '未知部门',
        items: [] // 薪资项明细需要单独获取
      }));

      return {
        data: formattedData as PayrollWithDetails[],
        total: count || 0,
        page,
        pageSize
      };

    } catch (error) {
      console.error('获取薪资单列表失败:', error);
      throw new Error('获取薪资单列表失败');
    }
  }

  /**
   * 获取单个薪资单详情
   */
  static async getPayroll(id: string): Promise<PayrollWithDetails> {
    try {
      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees(full_name),
          departments(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('薪资单不存在');

      // 获取薪资项明细
      const items = await this.getPayrollItems(id);

      return {
        ...data,
        employee_name: (data as any).employees?.full_name || '未知员工',
        department_name: (data as any).departments?.name || '未知部门',
        items
      } as PayrollWithDetails;

    } catch (error) {
      console.error('获取薪资单详情失败:', error);
      throw new Error('获取薪资单详情失败');
    }
  }

  /**
   * 创建薪资单
   */
  static async createPayroll(payrollData: Omit<Payroll, 'id' | 'created_at' | 'updated_at'>): Promise<Payroll> {
    try {
      const { data, error } = await supabase
        .from('payrolls')
        .insert([payrollData])
        .select()
        .single();

      if (error) throw error;

      return data as Payroll;

    } catch (error) {
      console.error('创建薪资单失败:', error);
      throw new Error('创建薪资单失败');
    }
  }

  /**
   * 更新薪资单
   */
  static async updatePayroll(id: string, payrollData: Partial<Payroll>): Promise<Payroll> {
    try {
      const { data, error } = await supabase
        .from('payrolls')
        .update(payrollData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as Payroll;

    } catch (error) {
      console.error('更新薪资单失败:', error);
      throw new Error('更新薪资单失败');
    }
  }

  /**
   * 删除薪资单
   */
  static async deletePayroll(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('payrolls')
        .delete()
        .eq('id', id);

      if (error) throw error;

    } catch (error) {
      console.error('删除薪资单失败:', error);
      throw new Error('删除薪资单失败');
    }
  }

  /**
   * 获取薪资单项明细列表
   */
  static async getPayrollItems(payrollId: string): Promise<PayrollItemWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_items')
        .select(`
          *,
          salary_components(name, type)
        `)
        .eq('payroll_id', payrollId)
        .order('created_at');

      if (error) throw error;

      // 格式化数据
      const formattedData = data.map(item => ({
        ...item,
        component_name: (item as any).salary_components?.name || '未知组件',
        component_type: (item as any).salary_components?.type || 'earning'
      }));

      return formattedData as PayrollItemWithDetails[];

    } catch (error) {
      console.error('获取薪资单项明细失败:', error);
      throw new Error('获取薪资单项明细失败');
    }
  }

  /**
   * 添加薪资单项明细
   */
  static async addPayrollItem(itemData: Omit<PayrollItem, 'id' | 'created_at'>): Promise<PayrollItem> {
    try {
      const { data, error } = await supabase
        .from('payroll_items')
        .insert([itemData])
        .select()
        .single();

      if (error) throw error;

      return data as PayrollItem;

    } catch (error) {
      console.error('添加薪资单项明细失败:', error);
      throw new Error('添加薪资单项明细失败');
    }
  }

  /**
   * 更新薪资单项明细
   */
  static async updatePayrollItem(id: string, itemData: Partial<PayrollItem>): Promise<PayrollItem> {
    try {
      const { data, error } = await supabase
        .from('payroll_items')
        .update(itemData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as PayrollItem;

    } catch (error) {
      console.error('更新薪资单项明细失败:', error);
      throw new Error('更新薪资单项明细失败');
    }
  }

  /**
   * 删除薪资单项明细
   */
  static async deletePayrollItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('payroll_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

    } catch (error) {
      console.error('删除薪资单项明细失败:', error);
      throw new Error('删除薪资单项明细失败');
    }
  }

  /**
   * 计算薪资单总额
   */
  static async calculatePayrollTotals(payrollId: string): Promise<{ grossPay: number; totalDeductions: number; netPay: number }> {
    try {
      const items = await this.getPayrollItems(payrollId);
      
      let grossPay = 0;
      let totalDeductions = 0;
      
      items.forEach(item => {
        if (item.component_type === 'earning') {
          grossPay += item.amount;
        } else if (item.component_type === 'deduction') {
          totalDeductions += item.amount;
        }
      });
      
      const netPay = grossPay - totalDeductions;
      
      // 更新薪资单总额
      await this.updatePayroll(payrollId, {
        gross_pay: grossPay,
        total_deductions: totalDeductions,
        net_pay: netPay
      });
      
      return { grossPay, totalDeductions, netPay };

    } catch (error) {
      console.error('计算薪资单总额失败:', error);
      throw new Error('计算薪资单总额失败');
    }
  }
}