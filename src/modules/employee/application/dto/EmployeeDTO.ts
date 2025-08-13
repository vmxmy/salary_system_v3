/**
 * 员工数据传输对象(DTO)定义
 * 
 * DTOs用于应用层和外部层之间的数据传输
 * 与领域实体分离，避免领域模型的泄露
 */

/**
 * 创建员工DTO
 */
export interface CreateEmployeeDTO {
    // 基本信息
    name: string;
    employeeCode: string;
    idNumber?: string;
    gender?: 'male' | 'female';
    dateOfBirth?: string;
    
    // 组织信息
    departmentId: string;
    positionId: string;
    managerId?: string;
    
    // 入职信息
    hireDate: string;
    employmentType?: 'full_time' | 'part_time' | 'contract' | 'intern';
    probationEndDate?: string;
    
    // 联系信息
    contact?: {
        phone?: string;
        email?: string;
        address?: string;
        emergencyContact?: string;
        emergencyPhone?: string;
    };
    
    // 银行信息
    bankAccount?: {
        bankName?: string;
        accountNumber?: string;
        accountName?: string;
        branchName?: string;
    };
    
    // 薪资信息
    salaryInfo?: {
        baseSalary?: number;
        allowances?: Record<string, number>;
        socialInsuranceBase?: number;
        housingFundBase?: number;
    };
    
    // 操作信息
    operatorId: string;
    remarks?: string;
}

/**
 * 更新员工DTO
 */
export interface UpdateEmployeeDTO {
    // 基本信息（可更新）
    name?: string;
    idNumber?: string;
    gender?: 'male' | 'female';
    dateOfBirth?: string;
    
    // 组织信息（通过特定流程更新）
    managerId?: string;
    
    // 联系信息
    contact?: {
        phone?: string;
        email?: string;
        address?: string;
        emergencyContact?: string;
        emergencyPhone?: string;
    };
    
    // 银行信息
    bankAccount?: {
        bankName?: string;
        accountNumber?: string;
        accountName?: string;
        branchName?: string;
    };
    
    // 薪资信息
    salaryInfo?: {
        baseSalary?: number;
        allowances?: Record<string, number>;
        socialInsuranceBase?: number;
        housingFundBase?: number;
    };
    
    // 操作信息
    operatorId: string;
    remarks?: string;
}

/**
 * 员工部门调动DTO
 */
export interface TransferEmployeeDTO {
    employeeId: string;
    targetDepartmentId: string;
    newPositionId?: string;
    effectiveDate: string;
    reason?: string;
    approvedBy?: string;
    operatorId: string;
}

/**
 * 员工离职DTO
 */
export interface TerminateEmployeeDTO {
    terminationDate: string;
    reason: 'resignation' | 'dismissal' | 'retirement' | 'contract_end' | 'other';
    finalSalaryPeriod?: string;
    handoverCompleted?: boolean;
    exitInterviewCompleted?: boolean;
    notes?: string;
    operatorId: string;
}

/**
 * 员工DTO（返回用）
 */
export interface EmployeeDTO {
    // 基本信息
    id: string;
    employeeCode: string;
    name: string;
    idNumber?: string;
    gender?: 'male' | 'female';
    dateOfBirth?: string;
    age?: number;
    
    // 组织信息
    departmentId: string;
    departmentName?: string;
    departmentPath?: string;
    positionId: string;
    positionName?: string;
    positionLevel?: number;
    managerId?: string;
    managerName?: string;
    
    // 入职信息
    hireDate: string;
    yearsOfService?: number;
    employmentType?: 'full_time' | 'part_time' | 'contract' | 'intern';
    probationEndDate?: string;
    status: 'active' | 'inactive' | 'terminated' | 'suspended';
    
    // 联系信息
    contact?: {
        phone?: string;
        email?: string;
        address?: string;
        emergencyContact?: string;
        emergencyPhone?: string;
    };
    
    // 银行信息
    bankAccount?: {
        bankName?: string;
        accountNumber?: string;
        accountName?: string;
        branchName?: string;
    };
    
    // 薪资信息（可选，根据权限返回）
    salaryInfo?: {
        baseSalary?: number;
        totalAllowances?: number;
        socialInsuranceDeduction?: number;
        housingFundDeduction?: number;
        netSalary?: number;
    };
    
    // 统计信息
    statistics?: {
        totalSalaryPaid?: number;
        averageMonthlySalary?: number;
        lastSalaryDate?: string;
        totalBonusReceived?: number;
        attendanceDays?: number;
        leaveDays?: number;
    };
    
    // 系统信息
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
    version?: number;
}

/**
 * 员工列表DTO（简化版）
 */
export interface EmployeeListDTO {
    id: string;
    employeeCode: string;
    name: string;
    departmentName: string;
    positionName: string;
    hireDate: string;
    status: string;
    phone?: string;
    email?: string;
}

/**
 * 员工搜索条件
 */
export interface EmployeeSearchCriteria {
    // 基本搜索
    keyword?: string; // 搜索姓名、工号、手机号
    employeeCode?: string;
    name?: string;
    idNumber?: string;
    
    // 组织筛选
    departmentId?: string;
    departmentIds?: string[];
    positionId?: string;
    positionIds?: string[];
    managerId?: string;
    
    // 状态筛选
    status?: 'active' | 'inactive' | 'terminated' | 'suspended';
    statuses?: string[];
    employmentType?: 'full_time' | 'part_time' | 'contract' | 'intern';
    employmentTypes?: string[];
    
    // 日期筛选
    hireDateFrom?: string;
    hireDateTo?: string;
    birthDateFrom?: string;
    birthDateTo?: string;
    
    // 薪资筛选（需要权限）
    salaryMin?: number;
    salaryMax?: number;
    
    // 分页和排序
    page?: number;
    pageSize?: number;
    sortBy?: 'employeeCode' | 'name' | 'hireDate' | 'department' | 'position';
    sortOrder?: 'asc' | 'desc';
    
    // 包含关联数据
    includeContact?: boolean;
    includeBankAccount?: boolean;
    includeSalaryInfo?: boolean;
    includeStatistics?: boolean;
}

/**
 * 批量操作结果DTO
 */
export interface BatchOperationResultDTO {
    totalCount: number;
    successCount: number;
    failedCount: number;
    errors: Array<{
        index: number;
        id?: string;
        error: string;
        details?: any;
    }>;
    processedIds: string[];
    duration?: number;
}

/**
 * 员工调动记录DTO
 */
export interface EmployeeTransferRecordDTO {
    id: string;
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
    createdAt: string;
    createdBy: string;
}

/**
 * 员工权限DTO
 */
export interface EmployeePermissionsDTO {
    employeeId: string;
    roles: string[];
    permissions: string[];
    dataScopes: {
        departments: string[];
        teams: string[];
        self: boolean;
        subordinates: boolean;
    };
    menuAccess: string[];
    apiAccess: string[];
}

/**
 * 员工导入DTO
 */
export interface ImportEmployeeDTO extends CreateEmployeeDTO {
    rowIndex: number;
    validationErrors?: string[];
}

/**
 * 员工导出DTO
 */
export interface ExportEmployeeDTO {
    format: 'excel' | 'csv' | 'json';
    columns: string[];
    criteria?: EmployeeSearchCriteria;
    includeHeaders?: boolean;
    dateFormat?: string;
    numberFormat?: string;
}