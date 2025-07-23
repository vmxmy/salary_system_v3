import { z } from 'zod';

// Constants for validation
const MIN_RATE = 0;
const MAX_RATE = 1; // 100%
const MIN_AMOUNT = 0;
const MAX_AMOUNT = 999999999; // Reasonable maximum
const MAX_STRING_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 2000;

// Tax type enum
export const TaxTypeEnum = z.enum([
  'income_tax',
  'year_end_bonus',
  'labor_income',
  'author_income'
]);

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

// Monetary value validation
const monetaryValue = z.number()
  .nonnegative('金额不能为负数')
  .finite('金额必须是有效数字')
  .refine(val => val <= MAX_AMOUNT, {
    message: `金额不能超过 ${MAX_AMOUNT.toLocaleString()}`
  });

// Rate validation (0-1 representing 0-100%)
const rateValue = z.number()
  .min(MIN_RATE, '税率不能小于0')
  .max(MAX_RATE, '税率不能大于100%')
  .finite('税率必须是有效数字');

// Date validation
const dateValidation = z.string()
  .refine(val => !val || !isNaN(Date.parse(val)), {
    message: '无效的日期格式'
  });

// Tax bracket schema
export const taxBracketSchema = z.object({
  min: monetaryValue.optional().nullable(),
  max: monetaryValue.optional().nullable(),
  rate: rateValue.optional().nullable(),
  deduction: monetaryValue.optional().nullable()
}).refine(data => {
  if (data.min !== null && data.min !== undefined && 
      data.max !== null && data.max !== undefined) {
    return data.min <= data.max;
  }
  return true;
}, {
  message: '最小值必须小于或等于最大值',
  path: ['max']
});

// Special deduction item schema
const specialDeductionItemSchema = z.object({
  max: monetaryValue.optional(),
  rate: rateValue.optional()
});

// Special deductions schema
const specialDeductionsSchema = z.object({
  child_education: specialDeductionItemSchema.optional(),
  continuing_education: specialDeductionItemSchema.optional(),
  medical: specialDeductionItemSchema.optional(),
  housing_loan: specialDeductionItemSchema.optional(),
  housing_rent: specialDeductionItemSchema.optional(),
  elderly_care: specialDeductionItemSchema.optional()
}).optional();

// Tax exemptions schema
export const taxExemptionsSchema = z.object({
  basic: monetaryValue.optional(),
  special_deductions: specialDeductionsSchema
}).optional();

// Tax configuration creation schema
export const taxConfigCreateSchema = z.object({
  tax_type: TaxTypeEnum,
  region: safeString(50).default('default'),
  description: safeString(MAX_DESCRIPTION_LENGTH).optional(),
  brackets: z.array(taxBracketSchema)
    .min(1, '至少需要一个税率级数')
    .max(20, '税率级数不能超过20个'),
  exemptions: taxExemptionsSchema,
  is_active: z.boolean(),
  effective_from: dateValidation,
  effective_to: dateValidation.optional()
}).refine(data => !data.effective_to || data.effective_from <= data.effective_to, {
  message: '生效日期必须早于或等于失效日期',
  path: ['effective_to']
});

// Tax configuration update schema (all fields optional)
export const taxConfigUpdateSchema = taxConfigCreateSchema.partial();

// Search/filter validation schema
export const taxConfigFilterSchema = z.object({
  search: safeString(200).optional(),
  tax_type: TaxTypeEnum.optional(),
  region: safeString(50).optional(),
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
export const taxConfigResponseSchema = z.object({
  id: z.string().uuid(),
  tax_type: TaxTypeEnum,
  region: z.string(),
  description: z.string().optional().nullable(),
  brackets: z.array(taxBracketSchema),
  exemptions: taxExemptionsSchema.nullable(),
  is_active: z.boolean(),
  effective_from: z.string(),
  effective_to: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().optional().nullable(),
  updated_by: z.string().optional().nullable()
});

// List response validation
export const taxConfigListResponseSchema = z.object({
  data: z.array(taxConfigResponseSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().nonnegative(),
  pageSize: z.number().int().positive()
});

// Type exports
export type TaxConfigCreate = z.infer<typeof taxConfigCreateSchema>;
export type TaxConfigUpdate = z.infer<typeof taxConfigUpdateSchema>;
export type TaxConfigFilter = z.infer<typeof taxConfigFilterSchema>;
export type TaxConfigResponse = z.infer<typeof taxConfigResponseSchema>;
export type TaxConfigListResponse = z.infer<typeof taxConfigListResponseSchema>;
export type TaxBracket = z.infer<typeof taxBracketSchema>;
export type TaxExemptions = z.infer<typeof taxExemptionsSchema>;