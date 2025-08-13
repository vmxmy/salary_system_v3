/**
 * 员工映射器
 * 
 * 负责在领域实体和DTO之间进行转换
 * 确保领域层和应用层的解耦
 */

import { Employee } from '../../domain/entities/Employee';
import { Department } from '../../domain/entities/Department';
import { Position } from '../../domain/entities/Position';
import {
    EmployeeDTO,
    EmployeeListDTO,
    CreateEmployeeDTO,
    UpdateEmployeeDTO,
    EmployeeTransferRecordDTO
} from '../dto/EmployeeDTO';

export class EmployeeMapper {
    /**
     * 将领域实体转换为DTO
     */
    static async toDTO(employee: Employee): Promise<EmployeeDTO> {
        const age = employee.dateOfBirth 
            ? Math.floor((Date.now() - employee.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : undefined;
            
        const yearsOfService = Math.floor(
            (Date.now() - employee.hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );

        return {
            // 基本信息
            id: employee.id.value,
            employeeCode: employee.employeeCode.value,
            name: employee.name.value,
            idNumber: employee.idNumber,
            gender: employee.gender,
            dateOfBirth: employee.dateOfBirth?.toISOString().split('T')[0],
            age,
            
            // 组织信息
            departmentId: employee.departmentId.value,
            positionId: employee.positionId.value,
            managerId: employee.managerId?.value,
            
            // 入职信息
            hireDate: employee.hireDate.toISOString().split('T')[0],
            yearsOfService,
            employmentType: employee.employmentType,
            probationEndDate: employee.probationEndDate?.toISOString().split('T')[0],
            status: employee.status,
            
            // 系统信息
            createdAt: employee.createdAt.toISOString(),
            updatedAt: employee.updatedAt.toISOString(),
            version: employee.version
        };
    }
    
    /**
     * 将领域实体转换为详细DTO（包含关联数据）
     */
    static async toDetailDTO(
        employee: Employee,
        department?: Department,
        position?: Position,
        manager?: Employee
    ): Promise<EmployeeDTO> {
        const baseDTO = await this.toDTO(employee);
        
        return {
            ...baseDTO,
            departmentName: department?.name.value,
            departmentPath: department?.getPath(),
            positionName: position?.name.value,
            positionLevel: position?.level,
            managerName: manager?.name.value
        };
    }
    
    /**
     * 将领域实体转换为列表DTO
     */
    static async toListDTO(employee: Employee): Promise<EmployeeListDTO> {
        return {
            id: employee.id.value,
            employeeCode: employee.employeeCode.value,
            name: employee.name.value,
            departmentName: '', // 需要从repository加载
            positionName: '', // 需要从repository加载
            hireDate: employee.hireDate.toISOString().split('T')[0],
            status: employee.status
        };
    }
    
    /**
     * 将创建DTO转换为领域实体属性
     */
    static toDomainProps(dto: CreateEmployeeDTO): {
        name: string;
        employeeCode: string;
        idNumber?: string;
        departmentId: string;
        positionId: string;
        hireDate: Date;
        gender?: 'male' | 'female';
        dateOfBirth?: Date;
        managerId?: string;
        employmentType?: 'full_time' | 'part_time' | 'contract' | 'intern';
        probationEndDate?: Date;
    } {
        return {
            name: dto.name,
            employeeCode: dto.employeeCode,
            idNumber: dto.idNumber,
            departmentId: dto.departmentId,
            positionId: dto.positionId,
            hireDate: new Date(dto.hireDate),
            gender: dto.gender,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
            managerId: dto.managerId,
            employmentType: dto.employmentType,
            probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : undefined
        };
    }
    
    /**
     * 批量转换为DTO
     */
    static async toDTOList(employees: Employee[]): Promise<EmployeeDTO[]> {
        return Promise.all(employees.map(emp => this.toDTO(emp)));
    }
    
    /**
     * 批量转换为列表DTO
     */
    static async toListDTOList(employees: Employee[]): Promise<EmployeeListDTO[]> {
        return Promise.all(employees.map(emp => this.toListDTO(emp)));
    }
    
    /**
     * 创建调动记录DTO
     */
    static createTransferRecordDTO(params: {
        employeeId: string;
        employeeName: string;
        fromDepartmentId: string;
        fromDepartmentName: string;
        toDepartmentId: string;
        toDepartmentName: string;
        fromPositionId: string;
        fromPositionName: string;
        toPositionId: string;
        toPositionName: string;
        effectiveDate: string;
        reason?: string;
        approvedBy?: string;
        approverName?: string;
        createdBy: string;
    }): EmployeeTransferRecordDTO {
        return {
            id: this.generateId(),
            ...params,
            createdAt: new Date().toISOString()
        };
    }
    
    /**
     * 生成ID（临时方法，实际应该由repository生成）
     */
    private static generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}