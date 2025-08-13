/**
 * 简化的映射工具
 * 
 * 提供自动化的对象映射，减少手写转换代码
 * 符合务实DDD的原则
 */

/**
 * 映射配置
 */
export interface MapperConfig {
    // 字段重命名映射
    rename?: Record<string, string>;
    // 要排除的字段
    exclude?: string[];
    // 要包含的字段（如果指定，只包含这些字段）
    include?: string[];
    // 字段转换函数
    transform?: Record<string, (value: any) => any>;
    // 默认值
    defaults?: Record<string, any>;
    // 是否深拷贝
    deep?: boolean;
}

/**
 * 简单映射函数
 * 
 * @example
 * const dto = simpleMapper(entity, {
 *   rename: { employee_code: 'employeeCode' },
 *   exclude: ['password'],
 *   transform: { 
 *     hire_date: (date) => date.toISOString() 
 *   }
 * });
 */
export function simpleMapper<T>(
    source: any,
    config: MapperConfig = {}
): T {
    if (!source) return source;
    
    const {
        rename = {},
        exclude = [],
        include,
        transform = {},
        defaults = {},
        deep = false
    } = config;
    
    const result: any = {};
    
    // 处理包含字段
    const fieldsToProcess = include 
        ? include 
        : Object.keys(source).filter(key => !exclude.includes(key));
    
    for (const key of fieldsToProcess) {
        const targetKey = rename[key] || key;
        let value = source[key];
        
        // 应用转换函数
        if (transform[key]) {
            value = transform[key](value);
        } else if (deep && typeof value === 'object' && value !== null) {
            // 深拷贝对象
            value = Array.isArray(value) 
                ? [...value] 
                : { ...value };
        }
        
        result[targetKey] = value;
    }
    
    // 应用默认值
    for (const [key, defaultValue] of Object.entries(defaults)) {
        if (result[key] === undefined || result[key] === null) {
            result[key] = defaultValue;
        }
    }
    
    return result as T;
}

/**
 * 批量映射
 */
export function batchMapper<T>(
    sources: any[],
    config: MapperConfig = {}
): T[] {
    return sources.map(source => simpleMapper<T>(source, config));
}

/**
 * 双向映射配置
 */
export class BidirectionalMapper<TSource, TTarget> {
    constructor(
        private toTargetConfig: MapperConfig,
        private toSourceConfig?: MapperConfig
    ) {
        // 如果没有提供反向配置，自动生成
        if (!toSourceConfig && toTargetConfig.rename) {
            this.toSourceConfig = {
                ...toTargetConfig,
                rename: Object.entries(toTargetConfig.rename).reduce(
                    (acc, [key, value]) => ({ ...acc, [value]: key }),
                    {}
                )
            };
        }
    }
    
    toTarget(source: TSource): TTarget {
        return simpleMapper<TTarget>(source, this.toTargetConfig);
    }
    
    toSource(target: TTarget): TSource {
        return simpleMapper<TSource>(target, this.toSourceConfig);
    }
    
    toTargetBatch(sources: TSource[]): TTarget[] {
        return batchMapper<TTarget>(sources, this.toTargetConfig);
    }
    
    toSourceBatch(targets: TTarget[]): TSource[] {
        return batchMapper<TSource>(targets, this.toSourceConfig);
    }
}

/**
 * 创建类型安全的映射器
 */
export function createMapper<TSource, TTarget>(
    config: MapperConfig
): (source: TSource) => TTarget {
    return (source: TSource) => simpleMapper<TTarget>(source, config);
}

/**
 * 常用的数据库字段到前端字段的映射配置
 */
export const dbToFrontendConfig: MapperConfig = {
    rename: {
        'created_at': 'createdAt',
        'updated_at': 'updatedAt',
        'deleted_at': 'deletedAt',
        'employee_code': 'employeeCode',
        'id_number': 'idNumber',
        'department_id': 'departmentId',
        'position_id': 'positionId',
        'hire_date': 'hireDate',
        'birth_date': 'birthDate',
        'manager_id': 'managerId',
        'base_salary': 'baseSalary',
        'social_insurance_base': 'socialInsuranceBase',
        'housing_fund_base': 'housingFundBase',
        'bank_name': 'bankName',
        'account_number': 'accountNumber',
        'account_name': 'accountName',
        'branch_name': 'branchName',
        'emergency_contact': 'emergencyContact',
        'emergency_phone': 'emergencyPhone'
    },
    exclude: ['password', 'salt', 'refresh_token'],
    transform: {
        'hire_date': (date: string) => date ? new Date(date).toISOString().split('T')[0] : null,
        'birth_date': (date: string) => date ? new Date(date).toISOString().split('T')[0] : null
    }
};

/**
 * 前端字段到数据库字段的映射配置
 */
export const frontendToDbConfig: MapperConfig = {
    rename: Object.entries(dbToFrontendConfig.rename || {}).reduce(
        (acc, [key, value]) => ({ ...acc, [value]: key }),
        {}
    ),
    transform: {
        'hireDate': (date: string) => date ? new Date(date).toISOString() : null,
        'birthDate': (date: string) => date ? new Date(date).toISOString() : null
    }
};

/**
 * 创建员工映射器的快捷方法
 */
export const employeeMapper = new BidirectionalMapper(
    dbToFrontendConfig,
    frontendToDbConfig
);

/**
 * 部门映射器
 */
export const departmentMapper = createMapper<any, any>({
    rename: {
        'department_name': 'departmentName',
        'parent_id': 'parentId',
        'manager_id': 'managerId',
        'is_active': 'isActive'
    }
});

/**
 * 薪资映射器
 */
export const payrollMapper = createMapper<any, any>({
    rename: {
        'period_id': 'periodId',
        'employee_id': 'employeeId',
        'base_salary': 'baseSalary',
        'total_allowances': 'totalAllowances',
        'total_deductions': 'totalDeductions',
        'net_salary': 'netSalary',
        'payment_status': 'paymentStatus',
        'payment_date': 'paymentDate'
    },
    transform: {
        'payment_date': (date: string) => date ? new Date(date).toISOString().split('T')[0] : null
    }
});