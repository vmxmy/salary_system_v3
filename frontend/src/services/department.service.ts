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
    // Get all departments with employee count
    const { data: departments, error } = await supabase
      .from('departments')
      .select(`
        *,
        employees:employee_assignments(count)
      `)
      .eq('employee_assignments.is_current', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!departments) return [];

    // Build tree structure
    const departmentMap = new Map<string, DepartmentNode>();
    const roots: DepartmentNode[] = [];

    // First pass: create all nodes
    departments.forEach(dept => {
      departmentMap.set(dept.id, {
        ...dept,
        children: [],
        employee_count: dept.employees?.[0]?.count || 0,
      });
    });

    // Second pass: build tree
    departments.forEach(dept => {
      const node = departmentMap.get(dept.id)!;
      if (dept.parent_id) {
        const parent = departmentMap.get(dept.parent_id);
        if (parent) {
          parent.children!.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * Get department with details
   */
  async getDepartmentWithDetails(departmentId: string) {
    const { data, error } = await supabase
      .from('departments')
      .select(`
        *,
        parent:parent_id(name),
        manager:employees!departments_manager_id_fkey(full_name),
        employee_count:employee_assignments(count)
      `)
      .eq('id', departmentId)
      .eq('employee_assignments.is_current', true)
      .single();

    if (error) throw error;
    return data;
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
      .update({ parent_id: newParentId })
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
        .select('parent_id')
        .eq('id', currentId)
        .single();

      currentId = data?.parent_id || null;
    }

    return false;
  }

  /**
   * Get department employees
   */
  async getDepartmentEmployees(departmentId: string) {
    const { data, error } = await supabase
      .from('v_employees_with_details')
      .select('*')
      .eq('department_id', departmentId)
      .eq('employment_status', 'active');

    if (error) throw error;
    return data;
  }

  /**
   * Update department manager
   */
  async updateManager(departmentId: string, managerId: string | null) {
    const { error } = await supabase
      .from('departments')
      .update({ manager_id: managerId })
      .eq('id', departmentId);

    if (error) throw error;
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
}

// Export singleton instance
export const departmentService = new DepartmentService();