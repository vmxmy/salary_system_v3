import { BaseService } from './base.service';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Department = Database['public']['Tables']['departments']['Row'];
type DepartmentInsert = Database['public']['Tables']['departments']['Insert'];
type DepartmentUpdate = Database['public']['Tables']['departments']['Update'];

export interface DepartmentNode extends Department {
  children?: DepartmentNode[];
  employee_count?: number;
}

export class DepartmentService extends BaseService<'departments'> {
  constructor() {
    super('departments');
  }

  /**
   * Get department tree structure
   */
  async getDepartmentTree(): Promise<DepartmentNode[]> {
    try {
      // First, get all departments
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (deptError) throw deptError;
      if (!departments) return [];

      // Then get employee counts for each department (using employee view)
      const { data: employeeCounts, error: countError } = await supabase
        .from('view_employee_basic_info')
        .select('department_id');

      if (countError) throw countError;

      // Count employees by department
      const countMap = new Map<string, number>();
      employeeCounts?.forEach(assignment => {
        if (assignment.department_id) {
          countMap.set(assignment.department_id, (countMap.get(assignment.department_id) || 0) + 1);
        }
      });

      // Build tree structure
      const departmentMap = new Map<string, DepartmentNode>();
      const roots: DepartmentNode[] = [];

      // First pass: create all nodes
      departments.forEach(dept => {
        departmentMap.set(dept.id, {
          ...dept,
          children: [],
          employee_count: countMap.get(dept.id) || 0,
        });
      });

      // Second pass: build tree
      departments.forEach(dept => {
        const node = departmentMap.get(dept.id)!;
        if (dept.parent_department_id) {
          const parent = departmentMap.get(dept.parent_department_id);
          if (parent) {
            parent.children!.push(node);
          }
        } else {
          roots.push(node);
        }
      });

      return roots;
    } catch (error) {
      console.error('Error fetching department tree:', error);
      throw error;
    }
  }

  /**
   * Get department with details
   */
  async getDepartmentWithDetails(departmentId: string) {
    try {
      // Get the basic department info with relations
      const { data: department, error } = await supabase
        .from('departments')
        .select(`
          *,
          parent:parent_department_id(name)
        `)
        .eq('id', departmentId)
        .single();

      if (error) throw error;
      if (!department) return null;

      // Get employee count for this department
      const { count: employeeCount } = await supabase
        .from('view_employee_basic_info')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', departmentId);

      // Get hierarchy info from view
      const { data: hierarchyInfo } = await supabase
        .from('view_department_hierarchy')
        .select('full_path, level')
        .eq('id', departmentId)
        .single();

      // Get children count
      const { count: childrenCount } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true })
        .eq('parent_department_id', departmentId);

      // Combine all the data
      return {
        ...department,
        employee_count: employeeCount || 0,
        full_path: hierarchyInfo?.full_path || department.name,
        level: hierarchyInfo?.level || 1,
        children_count: childrenCount || 0
      };
    } catch (error) {
      console.error('Error fetching department details:', error);
      throw error;
    }
  }

  /**
   * Move department to new parent
   */
  async moveDepartment(departmentId: string, newParentId: string | null) {
    // Check for circular reference
    if (newParentId) {
      const isCircular = await this.checkCircularReference(departmentId, newParentId);
      if (isCircular) {
        throw new Error('Cannot create circular department reference');
      }
    }

    const { error } = await supabase
      .from('departments')
      .update({ parent_department_id: newParentId })
      .eq('id', departmentId);

    if (error) throw error;
  }

  /**
   * Check if moving department would create circular reference
   */
  private async checkCircularReference(
    departmentId: string,
    targetParentId: string
  ): Promise<boolean> {
    let currentId: string | null = targetParentId;
    
    while (currentId) {
      if (currentId === departmentId) {
        return true; // Circular reference detected
      }

      const { data } = await supabase
        .from('departments')
        .select('parent_department_id')
        .eq('id', currentId)
        .single();

      currentId = data?.parent_department_id || null;
    }

    return false;
  }

  /**
   * Get department employees
   */
  async getDepartmentEmployees(departmentId: string) {
    try {
      const { data, error } = await supabase
        .from('view_employee_basic_info')
        .select('*')
        .eq('department_id', departmentId)
        .order('full_name', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match the expected interface
      return (data || []).map(employee => ({
        id: employee.employee_id,
        employee_id: employee.employee_number,
        name: employee.full_name,
        position_name: employee.position_name,
        personnel_category: employee.personnel_category,
        status: employee.employment_status,
        assignment_start_date: employee.hire_date,
        department_id: employee.department_id,
        department_name: employee.department_name,
      }));
    } catch (error) {
      console.error('Error fetching department employees:', error);
      throw error;
    }
  }

  /**
   * Update department manager
   */
  async updateManager(departmentId: string, managerId: string | null) {
    // Note: This schema doesn't have a manager_id field in departments table
    // If manager functionality is needed, it should be implemented through
    // a separate table or by adding the field to the departments table
    throw new Error('Manager functionality not implemented in current schema');
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(departmentId: string) {
    const { data, error } = await supabase
      .rpc('get_department_stats', { p_department_id: departmentId });

    if (error) throw error;
    return data;
  }

  /**
   * Get department hierarchy using database view
   */
  async getDepartmentHierarchy() {
    const { data, error } = await supabase
      .from('view_department_hierarchy')
      .select('*')
      .order('level', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get department payroll statistics
   */
  async getDepartmentPayrollStats(filters?: {
    year?: number;
    month?: number;
    departmentIds?: string[];
  }) {
    let query = supabase
      .from('view_department_payroll_statistics')
      .select('*');

    if (filters?.year) {
      query = query.eq('pay_year', filters.year);
    }

    if (filters?.month) {
      query = query.eq('pay_month', filters.month);
    }

    if (filters?.departmentIds && filters.departmentIds.length > 0) {
      query = query.in('department_id', filters.departmentIds);
    }

    const { data, error } = await query
      .order('department_name', { ascending: true });

    if (error) throw error;

    // Format numeric values for consistency
    return (data || []).map(item => ({
      ...item,
      total_gross_pay: this.formatNumber(item.total_gross_pay),
      total_deductions: this.formatNumber(item.total_deductions),
      total_net_pay: this.formatNumber(item.total_net_pay),
      avg_gross_pay: this.formatNumber(item.avg_gross_pay),
      avg_net_pay: this.formatNumber(item.avg_net_pay),
      min_gross_pay: this.formatNumber(item.min_gross_pay),
      max_gross_pay: this.formatNumber(item.max_gross_pay),
      dept_gross_pay_percentage: this.formatNumber(item.dept_gross_pay_percentage, 4),
      dept_employee_percentage: this.formatNumber(item.dept_employee_percentage, 4),
    }));
  }

  /**
   * Get department employees with basic info
   */
  async getDepartmentEmployeesBasic(departmentId: string) {
    const { data, error } = await supabase
      .from('view_employee_basic_info')
      .select('*')
      .eq('department_id', departmentId)
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all departments as flat list with hierarchy info
   */
  async getDepartmentList() {
    const { data, error } = await supabase
      .from('view_department_hierarchy')
      .select('*')
      .order('full_path', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Search departments by name
   */
  async searchDepartments(searchTerm: string) {
    const { data, error } = await supabase
      .from('view_department_hierarchy')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .order('level', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get department payroll summary for a specific period
   */
  async getDepartmentPayrollSummary(
    departmentId: string, 
    year: number, 
    month: number
  ) {
    const { data, error } = await supabase
      .from('view_department_payroll_statistics')
      .select('*')
      .eq('department_id', departmentId)
      .eq('pay_year', year)
      .eq('pay_month', month)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
    
    if (data) {
      return {
        ...data,
        total_gross_pay: this.formatNumber(data.total_gross_pay),
        total_deductions: this.formatNumber(data.total_deductions),
        total_net_pay: this.formatNumber(data.total_net_pay),
        avg_gross_pay: this.formatNumber(data.avg_gross_pay),
        avg_net_pay: this.formatNumber(data.avg_net_pay),
        min_gross_pay: this.formatNumber(data.min_gross_pay),
        max_gross_pay: this.formatNumber(data.max_gross_pay),
        dept_gross_pay_percentage: this.formatNumber(data.dept_gross_pay_percentage, 4),
        dept_employee_percentage: this.formatNumber(data.dept_employee_percentage, 4),
      };
    }

    return null;
  }

  /**
   * Batch operations for departments
   */
  async batchUpdateDepartments(operations: Array<{
    id: string;
    action: 'update' | 'delete' | 'move';
    data?: any;
  }>) {
    const results = [];
    
    for (const operation of operations) {
      try {
        switch (operation.action) {
          case 'update':
            await this.update(operation.id, operation.data);
            break;
          case 'delete':
            await this.delete(operation.id);
            break;
          case 'move':
            await this.moveDepartment(operation.id, operation.data?.newParentId);
            break;
        }
        results.push({ id: operation.id, success: true });
      } catch (error) {
        results.push({ id: operation.id, success: false, error });
      }
    }
    
    return results;
  }

  /**
   * Format number values with specified decimal places
   */
  private formatNumber(value: any, decimals: number = 2): number {
    if (value == null || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : parseFloat(num.toFixed(decimals));
  }
}

// Export singleton instance
export const departmentService = new DepartmentService();