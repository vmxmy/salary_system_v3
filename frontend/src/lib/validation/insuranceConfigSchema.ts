import { z } from 'zod';

// Constants for validation
const MIN_RATE = 0;
const MAX_RATE = 1; // 100%
const MIN_BASE = 0;
const MAX_BASE = 999999999; // Reasonable maximum
const MAX_STRING_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 2000;

// Insurance type enum
export const InsuranceTypeEnum = z.enum(['social_insurance', 'housing_fund']);

// Base validation for monetary values
const monetaryValue = z.number()
  .nonnegative('金额不能为负数')
  .finite('金额必须是有效数字')
  .refine(val => val <= MAX_BASE, {
    message: `金额不能超过 ${MAX_BASE.toLocaleString()}`
  });

// Rate validation (0-1 representing 0-100%)
const rateValue = z.number()
  .min(MIN_RATE, '费率不能小于0')
  .max(MAX_RATE, '费率不能大于100%')
  .finite('费率必须是有效数字');

// Safe string validation with XSS prevention
const safeString = (maxLength: number = MAX_STRING_LENGTH) => 
  z.string()
    .max(maxLength, `字符串长度不能超过 ${maxLength}`)
    .refine(val => !/<[^>]*>/g.test(val), {
      message: '输入包含不允许的HTML标签'
    })
    .refine(val => !/[<>'"]/g.test(val), {
      message: '输入包含不允许的特殊字符'
    });

// Code validation - alphanumeric with underscores only
const codeValidation = z.string()
  .min(1, '代码不能为空')
  .max(50, '代码长度不能超过50个字符')
  .regex(/^[a-zA-Z0-9_]+$/, '代码只能包含字母、数字和下划线');

// Date validation
const dateValidation = z.string()
  .refine(val => !val || !isNaN(Date.parse(val)), {
    message: '无效的日期格式'
  });

// Personnel categories validation
const personnelCategoriesValidation = z.array(z.string().uuid('无效的人员类别ID'))
  .max(100, '人员类别不能超过100个')
  .optional()
  .nullable();

// Insurance configuration creation schema
export const insuranceConfigCreateSchema = z.object({
  type: InsuranceTypeEnum,
  code: codeValidation,
  name: safeString(200).min(1, '名称不能为空'),
  description: safeString(MAX_DESCRIPTION_LENGTH).optional(),
  employee_rate: rateValue,
  employer_rate: rateValue,
  min_base: monetaryValue,
  max_base: monetaryValue,
  effective_from: dateValidation,
  effective_to: dateValidation.optional(),
  applicable_personnel_categories: personnelCategoriesValidation,
  is_active: z.boolean()
}).refine(data => !data.effective_to || data.effective_from <= data.effective_to, {
  message: '生效日期必须早于或等于失效日期',
  path: ['effective_to']
}).refine(data => data.min_base <= data.max_base, {
  message: '最小基数必须小于或等于最大基数',
  path: ['max_base']
});

// Insurance configuration update schema (all fields optional)
export const insuranceConfigUpdateSchema = insuranceConfigCreateSchema.partial();

// Search/filter validation schema
export const insuranceConfigFilterSchema = z.object({
  search: safeString(200).optional(),
  type: InsuranceTypeEnum.optional(),
  is_active: z.boolean().optional(),
  effective_date: dateValidation.optional(),
  page: z.number().int().nonnegative().optional(),
  pageSize: z.number().int().min(1).max(100).optional()
});

// Bulk operation validation
export const bulkOperationSchema = z.object({
  ids: z.array(z.string().uuid('无效的配置ID'))
    .min(1, '至少选择一个配置')
    .max(1000, '批量操作不能超过1000个项目')
});

// API response validation
export const insuranceConfigResponseSchema = z.object({
  id: z.string().uuid(),
  type: InsuranceTypeEnum,
  code: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  employee_rate: z.number(),
  employer_rate: z.number(),
  min_base: z.number(),
  max_base: z.number(),
  applicable_personnel_categories: z.array(z.string()).nullable(),
  config_name: z.string().optional(),
  is_active: z.boolean(),
  effective_from: z.string(),
  effective_to: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().optional().nullable(),
  updated_by: z.string().optional().nullable()
});

// List response validation
export const insuranceConfigListResponseSchema = z.object({
  data: z.array(insuranceConfigResponseSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().nonnegative(),
  pageSize: z.number().int().positive()
});

// Type exports
export type InsuranceConfigCreate = z.infer<typeof insuranceConfigCreateSchema>;
export type InsuranceConfigUpdate = z.infer<typeof insuranceConfigUpdateSchema>;
export type InsuranceConfigFilter = z.infer<typeof insuranceConfigFilterSchema>;
export type InsuranceConfigResponse = z.infer<typeof insuranceConfigResponseSchema>;
export type InsuranceConfigListResponse = z.infer<typeof insuranceConfigListResponseSchema>;