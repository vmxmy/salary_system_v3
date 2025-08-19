/**
 * 保险类型枚举定义
 * 用于约束和标准化系统中的保险类型
 */

/**
 * 保险类型常量
 * 标准的五险一金 + 补充保险
 */
export const InsuranceType = {
  // 基本社会保险（五险）
  PENSION: 'pension',                 // 养老保险
  MEDICAL: 'medical',                 // 医疗保险
  UNEMPLOYMENT: 'unemployment',       // 失业保险
  WORK_INJURY: 'work_injury',        // 工伤保险
  MATERNITY: 'maternity',             // 生育保险
  
  // 住房公积金（一金）
  HOUSING_FUND: 'housing_fund',       // 住房公积金
  
  // 补充保险
  SERIOUS_ILLNESS: 'serious_illness', // 大病医疗
  OCCUPATIONAL_PENSION: 'occupational_pension' // 职业年金
} as const

// 定义 InsuranceType 类型
export type InsuranceTypeKey = typeof InsuranceType[keyof typeof InsuranceType];

/**
 * 保险类型中文名称映射
 */
export const InsuranceTypeNames: Record<InsuranceTypeKey, string> = {
  [InsuranceType.PENSION]: '养老保险',
  [InsuranceType.MEDICAL]: '医疗保险',
  [InsuranceType.UNEMPLOYMENT]: '失业保险',
  [InsuranceType.WORK_INJURY]: '工伤保险',
  [InsuranceType.MATERNITY]: '生育保险',
  [InsuranceType.HOUSING_FUND]: '住房公积金',
  [InsuranceType.SERIOUS_ILLNESS]: '大病医疗',
  [InsuranceType.OCCUPATIONAL_PENSION]: '职业年金',
};

/**
 * 保险缴费方配置
 * 定义哪些保险有个人部分，哪些有单位部分
 */
export const InsurancePayerConfig: Record<InsuranceTypeKey, {
  hasEmployee: boolean;  // 是否有个人缴纳
  hasEmployer: boolean;  // 是否有单位缴纳
}> = {
  [InsuranceType.PENSION]: { hasEmployee: true, hasEmployer: true },
  [InsuranceType.MEDICAL]: { hasEmployee: true, hasEmployer: true },
  [InsuranceType.UNEMPLOYMENT]: { hasEmployee: true, hasEmployer: true },
  [InsuranceType.WORK_INJURY]: { hasEmployee: false, hasEmployer: true }, // 工伤保险仅单位缴纳
  [InsuranceType.MATERNITY]: { hasEmployee: false, hasEmployer: true },   // 生育保险仅单位缴纳
  [InsuranceType.HOUSING_FUND]: { hasEmployee: true, hasEmployer: true },
  [InsuranceType.SERIOUS_ILLNESS]: { hasEmployee: true, hasEmployer: true },
  [InsuranceType.OCCUPATIONAL_PENSION]: { hasEmployee: true, hasEmployer: true },
};

/**
 * 薪资组件名称标准化
 * 用于生成统一的 salary_components 名称
 */
export function getStandardComponentName(
  insuranceType: InsuranceTypeKey,
  isEmployer: boolean
): string {
  const baseName = InsuranceTypeNames[insuranceType];
  return isEmployer 
    ? `${baseName}(单位)` 
    : `${baseName}(个人)`;
}

/**
 * 从组件名称解析保险类型
 */
export function parseInsuranceFromComponentName(componentName: string): {
  type: InsuranceTypeKey | null;
  isEmployer: boolean;
} {
  // 移除后缀
  const cleanName = componentName
    .replace('(个人)', '')
    .replace('(单位)', '')
    .replace('个人应缴费额', '')
    .replace('单位应缴费额', '')
    .trim();
  
  // 查找匹配的保险类型
  const type = Object.entries(InsuranceTypeNames).find(
    ([_, name]) => name === cleanName
  )?.[0] as InsuranceTypeKey | undefined;
  
  // 判断是否为单位缴纳
  const isEmployer = componentName.includes('单位');
  
  return {
    type: type || null,
    isEmployer
  };
}

/**
 * 保险类型分组
 * 用于UI展示时的分组
 */
export const InsuranceGroups = {
  基本社保: [
    InsuranceType.PENSION,
    InsuranceType.MEDICAL,
    InsuranceType.UNEMPLOYMENT,
    InsuranceType.WORK_INJURY,
    InsuranceType.MATERNITY,
  ],
  公积金: [
    InsuranceType.HOUSING_FUND,
  ],
  补充保险: [
    InsuranceType.SERIOUS_ILLNESS,
    InsuranceType.OCCUPATIONAL_PENSION,
  ],
};

/**
 * 获取所有需要个人缴纳的保险类型
 */
export function getEmployeeInsuranceTypes(): InsuranceTypeKey[] {
  return Object.entries(InsurancePayerConfig)
    .filter(([_, config]) => config.hasEmployee)
    .map(([type]) => type as InsuranceTypeKey);
}

/**
 * 获取所有需要单位缴纳的保险类型
 */
export function getEmployerInsuranceTypes(): InsuranceTypeKey[] {
  return Object.entries(InsurancePayerConfig)
    .filter(([_, config]) => config.hasEmployer)
    .map(([type]) => type as InsuranceTypeKey);
}

/**
 * 验证保险类型是否有效
 */
export function isValidInsuranceType(value: string): value is InsuranceTypeKey {
  return Object.values(InsuranceType).includes(value as InsuranceTypeKey);
}