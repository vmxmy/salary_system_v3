import { supabase } from './supabaseClient';
import type { 
  Employee, 
  EmployeeWithDetails, 
  EmployeeFilters, 
  EmployeeListResponse,
  Department,
  Position,
  PersonnelCategory 
} from '../types/employee';

// 员工数据访问层
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
      let query = supabase
        .from('v_employees_comprehensive') // 使用综合视图
        .select('*', { count: 'exact' });

      // 应用过滤条件 - 支持姓名、身份证号后四位、部门、人员类别的模糊搜索
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
   * 获取员工完整信息（用于编辑）- 现在不再有加密，直接返回所有数据
   */
  static async getEmployeeWithSensitiveData(id: string): Promise<EmployeeWithDetails> {
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
      console.error('获取员工信息失败:', error);
      throw new Error('获取员工信息失败');
    }
  }

  /**
   * 创建新员工
   */
  static async createEmployee(employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();

      if (error) throw error;

      return data as Employee;

    } catch (error) {
      console.error('创建员工失败:', error);
      throw new Error('创建员工失败');
    }
  }

  /**
   * 更新员工信息
   */
  static async updateEmployee(id: string, employeeData: Partial<Employee> & { 
    education_level?: string; 
    phone_number?: string; 
    email?: string; 
    address?: string;
    bank_name?: string;
    account_number?: string;
    account_type?: string;
    account_holder_name?: string;
    position?: string;
    position_id?: string;
    job_level?: string;
    interrupted_service_years?: number;
    social_security_number?: string;
    housing_fund_number?: string;
    political_status?: string;
    marital_status?: string;
    id_number?: string;
  }): Promise<Employee> {
    try {
      // 分离不同表的数据
      const { 
        education_level, 
        phone_number, 
        email, 
        address,
        bank_name,
        account_number,
        account_type,
        account_holder_name,
        position,
        job_level,
        interrupted_service_years,
        social_security_number,
        housing_fund_number,
        political_status,
        marital_status,
        // 这些字段不属于employees表，需要单独处理
        position_id, // 这个字段在当前系统中不使用
        id_number, // 身份证号直接存储明文
        ...baseEmployeeData 
      } = employeeData;

      // position和job_level直接存储在employees表中
      if ('position' in employeeData) (baseEmployeeData as any).position = position || null;
      if ('job_level' in employeeData) (baseEmployeeData as any).job_level = job_level || null;

      // 处理身份证号（现在直接存储明文）
      if ('id_number' in employeeData) {
        (baseEmployeeData as any).id_number = id_number || null;
      }
      
      // 更新employees表
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .update({ 
          ...baseEmployeeData, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (employeeError) throw employeeError;

      // 更新employee_personal_details表
      const personalDetailsUpdate: any = {
        employee_id: id,
        updated_at: new Date().toISOString()
      };
      
      if (education_level !== undefined) personalDetailsUpdate.education_level = education_level || null;
      if (interrupted_service_years !== undefined) personalDetailsUpdate.interrupted_service_years = interrupted_service_years || null;
      if (social_security_number !== undefined) personalDetailsUpdate.social_security_number = social_security_number || null;
      if (housing_fund_number !== undefined) personalDetailsUpdate.housing_fund_number = housing_fund_number || null;
      if (political_status !== undefined) personalDetailsUpdate.political_status = political_status || null;
      if (marital_status !== undefined) personalDetailsUpdate.marital_status = marital_status || null;
      
      if (Object.keys(personalDetailsUpdate).length > 2) { // 只有在有实际更新字段时才执行
        // 先检查是否存在记录
        const { data: existingDetails } = await supabase
          .from('employee_personal_details')
          .select('id')
          .eq('employee_id', id)
          .single();

        if (existingDetails) {
          // 如果存在，则更新
          const { error: detailsError } = await supabase
            .from('employee_personal_details')
            .update(personalDetailsUpdate)
            .eq('employee_id', id);

          if (detailsError) throw detailsError;
        } else {
          // 如果不存在，则插入
          const { error: detailsError } = await supabase
            .from('employee_personal_details')
            .insert(personalDetailsUpdate);

          if (detailsError) throw detailsError;
        }
      }

      // 更新employee_contacts表
      const contactsUpdate: any = {
        employee_id: id,
        updated_at: new Date().toISOString()
      };
      
      if (phone_number !== undefined) contactsUpdate.phone_number = phone_number || null;
      if (email !== undefined) contactsUpdate.email = email || null;
      if (address !== undefined) contactsUpdate.address = address || null;
      
      if (Object.keys(contactsUpdate).length > 2) {
        // 先检查是否存在记录
        const { data: existingContacts } = await supabase
          .from('employee_contacts')
          .select('id')
          .eq('employee_id', id)
          .single();

        if (existingContacts) {
          // 如果存在，则更新
          const { error: contactsError } = await supabase
            .from('employee_contacts')
            .update(contactsUpdate)
            .eq('employee_id', id);

          if (contactsError) throw contactsError;
        } else {
          // 如果不存在，则插入
          const { error: contactsError } = await supabase
            .from('employee_contacts')
            .insert(contactsUpdate);

          if (contactsError) throw contactsError;
        }
      }

      // 更新employee_bank_accounts表
      if (bank_name !== undefined || account_number !== undefined || account_type !== undefined || account_holder_name !== undefined) {
        const bankUpdate: any = {
          employee_id: id,
          updated_at: new Date().toISOString()
        };
        
        if (bank_name !== undefined) bankUpdate.bank_name = bank_name || null;
        // 现在直接存储明文账号
        if (account_number !== undefined) {
          bankUpdate.account_number = account_number || null;
        }
        if (account_type !== undefined) bankUpdate.account_type = account_type || null;
        if (account_holder_name !== undefined) bankUpdate.account_holder_name = account_holder_name || null;
        
        // 先检查是否存在记录
        const { data: existingBank } = await supabase
          .from('employee_bank_accounts')
          .select('id')
          .eq('employee_id', id)
          .single();

        if (existingBank) {
          // 如果存在，则更新
          const { error: bankError } = await supabase
            .from('employee_bank_accounts')
            .update(bankUpdate)
            .eq('employee_id', id);

          if (bankError) throw bankError;
        } else {
          // 如果不存在，则插入
          const { error: bankError } = await supabase
            .from('employee_bank_accounts')
            .insert(bankUpdate);

          if (bankError) throw bankError;
        }
      }

      // position, job_level等字段直接存储在employees表中，在上面的基本更新中已经处理

      console.log('员工信息更新成功，包括个人详情、联系方式、银行信息等。');

      return employee as Employee;

    } catch (error) {
      console.error('更新员工失败:', error);
      throw new Error('更新员工失败');
    }
  }

  /**
   * 删除员工（软删除）
   */
  static async deleteEmployee(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ 
          current_status: 'terminated',
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
   * 批量删除员工
   */
  static async bulkDeleteEmployees(ids: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ 
          current_status: 'terminated',
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
        .eq('is_active', true)
        .order('sort_order');

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
        .eq('is_active', true)
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
  static async getPersonnelCategories(): Promise<PersonnelCategory[]> {
    try {
      const { data, error } = await supabase
        .from('personnel_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return data as PersonnelCategory[];

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