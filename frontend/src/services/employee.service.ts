import { BaseService } from './base.service';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import type { 
  EmployeeBasicInfo,
  EmployeeCurrentStatus,
  EmployeeWithDetails,
  EmployeeListItem,
  EmployeeQueryParams,
  EmployeeQueryResult,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeBankAccount,
  EmployeeEducation,
  EmployeeJobHistory,
  EmployeeContributionBase,
  EmployeeDocument,
  EmployeeSpecialDeduction
} from '@/types/employee';

type Employee = Database['public']['Tables']['employees']['Row'];
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

export class EmployeeService extends BaseService<'employees'> {
  constructor() {
    super('employees');
  }

  /**
   * Get employee with all details from view
   */
  async getEmployeeWithDetails(employeeId: string): Promise<EmployeeBasicInfo | null> {
    const { data, error } = await supabase
      .from('view_employee_basic_info')
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 简化的获取所有员工数据 - 用于React Query缓存和客户端处理
   */
  async getAllEmployeesRaw(): Promise<EmployeeListItem[]> {
    // 使用新的视图 view_employee_basic_info 获取完整员工信息
    const { data: employeesData, error } = await supabase
      .from('view_employee_basic_info')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Failed to fetch employees:', error);
      throw new Error(`获取员工列表失败: ${error.message}`);
    }

    if (!employeesData || employeesData.length === 0) {
      return [];
    }

    // 数据已经在视图中完整包含，无需额外查询
    const employees: EmployeeListItem[] = employeesData.map(emp => ({
      id: emp.employee_id,
      employee_id: emp.employee_id,
      full_name: emp.full_name,
      gender: emp.gender,
      employment_status: emp.employment_status,
      current_status: emp.employment_status as 'active' | 'inactive' | 'terminated',
      department_name: emp.department_name,
      position_name: emp.position_name,
      category_name: emp.category_name,
      hire_date: emp.hire_date,
      mobile_phone: emp.mobile_phone,
      email: emp.email,
      primary_bank_account: emp.primary_bank_account,
      bank_name: emp.bank_name,
      latest_institution: emp.latest_institution,
      latest_degree: emp.latest_degree,
      latest_field_of_study: emp.latest_field_of_study,
      latest_graduation_date: emp.latest_graduation_date,
    }));

    return employees;
  }

  

  /**
   * Get all employees with details - 兼容旧接口
   */
  async getAllWithDetails(options: {
    departmentId?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    // 将旧接口参数转换为新接口参数
    const params: EmployeeQueryParams = {
      page: Math.floor((options.offset || 0) / (options.limit || 10)) + 1,
      pageSize: options.limit || 10,
      search: options.search,
      employment_status: options.status,
      sortBy: 'full_name',
      sortOrder: 'asc'
    };

    const result = await this.getEmployees(params);
    return { 
      data: result.data, 
      count: result.total 
    };
  }

  /**
   * Create employee with initial assignment
   */
  async createWithAssignment(
    employee: EmployeeInsert,
    assignment: {
      department_id: string;
      position_id: string;
      personnel_category_id: string;
      manager_id?: string;
      employment_status: string;
    }
  ) {
    // Start a transaction
    const { data: newEmployee, error: employeeError } = await supabase
      .from('employees')
      .insert(employee)
      .select()
      .single();

    if (employeeError) throw employeeError;

    // Create initial job history record
    const { error: assignmentError } = await supabase
      .from('employee_job_history')
      .insert({
        employee_id: newEmployee.id,
        department_id: assignment.department_id,
        position_id: assignment.position_id,
        rank_id: assignment.personnel_category_id,
        effective_start_date: new Date().toISOString().split('T')[0],
      });

    if (assignmentError) {
      // Rollback by deleting the employee
      await supabase.from('employees').delete().eq('id', newEmployee.id);
      throw assignmentError;
    }

    return newEmployee;
  }

  /**
   * Update employee status - Note: This method needs to be refactored for the current schema
   * The current schema doesn't have employment_status in job history
   */
  async updateEmploymentStatus(
    employeeId: string,
    newStatus: string,
    validFrom: Date = new Date()
  ) {
    // For now, we'll just update the employee record directly
    // In a full implementation, you might want to add employment_status tracking
    const { error } = await supabase
      .from('employees')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', employeeId);

    if (error) throw error;
    
    // TODO: Implement proper employment status tracking if needed
    console.warn('Employment status tracking needs to be implemented for current schema');
  }

  /**
   * Get employee history
   */
  async getEmployeeHistory(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_job_history')
      .select(`
        *,
        departments (name),
        positions (name),
        job_ranks (name)
      `)
      .eq('employee_id', employeeId)
      .order('effective_start_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * 更新员工详细信息
   */
  async updateEmployeeDetails(employeeId: string, updates: {
    // 基本信息
    full_name?: string;
    gender?: string;
    date_of_birth?: string;
    id_number?: string;
    hire_date?: string;
    // 联系信息
    mobile_phone?: string;
    work_email?: string;
    personal_email?: string;
    // 银行信息
    primary_bank_account?: string;
    bank_name?: string;
    branch_name?: string;
    // 工作信息（需要查找对应ID并创建新的工作历史记录）
    department_name?: string;
    position_name?: string;
    category_name?: string;
    employment_status?: string;
    // 工作信息变更生效日期
    job_change_effective_date?: string;
  }) {
    // 1. 更新员工基本信息
    const employeeUpdates: any = {};
    if (updates.full_name !== undefined) employeeUpdates.full_name = updates.full_name;
    if (updates.gender !== undefined) employeeUpdates.gender = updates.gender;
    if (updates.date_of_birth !== undefined) employeeUpdates.date_of_birth = updates.date_of_birth;
    if (updates.id_number !== undefined) employeeUpdates.id_number = updates.id_number;
    if (updates.hire_date !== undefined) employeeUpdates.hire_date = updates.hire_date;
    if (updates.mobile_phone !== undefined) employeeUpdates.mobile_phone = updates.mobile_phone;
    if (updates.work_email !== undefined) employeeUpdates.work_email = updates.work_email;
    if (updates.personal_email !== undefined) employeeUpdates.personal_email = updates.personal_email;
    if (updates.primary_bank_account !== undefined) employeeUpdates.primary_bank_account = updates.primary_bank_account;
    if (updates.bank_name !== undefined) employeeUpdates.bank_name = updates.bank_name;
    if (updates.branch_name !== undefined) employeeUpdates.branch_name = updates.branch_name;

    if (Object.keys(employeeUpdates).length > 0) {
      employeeUpdates.updated_at = new Date().toISOString();
      const { error: employeeError } = await supabase
        .from('employees')
        .update(employeeUpdates)
        .eq('employee_id', employeeId);
      
      if (employeeError) throw employeeError;
    }

    // 2. 如果有工作信息更新，需要更新 employee_job_history 表
    if (updates.department_name || updates.position_name || updates.category_name) {
      // 获取生效日期，默认为当前日期
      const effectiveDate = updates.job_change_effective_date || new Date().toISOString().split('T')[0];
      
      // 验证生效日期的合理性
      await this.validateEffectiveDate(employeeId, effectiveDate);
      
      // 获取当前的工作历史记录，以便继承未更新的字段
      const { data: currentJobHistory } = await supabase
        .from('employee_job_history')
        .select('department_id, position_id, rank_id, effective_start_date')
        .eq('employee_id', employeeId)
        .is('effective_end_date', null)
        .single();

      // 查找对应的ID，如果没有提供更新值则使用当前值
      let departmentId = currentJobHistory?.department_id;
      let positionId = currentJobHistory?.position_id;
      let rankId = currentJobHistory?.rank_id;

      if (updates.department_name) {
        const { data: dept } = await supabase
          .from('departments')
          .select('id')
          .eq('name', updates.department_name)
          .single();
        if (dept?.id) departmentId = dept.id;
      }

      if (updates.position_name) {
        const { data: pos } = await supabase
          .from('positions')
          .select('id')
          .eq('name', updates.position_name)
          .single();
        if (pos?.id) positionId = pos.id;
      }

      if (updates.category_name) {
        const { data: rank } = await supabase
          .from('job_ranks')
          .select('id')
          .eq('name', updates.category_name)
          .single();
        if (rank?.id) rankId = rank.id;
      }

      // 验证必填字段
      if (!departmentId || !positionId) {
        throw new Error('部门和职位信息不完整，无法更新工作历史记录');
      }

      // 如果存在当前记录，需要智能处理结束日期
      if (currentJobHistory) {
        // 计算前一天作为结束日期
        const endDate = new Date(effectiveDate);
        endDate.setDate(endDate.getDate() - 1);
        const formattedEndDate = endDate.toISOString().split('T')[0];
        
        // 确保结束日期不早于开始日期
        if (formattedEndDate >= currentJobHistory.effective_start_date) {
          const { error: endError } = await supabase
            .from('employee_job_history')
            .update({ effective_end_date: formattedEndDate })
            .eq('employee_id', employeeId)
            .is('effective_end_date', null);

          if (endError) throw endError;
        } else {
          // 如果生效日期太早，直接删除当前记录（通常是数据修正情况）
          const { error: deleteError } = await supabase
            .from('employee_job_history')
            .delete()
            .eq('employee_id', employeeId)
            .is('effective_end_date', null);

          if (deleteError) throw deleteError;
        }
      }

      // 创建新的工作历史记录
      const newJobHistory = {
        employee_id: employeeId,
        department_id: departmentId,
        position_id: positionId,
        rank_id: rankId,
        effective_start_date: effectiveDate,
        effective_end_date: null,
        notes: updates.job_change_effective_date ? 
          `变更生效日期: ${effectiveDate}` : 
          undefined
      };

      const { error: jobHistoryError } = await supabase
        .from('employee_job_history')
        .insert(newJobHistory);

      if (jobHistoryError) throw jobHistoryError;
    }

    return { success: true };
  }

  /**
   * 验证工作信息变更的生效日期
   */
  private async validateEffectiveDate(employeeId: string, effectiveDate: string): Promise<void> {
    // 1. 获取员工的雇佣日期
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('hire_date')
      .eq('employee_id', employeeId)
      .single();

    if (employeeError) {
      throw new Error(`获取员工信息失败: ${employeeError.message}`);
    }

    // 2. 验证生效日期不能早于雇佣日期
    if (employee.hire_date && effectiveDate < employee.hire_date) {
      throw new Error(`生效日期(${effectiveDate})不能早于雇佣日期(${employee.hire_date})`);
    }

    // 3. 验证生效日期不能晚于当前日期（可选，根据业务需求）
    const today = new Date().toISOString().split('T')[0];
    if (effectiveDate > today) {
      // 允许未来日期，但给出警告信息
      console.warn(`生效日期(${effectiveDate})设置为未来日期，请确认此变更将在未来生效`);
    }

    // 4. 检查是否与现有历史记录产生冲突
    const { data: existingRecords, error: historyError } = await supabase
      .from('employee_job_history')
      .select('effective_start_date, effective_end_date')
      .eq('employee_id', employeeId)
      .order('effective_start_date', { ascending: false });

    if (historyError) {
      throw new Error(`获取工作历史失败: ${historyError.message}`);
    }

    // 检查是否存在日期冲突
    if (existingRecords && existingRecords.length > 0) {
      for (const record of existingRecords) {
        // 跳过当前有效的记录（即将被更新）
        if (record.effective_end_date === null) continue;
        
        // 检查新的生效日期是否落在已有记录的时间范围内
        if (effectiveDate >= record.effective_start_date && 
            (record.effective_end_date === null || effectiveDate <= record.effective_end_date)) {
          throw new Error(`生效日期(${effectiveDate})与现有工作历史记录存在冲突`);
        }
      }
    }
  }

  /**
   * 获取部门列表 - 基于真实departments表
   */
  async getDepartments(): Promise<string[]> {
    const { data, error } = await supabase
      .from('departments')
      .select('name')
      .order('name');

    if (error) {
      console.error('Failed to fetch departments:', error);
      throw new Error(`获取部门列表失败: ${error.message}`);
    }

    return data?.map(dept => dept.name) || [];
  }

  /**
   * 获取人员类别列表 - 基于真实job_ranks表
   */
  async getPersonnelCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('job_ranks')
      .select('name')
      .order('name');

    if (error) {
      console.error('Failed to fetch personnel categories:', error);
      throw new Error(`获取人员类别失败: ${error.message}`);
    }

    return data?.map(rank => rank.name) || [];
  }

  /**
   * 获取职位列表 - 基于真实positions表
   */
  async getPositions(): Promise<string[]> {
    const { data, error } = await supabase
      .from('positions')
      .select('name')
      .order('name');

    if (error) {
      console.error('Failed to fetch positions:', error);
      throw new Error(`获取职位列表失败: ${error.message}`);
    }

    return data?.map(pos => pos.name) || [];
  }

  /**
   * 获取员工状态选项 - 基于实际业务需求
   */
  getEmploymentStatusOptions(): { value: string; label: string }[] {
    return [
      { value: 'active', label: '在职' },
      { value: 'inactive', label: '停职' },
      { value: 'terminated', label: '离职' },
    ];
  }

  /**
   * 获取性别选项
   */
  getGenderOptions(): { value: string; label: string }[] {
    return [
      { value: 'male', label: '男' },
      { value: 'female', label: '女' },
      { value: 'other', label: '其他' },
    ];
  }

  /**
   * 获取联系方式类型选项
   */
  getContactTypeOptions(): { value: string; label: string }[] {
    return [
      { value: 'mobile_phone', label: '手机' },
      { value: 'email', label: '邮箱' },
      { value: 'landline', label: '座机' },
      { value: 'address', label: '地址' },
    ];
  }

  /**
   * 获取员工银行账户 - 基于真实employee_bank_accounts表
   */
  async getEmployeeBankAccounts(employeeId: string): Promise<EmployeeBankAccount[]> {
    const { data, error } = await supabase
      .from('employee_bank_accounts')
      .select('*')
      .eq('employee_id', employeeId)
      .is('effective_end_date', null) // 只获取有效的账户
      .order('is_primary', { ascending: false }) // 主要账户排在前面
      .order('created_at', { ascending: false }); // 最新创建的排在前面

    if (error) {
      console.error('Failed to fetch employee bank accounts:', error);
      throw new Error(`获取员工银行账户失败: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 创建员工银行账户
   */
  async createEmployeeBankAccount(bankAccount: Omit<EmployeeBankAccount, 'id' | 'created_at' | 'updated_at'>): Promise<EmployeeBankAccount> {
    // 如果设置为主要账户，先取消其他主要账户
    if (bankAccount.is_primary) {
      const { error: updateError } = await supabase
        .from('employee_bank_accounts')
        .update({ is_primary: false })
        .eq('employee_id', bankAccount.employee_id)
        .eq('is_primary', true)
        .is('effective_end_date', null);

      if (updateError) {
        console.error('Failed to update existing primary bank accounts:', updateError);
        throw new Error(`更新主要银行账户失败: ${updateError.message}`);
      }
    }

    const { data, error } = await supabase
      .from('employee_bank_accounts')
      .insert(bankAccount)
      .select()
      .single();

    if (error) {
      console.error('Failed to create employee bank account:', error);
      throw new Error(`创建员工银行账户失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 更新员工银行账户
   */
  async updateEmployeeBankAccount(id: string, updates: Partial<EmployeeBankAccount>): Promise<EmployeeBankAccount> {
    // 如果设置为主要账户，先取消其他主要账户
    if (updates.is_primary) {
      // 获取当前账户信息
      const { data: currentAccount, error: fetchError } = await supabase
        .from('employee_bank_accounts')
        .select('employee_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Failed to fetch current bank account:', fetchError);
        throw new Error(`获取当前银行账户失败: ${fetchError.message}`);
      }

      // 取消其他主要账户
      const { error: updateError } = await supabase
        .from('employee_bank_accounts')
        .update({ is_primary: false })
        .eq('employee_id', currentAccount.employee_id)
        .eq('is_primary', true)
        .neq('id', id)
        .is('effective_end_date', null);

      if (updateError) {
        console.error('Failed to update existing primary bank accounts:', updateError);
        throw new Error(`更新主要银行账户失败: ${updateError.message}`);
      }
    }

    const { data, error } = await supabase
      .from('employee_bank_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update employee bank account:', error);
      throw new Error(`更新员工银行账户失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 删除员工银行账户（软删除，设置结束日期）
   */
  async deleteEmployeeBankAccount(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_bank_accounts')
      .update({ 
        effective_end_date: new Date().toISOString(),
        is_primary: false 
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to delete employee bank account:', error);
      throw new Error(`删除员工银行账户失败: ${error.message}`);
    }
  }

  /**
   * 获取银行名称列表 - 基于真实数据
   */
  async getBankNames(): Promise<string[]> {
    const { data, error } = await supabase
      .from('employee_bank_accounts')
      .select('bank_name')
      .is('effective_end_date', null);

    if (error) {
      console.error('Failed to fetch bank names:', error);
      throw new Error(`获取银行名称失败: ${error.message}`);
    }

    // 去重并排序
    const uniqueBankNames = [...new Set(data?.map(item => item.bank_name).filter(Boolean))];
    return uniqueBankNames.sort();
  }

  // ==================== 员工教育背景管理 ====================

  /**
   * 获取员工教育背景
   */
  async getEmployeeEducation(employeeId: string): Promise<EmployeeEducation[]> {
    const { data, error } = await supabase
      .from('employee_education')
      .select('*')
      .eq('employee_id', employeeId)
      .order('graduation_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch employee education:', error);
      throw new Error(`获取员工教育背景失败: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 创建员工教育背景记录
   */
  async createEmployeeEducation(education: Omit<EmployeeEducation, 'id' | 'created_at'>): Promise<EmployeeEducation> {
    const { data, error } = await supabase
      .from('employee_education')
      .insert(education)
      .select()
      .single();

    if (error) {
      console.error('Failed to create employee education:', error);
      throw new Error(`创建员工教育背景失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 更新员工教育背景记录
   */
  async updateEmployeeEducation(id: string, updates: Partial<EmployeeEducation>): Promise<EmployeeEducation> {
    const { data, error } = await supabase
      .from('employee_education')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update employee education:', error);
      throw new Error(`更新员工教育背景失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 删除员工教育背景记录
   */
  async deleteEmployeeEducation(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_education')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete employee education:', error);
      throw new Error(`删除员工教育背景失败: ${error.message}`);
    }
  }

  // ==================== 员工工作历史管理 ====================

  /**
   * 获取员工工作历史
   */
  async getEmployeeJobHistory(employeeId: string): Promise<EmployeeJobHistory[]> {
    const { data, error } = await supabase
      .from('employee_job_history')
      .select(`
        *,
        departments (name),
        positions (name),
        job_ranks (name)
      `)
      .eq('employee_id', employeeId)
      .order('effective_start_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch employee job history:', error);
      throw new Error(`获取员工工作历史失败: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 创建员工工作历史记录
   */
  async createEmployeeJobHistory(jobHistory: Omit<EmployeeJobHistory, 'id' | 'created_at'>): Promise<EmployeeJobHistory> {
    const { data, error } = await supabase
      .from('employee_job_history')
      .insert(jobHistory)
      .select()
      .single();

    if (error) {
      console.error('Failed to create employee job history:', error);
      throw new Error(`创建员工工作历史失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 更新员工工作历史记录
   */
  async updateEmployeeJobHistory(id: string, updates: Partial<EmployeeJobHistory>): Promise<EmployeeJobHistory> {
    const { data, error } = await supabase
      .from('employee_job_history')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update employee job history:', error);
      throw new Error(`更新员工工作历史失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 删除员工工作历史记录
   */
  async deleteEmployeeJobHistory(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_job_history')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete employee job history:', error);
      throw new Error(`删除员工工作历史失败: ${error.message}`);
    }
  }

  // ==================== 员工缴费基数管理 ====================

  /**
   * 获取员工缴费基数
   */
  async getEmployeeContributionBases(employeeId: string): Promise<EmployeeContributionBase[]> {
    const { data, error } = await supabase
      .from('employee_contribution_bases')
      .select('*')
      .eq('employee_id', employeeId)
      .order('effective_start_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch employee contribution bases:', error);
      throw new Error(`获取员工缴费基数失败: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 创建员工缴费基数记录
   */
  async createEmployeeContributionBase(contributionBase: Omit<EmployeeContributionBase, 'id' | 'created_at'>): Promise<EmployeeContributionBase> {
    const { data, error } = await supabase
      .from('employee_contribution_bases')
      .insert(contributionBase)
      .select()
      .single();

    if (error) {
      console.error('Failed to create employee contribution base:', error);
      throw new Error(`创建员工缴费基数失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 更新员工缴费基数记录
   */
  async updateEmployeeContributionBase(id: string, updates: Partial<EmployeeContributionBase>): Promise<EmployeeContributionBase> {
    const { data, error } = await supabase
      .from('employee_contribution_bases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update employee contribution base:', error);
      throw new Error(`更新员工缴费基数失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 删除员工缴费基数记录
   */
  async deleteEmployeeContributionBase(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_contribution_bases')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete employee contribution base:', error);
      throw new Error(`删除员工缴费基数失败: ${error.message}`);
    }
  }

  // ==================== 员工文档管理 ====================

  /**
   * 获取员工文档
   */
  async getEmployeeDocuments(employeeId: string): Promise<EmployeeDocument[]> {
    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('upload_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch employee documents:', error);
      throw new Error(`获取员工文档失败: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 创建员工文档记录
   */
  async createEmployeeDocument(document: Omit<EmployeeDocument, 'id' | 'created_at' | 'updated_at'>): Promise<EmployeeDocument> {
    const { data, error } = await supabase
      .from('employee_documents')
      .insert(document)
      .select()
      .single();

    if (error) {
      console.error('Failed to create employee document:', error);
      throw new Error(`创建员工文档失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 更新员工文档记录
   */
  async updateEmployeeDocument(id: string, updates: Partial<EmployeeDocument>): Promise<EmployeeDocument> {
    const { data, error } = await supabase
      .from('employee_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update employee document:', error);
      throw new Error(`更新员工文档失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 删除员工文档记录
   */
  async deleteEmployeeDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete employee document:', error);
      throw new Error(`删除员工文档失败: ${error.message}`);
    }
  }

  // ==================== 员工专项扣除管理 ====================

  /**
   * 获取员工专项扣除
   */
  async getEmployeeSpecialDeductions(employeeId: string): Promise<EmployeeSpecialDeduction[]> {
    const { data, error } = await supabase
      .from('employee_special_deductions')
      .select('*')
      .eq('employee_id', employeeId)
      .order('effective_start_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch employee special deductions:', error);
      throw new Error(`获取员工专项扣除失败: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 创建员工专项扣除记录
   */
  async createEmployeeSpecialDeduction(deduction: Omit<EmployeeSpecialDeduction, 'id' | 'created_at' | 'updated_at'>): Promise<EmployeeSpecialDeduction> {
    const { data, error } = await supabase
      .from('employee_special_deductions')
      .insert(deduction)
      .select()
      .single();

    if (error) {
      console.error('Failed to create employee special deduction:', error);
      throw new Error(`创建员工专项扣除失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 更新员工专项扣除记录
   */
  async updateEmployeeSpecialDeduction(id: string, updates: Partial<EmployeeSpecialDeduction>): Promise<EmployeeSpecialDeduction> {
    const { data, error } = await supabase
      .from('employee_special_deductions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update employee special deduction:', error);
      throw new Error(`更新员工专项扣除失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 删除员工专项扣除记录
   */
  async deleteEmployeeSpecialDeduction(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_special_deductions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete employee special deduction:', error);
      throw new Error(`删除员工专项扣除失败: ${error.message}`);
    }
  }

  // ==================== 通用选项数据获取 ====================

  /**
   * 获取学位选项
   */
  getDegreeOptions(): { value: string; label: string }[] {
    return [
      { value: '高中及以下', label: '高中及以下' },
      { value: '大学专科毕业', label: '大学专科毕业' },
      { value: '大学本科毕业', label: '大学本科毕业' },
      { value: '硕士学位研究生', label: '硕士学位研究生' },
      { value: '博士学位研究生', label: '博士学位研究生' },
    ];
  }

  /**
   * 获取文档类型选项
   */
  getDocumentTypeOptions(): { value: string; label: string }[] {
    return [
      { value: 'resume', label: '简历' },
      { value: 'contract', label: '劳动合同' },
      { value: 'certificate', label: '证书' },
      { value: 'id_copy', label: '身份证复印件' },
      { value: 'education_certificate', label: '学历证明' },
      { value: 'other', label: '其他' },
    ];
  }

  /**
   * 获取专项扣除类型选项
   */
  getSpecialDeductionTypeOptions(): { value: string; label: string }[] {
    return [
      { value: 'child_education', label: '子女教育' },
      { value: 'continuing_education', label: '继续教育' },
      { value: 'housing_loan', label: '住房贷款利息' },
      { value: 'housing_rent', label: '住房租金' },
      { value: 'elderly_care', label: '赡养老人' },
      { value: 'medical_expenses', label: '大病医疗' },
      { value: 'infant_care', label: '婴幼儿照护' },
    ];
  }

  /**
   * Batch import employees
   */
  async batchImport(employees: EmployeeInsert[]) {
    const { data, error } = await supabase
      .from('employees')
      .insert(employees)
      .select();

    if (error) throw error;
    return data;
  }
}

// Export singleton instance
export const employeeService = new EmployeeService();