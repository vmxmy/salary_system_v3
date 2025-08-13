/**
 * 员工仓储接口
 * 
 * 定义员工聚合的持久化操作
 * 遵循仓储模式，隔离领域层和基础设施层
 */

import { Employee } from '../entities/Employee';
import { EmployeeId } from '../value-objects';
import { EmployeeSearchCriteria } from '../../application/dto/EmployeeDTO';

/**
 * 员工仓储接口
 */
export interface IEmployeeRepository {
    /**
     * 根据ID查找员工
     */
    findById(id: string): Promise<Employee | null>;
    
    /**
     * 根据员工编号查找
     */
    findByEmployeeCode(code: string): Promise<Employee | null>;
    
    /**
     * 根据身份证号查找
     */
    findByIdNumber(idNumber: string): Promise<Employee | null>;
    
    /**
     * 根据部门ID查找员工列表
     */
    findByDepartmentId(departmentId: string): Promise<Employee[]>;
    
    /**
     * 根据管理者ID查找下属员工
     */
    findByManagerId(managerId: string): Promise<Employee[]>;
    
    /**
     * 搜索员工
     */
    search(criteria: EmployeeSearchCriteria): Promise<Employee[]>;
    
    /**
     * 获取员工总数
     */
    count(criteria?: EmployeeSearchCriteria): Promise<number>;
    
    /**
     * 保存员工（创建或更新）
     */
    save(employee: Employee): Promise<Employee>;
    
    /**
     * 批量保存员工
     */
    saveMany(employees: Employee[]): Promise<Employee[]>;
    
    /**
     * 删除员工（软删除）
     */
    delete(id: string): Promise<void>;
    
    /**
     * 检查员工编号是否存在
     */
    existsByEmployeeCode(code: string, excludeId?: string): Promise<boolean>;
    
    /**
     * 检查身份证号是否存在
     */
    existsByIdNumber(idNumber: string, excludeId?: string): Promise<boolean>;
    
    /**
     * 获取下一个可用的员工编号
     */
    getNextEmployeeCode(prefix?: string): Promise<string>;
    
    /**
     * 获取员工的组织路径
     */
    getOrganizationPath(employeeId: string): Promise<{
        department: string;
        position: string;
        manager?: string;
    }>;
    
    /**
     * 获取员工的直接下属
     */
    getDirectSubordinates(employeeId: string): Promise<Employee[]>;
    
    /**
     * 获取员工的所有下属（递归）
     */
    getAllSubordinates(employeeId: string): Promise<Employee[]>;
    
    /**
     * 获取活跃员工列表
     */
    findActiveEmployees(limit?: number, offset?: number): Promise<Employee[]>;
    
    /**
     * 获取即将转正的员工
     */
    findEmployeesEndingProbation(days: number): Promise<Employee[]>;
    
    /**
     * 获取合同即将到期的员工
     */
    findEmployeesWithExpiringContracts(days: number): Promise<Employee[]>;
    
    /**
     * 获取生日员工
     */
    findEmployeesWithBirthday(month: number, day?: number): Promise<Employee[]>;
    
    /**
     * 获取入职周年员工
     */
    findEmployeesWithAnniversary(month: number, day?: number): Promise<Employee[]>;
}