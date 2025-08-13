/**
 * 员工管理应用服务
 * 
 * 负责编排员工管理的用例流程，协调领域层和基础设施层
 * 处理事务管理、权限验证、DTO转换等应用层关注点
 */

import { IEmployeeRepository } from '../domain/repositories/IEmployeeRepository';
import { IDepartmentRepository } from '../domain/repositories/IDepartmentRepository';
import { IPositionRepository } from '../domain/repositories/IPositionRepository';
import { EmployeeDomainService } from '../domain/services/EmployeeDomainService';
import { Employee } from '../domain/entities/Employee';
import { DepartmentId, PositionId, EmployeeId } from '../domain/value-objects';
import { 
    CreateEmployeeDTO, 
    UpdateEmployeeDTO, 
    TransferEmployeeDTO,
    TerminateEmployeeDTO,
    EmployeeDTO,
    EmployeeListDTO,
    EmployeeSearchCriteria
} from './dto/EmployeeDTO';
import { EmployeeMapper } from './mappers/EmployeeMapper';
import { IEventPublisher } from '../../../core/events/EventPublisher';
import { 
    EmployeeCreatedEvent,
    EmployeeUpdatedEvent,
    EmployeeTerminatedEvent,
    EmployeeDepartmentChangedEvent,
    EmployeePositionChangedEvent
} from '../../../core/events/DomainEvents';
import { IUnitOfWork } from '../../../core/infrastructure/IUnitOfWork';
import { Logger } from '../../../core/infrastructure/Logger';
import { BusinessRuleEngine } from '../../../core/rules/BusinessRuleEngine';
import { ApplicationError, ValidationError, NotFoundError, AuthorizationError } from '../../../core/errors';

/**
 * 员工应用服务接口
 */
export interface IEmployeeApplicationService {
    // 创建员工
    createEmployee(dto: CreateEmployeeDTO): Promise<EmployeeDTO>;
    
    // 更新员工信息
    updateEmployee(id: string, dto: UpdateEmployeeDTO): Promise<EmployeeDTO>;
    
    // 获取员工详情
    getEmployee(id: string): Promise<EmployeeDTO>;
    
    // 搜索员工
    searchEmployees(criteria: EmployeeSearchCriteria): Promise<EmployeeListDTO[]>;
    
    // 部门调动
    transferEmployee(dto: TransferEmployeeDTO): Promise<void>;
    
    // 员工离职
    terminateEmployee(id: string, dto: TerminateEmployeeDTO): Promise<void>;
    
    // 批量导入员工
    importEmployees(employees: CreateEmployeeDTO[]): Promise<{
        success: number;
        failed: number;
        errors: Array<{ index: number; error: string }>;
    }>;
}

/**
 * 员工应用服务实现
 */
export class EmployeeApplicationService implements IEmployeeApplicationService {
    private logger: Logger;

    constructor(
        private readonly employeeRepo: IEmployeeRepository,
        private readonly departmentRepo: IDepartmentRepository,
        private readonly positionRepo: IPositionRepository,
        private readonly domainService: EmployeeDomainService,
        private readonly eventPublisher: IEventPublisher,
        private readonly unitOfWork: IUnitOfWork,
        private readonly ruleEngine: BusinessRuleEngine,
        private readonly authService?: any // 权限服务（可选）
    ) {
        this.logger = Logger.getInstance();
    }

    /**
     * 创建员工
     */
    async createEmployee(dto: CreateEmployeeDTO): Promise<EmployeeDTO> {
        this.logger.info('开始创建员工', { 
            employeeCode: dto.employeeCode,
            name: dto.name,
            departmentId: dto.departmentId 
        });

        // 开启事务
        const transaction = await this.unitOfWork.begin();

        try {
            // 1. 权限检查
            if (this.authService) {
                await this.authService.checkPermission('employee.create', dto.operatorId);
            }

            // 2. DTO验证
            await this.validateCreateEmployeeDTO(dto);

            // 3. 调用领域服务创建员工
            const employee = await this.domainService.createEmployee({
                name: dto.name,
                employeeCode: dto.employeeCode,
                idNumber: dto.idNumber,
                departmentId: dto.departmentId,
                positionId: dto.positionId,
                hireDate: new Date(dto.hireDate),
                gender: dto.gender,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                managerId: dto.managerId,
                metadata: {
                    createdBy: dto.operatorId,
                    createdAt: new Date()
                }
            });

            // 4. 应用业务规则
            const ruleResult = await this.ruleEngine.evaluate(employee, 'employee.creation');
            if (!ruleResult.passed) {
                throw new ValidationError('业务规则验证失败', ruleResult.violations);
            }

            // 5. 持久化员工
            const savedEmployee = await this.employeeRepo.save(employee);

            // 6. 创建关联数据（如银行账户、联系方式等）
            if (dto.bankAccount) {
                await this.createEmployeeBankAccount(savedEmployee.id.value, dto.bankAccount);
            }

            if (dto.contact) {
                await this.createEmployeeContact(savedEmployee.id.value, dto.contact);
            }

            // 7. 发布领域事件
            await this.eventPublisher.publish(
                new EmployeeCreatedEvent(
                    savedEmployee.id.value,
                    {
                        employeeCode: savedEmployee.employeeCode.value,
                        name: savedEmployee.name.value,
                        departmentId: savedEmployee.departmentId.value,
                        positionId: savedEmployee.positionId.value,
                        hireDate: savedEmployee.hireDate.toISOString()
                    },
                    dto.operatorId
                ),
                {
                    userId: dto.operatorId,
                    aggregateId: savedEmployee.id.value,
                    aggregateType: 'Employee'
                }
            );

            // 8. 提交事务
            await transaction.commit();

            // 9. 转换为DTO返回
            const result = await EmployeeMapper.toDTO(savedEmployee);

            this.logger.info('员工创建成功', {
                employeeId: result.id,
                employeeCode: result.employeeCode
            });

            return result;

        } catch (error) {
            // 回滚事务
            await transaction.rollback();

            this.logger.error('创建员工失败', {
                error: error.message,
                dto
            });

            // 包装错误
            if (error instanceof ValidationError || error instanceof NotFoundError) {
                throw error;
            }
            
            throw new ApplicationError('创建员工失败', error);
        }
    }

    /**
     * 更新员工信息
     */
    async updateEmployee(id: string, dto: UpdateEmployeeDTO): Promise<EmployeeDTO> {
        this.logger.info('开始更新员工', { employeeId: id });

        const transaction = await this.unitOfWork.begin();

        try {
            // 1. 权限检查
            if (this.authService) {
                await this.authService.checkPermission('employee.update', dto.operatorId);
            }

            // 2. 获取员工实体
            const employee = await this.employeeRepo.findById(id);
            if (!employee) {
                throw new NotFoundError(`员工不存在: ${id}`);
            }

            // 3. 记录变更前的状态（用于事件）
            const changes = [];
            const oldSnapshot = employee.getSnapshot();

            // 4. 应用更新
            if (dto.name && dto.name !== employee.name.value) {
                changes.push({
                    field: 'name',
                    oldValue: employee.name.value,
                    newValue: dto.name
                });
                employee.updateName(dto.name);
            }

            if (dto.idNumber && dto.idNumber !== employee.idNumber) {
                changes.push({
                    field: 'idNumber',
                    oldValue: employee.idNumber,
                    newValue: dto.idNumber
                });
                employee.updateIdNumber(dto.idNumber);
            }

            if (dto.gender) {
                employee.updateGender(dto.gender);
            }

            if (dto.dateOfBirth) {
                employee.updateDateOfBirth(new Date(dto.dateOfBirth));
            }

            if (dto.managerId && dto.managerId !== employee.managerId?.value) {
                changes.push({
                    field: 'managerId',
                    oldValue: employee.managerId?.value,
                    newValue: dto.managerId
                });
                employee.updateManager(dto.managerId);
            }

            // 5. 验证业务规则
            const ruleResult = await this.ruleEngine.evaluate(employee, 'employee.update');
            if (!ruleResult.passed) {
                throw new ValidationError('业务规则验证失败', ruleResult.violations);
            }

            // 6. 保存更新
            const updatedEmployee = await this.employeeRepo.save(employee);

            // 7. 更新关联数据
            if (dto.bankAccount) {
                await this.updateEmployeeBankAccount(id, dto.bankAccount);
            }

            if (dto.contact) {
                await this.updateEmployeeContact(id, dto.contact);
            }

            // 8. 发布更新事件
            if (changes.length > 0) {
                await this.eventPublisher.publish(
                    new EmployeeUpdatedEvent(
                        id,
                        changes,
                        dto.operatorId
                    ),
                    {
                        userId: dto.operatorId,
                        aggregateId: id,
                        aggregateType: 'Employee'
                    }
                );
            }

            // 9. 提交事务
            await transaction.commit();

            // 10. 返回DTO
            const result = await EmployeeMapper.toDTO(updatedEmployee);

            this.logger.info('员工更新成功', {
                employeeId: id,
                changesCount: changes.length
            });

            return result;

        } catch (error) {
            await transaction.rollback();

            this.logger.error('更新员工失败', {
                employeeId: id,
                error: error.message
            });

            if (error instanceof ValidationError || error instanceof NotFoundError) {
                throw error;
            }

            throw new ApplicationError('更新员工失败', error);
        }
    }

    /**
     * 获取员工详情
     */
    async getEmployee(id: string): Promise<EmployeeDTO> {
        this.logger.debug('获取员工详情', { employeeId: id });

        try {
            const employee = await this.employeeRepo.findById(id);
            
            if (!employee) {
                throw new NotFoundError(`员工不存在: ${id}`);
            }

            // 加载关联数据
            const [department, position, manager] = await Promise.all([
                this.departmentRepo.findById(employee.departmentId.value),
                this.positionRepo.findById(employee.positionId.value),
                employee.managerId ? this.employeeRepo.findById(employee.managerId.value) : null
            ]);

            // 转换为DTO
            const dto = await EmployeeMapper.toDetailDTO(
                employee,
                department,
                position,
                manager
            );

            return dto;

        } catch (error) {
            this.logger.error('获取员工详情失败', {
                employeeId: id,
                error: error.message
            });

            if (error instanceof NotFoundError) {
                throw error;
            }

            throw new ApplicationError('获取员工详情失败', error);
        }
    }

    /**
     * 搜索员工
     */
    async searchEmployees(criteria: EmployeeSearchCriteria): Promise<EmployeeListDTO[]> {
        this.logger.debug('搜索员工', { criteria });

        try {
            // 使用查询服务进行复杂查询
            const employees = await this.employeeRepo.search(criteria);

            // 转换为列表DTO
            const dtos = await Promise.all(
                employees.map(emp => EmployeeMapper.toListDTO(emp))
            );

            return dtos;

        } catch (error) {
            this.logger.error('搜索员工失败', {
                criteria,
                error: error.message
            });

            throw new ApplicationError('搜索员工失败', error);
        }
    }

    /**
     * 部门调动
     */
    async transferEmployee(dto: TransferEmployeeDTO): Promise<void> {
        this.logger.info('开始员工部门调动', {
            employeeId: dto.employeeId,
            targetDepartmentId: dto.targetDepartmentId
        });

        const transaction = await this.unitOfWork.begin();

        try {
            // 1. 权限检查
            if (this.authService) {
                await this.authService.checkPermission('employee.transfer', dto.operatorId);
            }

            // 2. 获取员工
            const employee = await this.employeeRepo.findById(dto.employeeId);
            if (!employee) {
                throw new NotFoundError(`员工不存在: ${dto.employeeId}`);
            }

            // 3. 验证目标部门
            const targetDept = await this.departmentRepo.findById(dto.targetDepartmentId);
            if (!targetDept || !targetDept.isActive()) {
                throw new ValidationError('目标部门无效或已停用');
            }

            // 4. 记录原部门
            const fromDepartmentId = employee.departmentId.value;

            // 5. 执行调动
            await this.domainService.transferEmployee(
                employee,
                new DepartmentId(dto.targetDepartmentId),
                dto.newPositionId ? new PositionId(dto.newPositionId) : undefined,
                new Date(dto.effectiveDate),
                dto.reason
            );

            // 6. 保存变更
            await this.employeeRepo.save(employee);

            // 7. 创建调动记录
            await this.createTransferRecord({
                employeeId: dto.employeeId,
                fromDepartmentId,
                toDepartmentId: dto.targetDepartmentId,
                fromPositionId: employee.positionId.value,
                toPositionId: dto.newPositionId || employee.positionId.value,
                effectiveDate: dto.effectiveDate,
                reason: dto.reason,
                createdBy: dto.operatorId
            });

            // 8. 发布调动事件
            await this.eventPublisher.publish(
                new EmployeeDepartmentChangedEvent(
                    dto.employeeId,
                    {
                        fromDepartmentId,
                        toDepartmentId: dto.targetDepartmentId,
                        fromPositionId: employee.positionId.value,
                        toPositionId: dto.newPositionId,
                        effectiveDate: dto.effectiveDate,
                        reason: dto.reason
                    },
                    dto.operatorId
                ),
                {
                    userId: dto.operatorId,
                    aggregateId: dto.employeeId,
                    aggregateType: 'Employee'
                }
            );

            // 9. 提交事务
            await transaction.commit();

            this.logger.info('员工部门调动成功', {
                employeeId: dto.employeeId,
                fromDepartment: fromDepartmentId,
                toDepartment: dto.targetDepartmentId
            });

        } catch (error) {
            await transaction.rollback();

            this.logger.error('员工部门调动失败', {
                dto,
                error: error.message
            });

            if (error instanceof ValidationError || error instanceof NotFoundError) {
                throw error;
            }

            throw new ApplicationError('员工部门调动失败', error);
        }
    }

    /**
     * 员工离职
     */
    async terminateEmployee(id: string, dto: TerminateEmployeeDTO): Promise<void> {
        this.logger.info('开始处理员工离职', {
            employeeId: id,
            terminationDate: dto.terminationDate
        });

        const transaction = await this.unitOfWork.begin();

        try {
            // 1. 权限检查
            if (this.authService) {
                await this.authService.checkPermission('employee.terminate', dto.operatorId);
            }

            // 2. 获取员工
            const employee = await this.employeeRepo.findById(id);
            if (!employee) {
                throw new NotFoundError(`员工不存在: ${id}`);
            }

            // 3. 执行离职
            employee.terminate(
                new Date(dto.terminationDate),
                dto.reason,
                dto.notes
            );

            // 4. 验证业务规则
            const ruleResult = await this.ruleEngine.evaluate(employee, 'employee.termination');
            if (!ruleResult.passed) {
                throw new ValidationError('离职业务规则验证失败', ruleResult.violations);
            }

            // 5. 检查未完成事项
            await this.checkPendingMatters(id);

            // 6. 保存状态
            await this.employeeRepo.save(employee);

            // 7. 处理离职后续事项
            await this.handleTerminationTasks(id, dto);

            // 8. 发布离职事件
            await this.eventPublisher.publish(
                new EmployeeTerminatedEvent(
                    id,
                    {
                        terminationDate: dto.terminationDate,
                        reason: dto.reason,
                        finalSalaryPeriod: dto.finalSalaryPeriod,
                        notes: dto.notes
                    },
                    dto.operatorId
                ),
                {
                    userId: dto.operatorId,
                    aggregateId: id,
                    aggregateType: 'Employee'
                }
            );

            // 9. 提交事务
            await transaction.commit();

            this.logger.info('员工离职处理成功', {
                employeeId: id,
                terminationDate: dto.terminationDate
            });

        } catch (error) {
            await transaction.rollback();

            this.logger.error('员工离职处理失败', {
                employeeId: id,
                error: error.message
            });

            if (error instanceof ValidationError || error instanceof NotFoundError) {
                throw error;
            }

            throw new ApplicationError('员工离职处理失败', error);
        }
    }

    /**
     * 批量导入员工
     */
    async importEmployees(employees: CreateEmployeeDTO[]): Promise<{
        success: number;
        failed: number;
        errors: Array<{ index: number; error: string }>;
    }> {
        this.logger.info('开始批量导入员工', { count: employees.length });

        const results = {
            success: 0,
            failed: 0,
            errors: [] as Array<{ index: number; error: string }>
        };

        // 分批处理，每批10个
        const batchSize = 10;
        for (let i = 0; i < employees.length; i += batchSize) {
            const batch = employees.slice(i, i + batchSize);
            
            await Promise.all(
                batch.map(async (dto, index) => {
                    try {
                        await this.createEmployee(dto);
                        results.success++;
                    } catch (error) {
                        results.failed++;
                        results.errors.push({
                            index: i + index,
                            error: error.message
                        });
                    }
                })
            );
        }

        this.logger.info('批量导入员工完成', results);

        return results;
    }

    // 私有辅助方法

    private async validateCreateEmployeeDTO(dto: CreateEmployeeDTO): Promise<void> {
        const errors = [];

        if (!dto.name || dto.name.trim().length === 0) {
            errors.push('姓名不能为空');
        }

        if (!dto.employeeCode || dto.employeeCode.trim().length === 0) {
            errors.push('员工编号不能为空');
        }

        if (!dto.departmentId) {
            errors.push('部门不能为空');
        }

        if (!dto.positionId) {
            errors.push('职位不能为空');
        }

        if (!dto.hireDate) {
            errors.push('入职日期不能为空');
        }

        if (errors.length > 0) {
            throw new ValidationError('员工信息验证失败', errors);
        }
    }

    private async createEmployeeBankAccount(
        employeeId: string,
        bankAccount: any
    ): Promise<void> {
        // 创建员工银行账户信息
        this.logger.debug('创建员工银行账户', { employeeId, bankAccount });
    }

    private async updateEmployeeBankAccount(
        employeeId: string,
        bankAccount: any
    ): Promise<void> {
        // 更新员工银行账户信息
        this.logger.debug('更新员工银行账户', { employeeId, bankAccount });
    }

    private async createEmployeeContact(
        employeeId: string,
        contact: any
    ): Promise<void> {
        // 创建员工联系方式
        this.logger.debug('创建员工联系方式', { employeeId, contact });
    }

    private async updateEmployeeContact(
        employeeId: string,
        contact: any
    ): Promise<void> {
        // 更新员工联系方式
        this.logger.debug('更新员工联系方式', { employeeId, contact });
    }

    private async createTransferRecord(record: any): Promise<void> {
        // 创建调动记录
        this.logger.debug('创建调动记录', record);
    }

    private async checkPendingMatters(employeeId: string): Promise<void> {
        // 检查未完成事项（如未结算薪资、未归还物品等）
        this.logger.debug('检查员工未完成事项', { employeeId });
    }

    private async handleTerminationTasks(
        employeeId: string,
        dto: TerminateEmployeeDTO
    ): Promise<void> {
        // 处理离职后续事项（如停用账号、回收权限等）
        this.logger.debug('处理离职后续事项', { employeeId, dto });
    }
}