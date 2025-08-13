/**
 * 部门仓储接口
 * 
 * 定义部门聚合的持久化操作
 */

import { Department } from '../entities/Department';
import { DepartmentId } from '../value-objects';

/**
 * 部门搜索条件
 */
export interface DepartmentSearchCriteria {
    keyword?: string;
    name?: string;
    code?: string;
    parentId?: string;
    managerId?: string;
    isActive?: boolean;
    level?: number;
    page?: number;
    pageSize?: number;
    sortBy?: 'code' | 'name' | 'createdAt' | 'level';
    sortOrder?: 'asc' | 'desc';
}

/**
 * 部门仓储接口
 */
export interface IDepartmentRepository {
    /**
     * 根据ID查找部门
     */
    findById(id: string): Promise<Department | null>;
    
    /**
     * 根据部门编码查找
     */
    findByCode(code: string): Promise<Department | null>;
    
    /**
     * 根据部门名称查找
     */
    findByName(name: string): Promise<Department | null>;
    
    /**
     * 获取子部门
     */
    findChildren(parentId: string): Promise<Department[]>;
    
    /**
     * 获取所有子部门（递归）
     */
    findAllDescendants(parentId: string): Promise<Department[]>;
    
    /**
     * 获取父部门链
     */
    findAncestors(departmentId: string): Promise<Department[]>;
    
    /**
     * 获取根部门列表
     */
    findRootDepartments(): Promise<Department[]>;
    
    /**
     * 搜索部门
     */
    search(criteria: DepartmentSearchCriteria): Promise<Department[]>;
    
    /**
     * 获取部门总数
     */
    count(criteria?: DepartmentSearchCriteria): Promise<number>;
    
    /**
     * 保存部门
     */
    save(department: Department): Promise<Department>;
    
    /**
     * 批量保存部门
     */
    saveMany(departments: Department[]): Promise<Department[]>;
    
    /**
     * 删除部门（需要检查是否有员工）
     */
    delete(id: string): Promise<void>;
    
    /**
     * 检查部门编码是否存在
     */
    existsByCode(code: string, excludeId?: string): Promise<boolean>;
    
    /**
     * 检查部门名称是否存在（同级别下）
     */
    existsByName(name: string, parentId?: string, excludeId?: string): Promise<boolean>;
    
    /**
     * 获取部门树形结构
     */
    getTree(rootId?: string): Promise<DepartmentTree>;
    
    /**
     * 获取部门路径
     */
    getPath(departmentId: string): Promise<string>;
    
    /**
     * 移动部门到新的父部门
     */
    move(departmentId: string, newParentId: string | null): Promise<void>;
    
    /**
     * 获取部门的员工数量
     */
    getEmployeeCount(departmentId: string, includeChildren?: boolean): Promise<number>;
    
    /**
     * 获取活跃部门列表
     */
    findActiveDepartments(): Promise<Department[]>;
    
    /**
     * 检查部门是否为另一个部门的祖先
     */
    isAncestorOf(ancestorId: string, descendantId: string): Promise<boolean>;
}

/**
 * 部门树形结构
 */
export interface DepartmentTree {
    id: string;
    code: string;
    name: string;
    level: number;
    parentId?: string;
    managerId?: string;
    managerName?: string;
    employeeCount: number;
    isActive: boolean;
    children: DepartmentTree[];
}