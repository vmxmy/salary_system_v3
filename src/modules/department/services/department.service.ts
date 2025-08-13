/**
 * 部门服务 - 基于通用CRUD服务
 * 
 * 演示如何使用BaseCrudService简化开发
 */

import { BaseCrudService } from '../../../shared/services/base-crud.service';
import { supabase } from '../../../shared/supabase/client';
import { Role } from '../../../shared/auth/auth.service';

/**
 * 部门DTO
 */
export interface DepartmentDTO {
    id: string;
    name: string;
    code?: string;
    parentId?: string;
    parentName?: string;
    managerId?: string;
    managerName?: string;
    level?: number;
    path?: string;
    employeeCount?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * 部门服务类
 */
export class DepartmentService extends BaseCrudService<DepartmentDTO> {
    constructor() {
        super({
            tableName: 'departments',
            viewName: 'view_department_hierarchy',
            primaryKey: 'id',
            mapperConfig: {
                rename: {
                    'parent_id': 'parentId',
                    'manager_id': 'managerId',
                    'is_active': 'isActive',
                    'created_at': 'createdAt',
                    'updated_at': 'updatedAt',
                    'parent_name': 'parentName',
                    'manager_name': 'managerName',
                    'employee_count': 'employeeCount'
                }
            },
            defaultSort: 'name',
            requiredRole: Role.HR_MANAGER
        });
    }
    
    /**
     * 获取部门树
     */
    async getDepartmentTree(): Promise<DepartmentDTO[]> {
        const { data, error } = await supabase
            .from('view_department_hierarchy')
            .select('*')
            .order('level')
            .order('name');
        
        if (error) throw error;
        
        // 构建树形结构
        const tree = this.buildTree(data || []);
        return tree;
    }
    
    /**
     * 获取子部门
     */
    async getChildren(parentId: string): Promise<DepartmentDTO[]> {
        return this.list({ parent_id: parentId }).then(result => result.data);
    }
    
    /**
     * 移动部门
     */
    async moveDepartment(
        departmentId: string,
        newParentId: string | null
    ): Promise<void> {
        // 检查是否会造成循环引用
        if (newParentId) {
            const isDescendant = await this.isDescendantOf(newParentId, departmentId);
            if (isDescendant) {
                throw new Error('Cannot move department to its descendant');
            }
        }
        
        await this.update(departmentId, { parentId: newParentId });
    }
    
    /**
     * 检查是否为后代部门
     */
    private async isDescendantOf(
        possibleDescendantId: string,
        ancestorId: string
    ): Promise<boolean> {
        const { data } = await supabase
            .from('view_department_hierarchy')
            .select('path_ids')
            .eq('id', possibleDescendantId)
            .single();
        
        if (!data) return false;
        
        const pathIds = data.path_ids?.split(',') || [];
        return pathIds.includes(ancestorId);
    }
    
    /**
     * 构建树形结构
     */
    private buildTree(departments: any[]): DepartmentDTO[] {
        const map = new Map<string, any>();
        const roots: any[] = [];
        
        // 第一遍：创建所有节点
        departments.forEach(dept => {
            map.set(dept.id, { ...dept, children: [] });
        });
        
        // 第二遍：建立父子关系
        departments.forEach(dept => {
            const node = map.get(dept.id);
            if (dept.parent_id) {
                const parent = map.get(dept.parent_id);
                if (parent) {
                    parent.children.push(node);
                }
            } else {
                roots.push(node);
            }
        });
        
        return roots;
    }
    
    /**
     * 获取部门统计信息
     */
    async getDepartmentStatistics(departmentId: string): Promise<{
        totalEmployees: number;
        activeEmployees: number;
        subDepartments: number;
        directReports: number;
    }> {
        const { data, error } = await supabase
            .from('view_department_statistics')
            .select('*')
            .eq('department_id', departmentId)
            .single();
        
        if (error) throw error;
        
        return {
            totalEmployees: data.total_employees || 0,
            activeEmployees: data.active_employees || 0,
            subDepartments: data.sub_departments || 0,
            directReports: data.direct_reports || 0
        };
    }
}

// 导出默认实例
export const departmentService = new DepartmentService();