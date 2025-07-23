import { supabase } from './supabaseClient';
import type { 
  Employee,
  EmployeeWithDetails,
  EmployeeFilters,
  EmployeeListResponse,
  Department,
  Position,
  EmployeeCategory,
  EmployeePersonalDetails,
  EmployeeContact,
  EmployeeBankAccount,
  EmployeeEducation,
  EmployeeJobHistory
} from '../types/employee_new';

// 员工数据访问层（适配新的数据库结构）
export class EmployeeAPI {
  
  /**
   * 获取员工列表（带分页和过滤）
   */
  static async getEmployees(
    page = 0,
    pageSize = 20,
    filters: EmployeeFilters = {}
  ): Promise<EmployeeListResponse> {
    try {
      // 使用综合视图获取员工信息
      let query = supabase
        .from('v_employees_comprehensive')
        .select('*', { count: 'exact' });

      // 应用过滤条件
      if (filters.search) {
        // 如果搜索内容是4位数字，可能是身份证后四位
        if (/^\d{4}$/.test(filters.search)) {
          query = query.or(
            `full_name.ilike.%${filters.search}%,` +
            `id_number.ilike.%${filters.search},` +  // 身份证号后四位
            `department_name.ilike.%${filters.search}%,` +
            `personnel_category_name.ilike.%${filters.search}%`
          );
        } else {
          query = query.or(
            `full_name.ilike.%${filters.search}%,` +
            `department_name.ilike.%${filters.search}%,` +
            `personnel_category_name.ilike.%${filters.search}%`
          );
        }
      }

      if (filters.department_id) {
        query = query.eq('department_id', filters.department_id);
      }

      if (filters.position_id) {
        query = query.eq('position_id', filters.position_id);
      }

      if (filters.personnel_category_id) {
        query = query.eq('personnel_category_id', filters.personnel_category_id);
      }

      if (filters.current_status) {
        query = query.eq('current_status', filters.current_status);
      }

      if (filters.employment_status) {
        query = query.eq('employment_status', filters.employment_status);
      }

      if (filters.date_range) {
        query = query
          .gte('hire_date', filters.date_range.start)
          .lte('hire_date', filters.date_range.end);
      }

      // 分页
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data as EmployeeWithDetails[],
        total: count || 0,
        page,
        pageSize
      };

    } catch (error) {
      console.error('获取员工列表失败:', error);
      throw new Error('获取员工列表失败');
    }
  }

  /**
   * 获取单个员工详情
   */
  static async getEmployee(id: string): Promise<EmployeeWithDetails> {
    try {
      const { data, error } = await supabase
        .from('v_employees_comprehensive')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('员工不存在');

      return data as EmployeeWithDetails;

    } catch (error) {
      console.error('获取员工详情失败:', error);
      throw new Error('获取员工详情失败');
    }
  }

  /**
   * 获取员工完整信息（包括敏感数据）
   */
  static async getEmployeeWithSensitiveData(id: string): Promise<EmployeeWithDetails> {
    try {
      // TODO: 实现获取解密后的敏感数据
      // 当前版本直接返回视图数据，后续需要实现解密逻辑
      const { data, error } = await supabase
        .from('v_employees_comprehensive')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('员工不存在');

      return data as EmployeeWithDetails;

    } catch (error) {
      console.error('获取员工敏感信息失败:', error);
      throw new Error('获取员工敏感信息失败');
    }
  }

  /**
   * 创建新员工及相关详细信息
   */
  static async createEmployee(employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    try {
      // 开始事务处理
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();

      if (employeeError) throw employeeError;

      return employee as Employee;

    } catch (error) {
      console.error('创建员工失败:', error);
      throw new Error('创建员工失败');
    }
  }

  /**
   * 更新员工基本信息
   */
  static async updateEmployeeBaseInfo(id: string, employeeData: Partial<Employee>): Promise<Employee> {
    try {
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .update({ 
          ...employeeData, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (employeeError) throw employeeError;

      return employee as Employee;

    } catch (error) {
      console.error('更新员工基本信息失败:', error);
      throw new Error('更新员工基本信息失败');
    }
  }

  /**
   * 更新员工个人详细信息
   */
  static async updateEmployeePersonalDetails(employeeId: string, personalData: Partial<EmployeePersonalDetails>): Promise<EmployeePersonalDetails> {
    try {
      // 先检查是否存在记录
      const { data: existingDetails } = await supabase
        .from('employee_personal_details')
        .select('id')
        .eq('employee_id', employeeId)
        .single();

      let result;
      if (existingDetails) {
        // 如果存在，则更新
        const { data, error } = await supabase
          .from('employee_personal_details')
          .update({
            ...personalData,
            updated_at: new Date().toISOString()
          })
          .eq('employee_id', employeeId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // 如果不存在，则插入
        const { data, error } = await supabase
          .from('employee_personal_details')
          .insert([{
            employee_id: employeeId,
            ...personalData,
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return result as EmployeePersonalDetails;

    } catch (error) {
      console.error('更新员工个人详细信息失败:', error);
      throw new Error('更新员工个人详细信息失败');
    }
  }

  /**
   * 更新员工联系方式
   */
  static async updateEmployeeContact(employeeId: string, contactData: Partial<EmployeeContact>): Promise<EmployeeContact> {
    try {
      // 先检查是否存在记录
      const { data: existingContact } = await supabase
        .from('employee_contacts')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('contact_type', contactData.contact_type)
        .single();

      let result;
      if (existingContact) {
        // 如果存在，则更新
        const { data, error } = await supabase
          .from('employee_contacts')
          .update({
            ...contactData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingContact.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // 如果不存在，则插入
        const { data, error } = await supabase
          .from('employee_contacts')
          .insert([{
            employee_id: employeeId,
            ...contactData,
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return result as EmployeeContact;

    } catch (error) {
      console.error('更新员工联系方式失败:', error);
      throw new Error('更新员工联系方式失败');
    }
  }

  /**
   * 更新员工银行账户信息
   */
  static async updateEmployeeBankAccount(employeeId: string, bankData: Partial<EmployeeBankAccount>): Promise<EmployeeBankAccount> {
    try {
      // 先检查是否存在记录
      const { data: existingBank } = await supabase
        .from('employee_bank_accounts')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('is_primary', bankData.is_primary ?? true)
        .single();

      let result;
      if (existingBank) {
        // 如果存在，则更新
        const { data, error } = await supabase
          .from('employee_bank_accounts')
          .update({
            ...bankData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBank.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // 如果不存在，则插入
        const { data, error } = await supabase
          .from('employee_bank_accounts')
          .insert([{
            employee_id: employeeId,
            ...bankData,
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return result as EmployeeBankAccount;

    } catch (error) {
      console.error('更新员工银行账户信息失败:', error);
      throw new Error('更新员工银行账户信息失败');
    }
  }

  /**
   * 添加员工教育背景
   */
  static async addEmployeeEducation(educationData: Omit<EmployeeEducation, 'id' | 'created_at'>): Promise<EmployeeEducation> {
    try {
      const { data, error } = await supabase
        .from('employee_education')
        .insert([educationData])
        .select()
        .single();

      if (error) throw error;

      return data as EmployeeEducation;

    } catch (error) {
      console.error('添加员工教育背景失败:', error);
      throw new Error('添加员工教育背景失败');
    }
  }

  /**
   * 更新员工教育背景
   */
  static async updateEmployeeEducation(id: string, educationData: Partial<EmployeeEducation>): Promise<EmployeeEducation> {
    try {
      const { data, error } = await supabase
        .from('employee_education')
        .update({
          ...educationData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as EmployeeEducation;

    } catch (error) {
      console.error('更新员工教育背景失败:', error);
      throw new Error('更新员工教育背景失败');
    }
  }

  /**
   * 删除员工教育背景
   */
  static async deleteEmployeeEducation(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('employee_education')
        .delete()
        .eq('id', id);

      if (error) throw error;

    } catch (error) {
      console.error('删除员工教育背景失败:', error);
      throw new Error('删除员工教育背景失败');
    }
  }

  /**
   * 添加员工工作履历
   */
  static async addEmployeeJobHistory(jobHistoryData: Omit<EmployeeJobHistory, 'id' | 'created_at'>): Promise<EmployeeJobHistory> {
    try {
      // 结束之前的职位记录
      if (jobHistoryData.effective_start_date) {
        await supabase
          .from('employee_job_history')
          .update({ effective_end_date: jobHistoryData.effective_start_date })
          .eq('employee_id', jobHistoryData.employee_id)
          .is('effective_end_date', null);
      }

      // 添加新的职位记录
      const { data, error } = await supabase
        .from('employee_job_history')
        .insert([jobHistoryData])
        .select()
        .single();

      if (error) throw error;

      return data as EmployeeJobHistory;

    } catch (error) {
      console.error('添加员工工作履历失败:', error);
      throw new Error('添加员工工作履历失败');
    }
  }

  /**
   * 更新员工工作履历
   */
  static async updateEmployeeJobHistory(id: string, jobHistoryData: Partial<EmployeeJobHistory>): Promise<EmployeeJobHistory> {
    try {
      const { data, error } = await supabase
        .from('employee_job_history')
        .update({
          ...jobHistoryData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as EmployeeJobHistory;

    } catch (error) {
      console.error('更新员工工作履历失败:', error);
      throw new Error('更新员工工作履历失败');
    }
  }

  /**
   * 删除员工工作履历
   */
  static async deleteEmployeeJobHistory(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('employee_job_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

    } catch (error) {
      console.error('删除员工工作履历失败:', error);
      throw new Error('删除员工工作履历失败');
    }
  }

  /**
   * 获取员工教育背景列表
   */
  static async getEmployeeEducations(employeeId: string): Promise<EmployeeEducation[]> {
    try {
      const { data, error } = await supabase
        .from('employee_education')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as EmployeeEducation[];

    } catch (error) {
      console.error('获取员工教育背景失败:', error);
      throw new Error('获取员工教育背景失败');
    }
  }

  /**
   * 获取员工工作履历列表
   */
  static async getEmployeeJobHistories(employeeId: string): Promise<EmployeeJobHistory[]> {
    try {
      const { data, error } = await supabase
        .from('employee_job_history')
        .select(`
          *,
          department:departments(name),
          position:positions(name),
          rank:job_ranks(name)
        `)
        .eq('employee_id', employeeId)
        .order('effective_start_date', { ascending: false });

      if (error) throw error;

      return data as EmployeeJobHistory[];

    } catch (error) {
      console.error('获取员工工作履历失败:', error);
      throw new Error('获取员工工作履历失败');
    }
  }

  /**
   * 软删除员工（更新状态为terminated）
   */
  static async deleteEmployee(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ 
          current_status: 'terminated',
          employment_status: 'inactive',
          termination_date: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;

    } catch (error) {
      console.error('删除员工失败:', error);
      throw new Error('删除员工失败');
    }
  }

  /**
   * 批量软删除员工
   */
  static async bulkDeleteEmployees(ids: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ 
          current_status: 'terminated',
          employment_status: 'inactive',
          termination_date: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .in('id', ids);

      if (error) throw error;

    } catch (error) {
      console.error('批量删除员工失败:', error);
      throw new Error('批量删除员工失败');
    }
  }

  /**
   * 获取部门列表
   */
  static async getDepartments(): Promise<Department[]> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;

      return data as Department[];

    } catch (error) {
      console.error('获取部门列表失败:', error);
      throw new Error('获取部门列表失败');
    }
  }

  /**
   * 获取职位列表
   */
  static async getPositions(): Promise<Position[]> {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .order('name');

      if (error) throw error;

      return data as Position[];

    } catch (error) {
      console.error('获取职位列表失败:', error);
      throw new Error('获取职位列表失败');
    }
  }

  /**
   * 获取人员类别列表
   */
  static async getEmployeeCategories(): Promise<EmployeeCategory[]> {
    try {
      const { data, error } = await supabase
        .from('employee_categories')
        .select('*')
        .order('name');

      if (error) throw error;

      return data as EmployeeCategory[];

    } catch (error) {
      console.error('获取人员类别列表失败:', error);
      throw new Error('获取人员类别列表失败');
    }
  }

  /**
   * 搜索员工（模糊匹配）
   */
  static async searchEmployees(searchTerm: string, limit = 10): Promise<EmployeeWithDetails[]> {
    try {
      let query = supabase
        .from('v_employees_comprehensive')
        .select('*')
        .eq('current_status', 'active')
        .limit(limit);

      // 如果搜索内容是4位数字，可能是身份证后四位
      if (/^\d{4}$/.test(searchTerm)) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,` +
          `id_number.ilike.%${searchTerm},` +  // 身份证号后四位
          `department_name.ilike.%${searchTerm}%,` +
          `personnel_category_name.ilike.%${searchTerm}%`
        );
      } else {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,` +
          `department_name.ilike.%${searchTerm}%,` +
          `personnel_category_name.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as EmployeeWithDetails[];

    } catch (error) {
      console.error('搜索员工失败:', error);
      throw new Error('搜索员工失败');
    }
  }

  /**
   * 检查身份证号是否存在
   */
  static async checkIdNumberExists(idNumber: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('employees')
        .select('id')
        .eq('id_number', idNumber);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data?.length || 0) > 0;

    } catch (error) {
      console.error('检查身份证号失败:', error);
      return false;
    }
  }

  /**
   * 获取员工统计信息
   */
  static async getEmployeeStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    terminated: number;
    byDepartment: { department_name: string; count: number }[];
    byCategory: { category_name: string; count: number }[];
  }> {
    try {
      // 获取总体统计
      const { data: statusStats, error: statusError } = await supabase
        .from('employees')
        .select('current_status')
        .neq('current_status', null);

      if (statusError) throw statusError;

      // 按部门统计
      const { data: deptStats, error: deptError } = await supabase
        .from('v_employees_comprehensive')
        .select('department_name')
        .eq('current_status', 'active');

      if (deptError) throw deptError;

      // 按人员类别统计
      const { data: categoryStats, error: categoryError } = await supabase
        .from('v_employees_comprehensive')
        .select('personnel_category_name')
        .eq('current_status', 'active');

      if (categoryError) throw categoryError;

      // 统计处理
      const total = statusStats.length;
      const active = statusStats.filter(s => s.current_status === 'active').length;
      const inactive = statusStats.filter(s => s.current_status === 'inactive').length;
      const terminated = statusStats.filter(s => s.current_status === 'terminated').length;

      const byDepartment = deptStats
        .reduce((acc: any[], curr) => {
          const existing = acc.find(item => item.department_name === curr.department_name);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ department_name: curr.department_name || '未分配', count: 1 });
          }
          return acc;
        }, [])
        .sort((a, b) => b.count - a.count);

      const byCategory = categoryStats
        .reduce((acc: any[], curr) => {
          const existing = acc.find(item => item.category_name === curr.personnel_category_name);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ category_name: curr.personnel_category_name || '未分类', count: 1 });
          }
          return acc;
        }, [])
        .sort((a, b) => b.count - a.count);

      return {
        total,
        active,
        inactive,
        terminated,
        byDepartment,
        byCategory
      };

    } catch (error) {
      console.error('获取员工统计失败:', error);
      throw new Error('获取员工统计失败');
    }
  }

  /**
   * 实时订阅员工数据变更
   */
  static subscribeToEmployees(callback: (payload: any) => void) {
    const subscription = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  /**
   * 取消订阅
   */
  static unsubscribeFromEmployees(subscription: any) {
    supabase.removeChannel(subscription);
  }
}