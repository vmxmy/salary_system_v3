import { supabase } from '@/lib/supabase';
import type { ValidationRule, ExcelDataRow, ImportConfig } from '../types';
import { getBasicValidationRules } from '../constants';

// 验证规则接口（扩展版本）
interface ExtendedValidationRule {
  field: string;
  required?: boolean;
  type?: 'number' | 'date' | 'email' | 'idcard';
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: any, row: ExcelDataRow) => string | null;
}

/**
 * 动态获取验证规则
 */
export const getValidationRules = async (): Promise<Record<string, ExtendedValidationRule[]>> => {
  try {
    console.log('🔍 正在动态获取验证规则...');
    
    const { data: rules, error } = await supabase
      .from('import_validation_rules')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.warn('⚠️ 无法获取动态验证规则，使用基础规则:', error);
      return convertBasicRules();
    }

    if (!rules || rules.length === 0) {
      console.log('📋 没有找到动态验证规则，使用基础规则');
      return convertBasicRules();
    }

    console.log(`✅ 成功获取 ${rules.length} 条验证规则`);
    
    // 将数据库规则转换为验证规则格式
    const validationRules: Record<string, ExtendedValidationRule[]> = {};
    
    rules.forEach(rule => {
      const category = rule.category || 'default';
      if (!validationRules[category]) {
        validationRules[category] = [];
      }
      
      validationRules[category].push({
        field: rule.field_name,
        required: rule.is_required,
        type: rule.validation_type,
        min: rule.min_value,
        max: rule.max_value,
        pattern: rule.pattern ? new RegExp(rule.pattern) : undefined
      });
    });
    
    return validationRules;
  } catch (error) {
    console.error('❌ 获取验证规则时发生错误:', error);
    return convertBasicRules();
  }
};

/**
 * 转换基础验证规则为扩展格式
 */
const convertBasicRules = (): Record<string, ExtendedValidationRule[]> => {
  return {
    earnings: [
      { field: '员工姓名', required: true },
    ],
    deductions: [
      { field: '员工姓名', required: true },
    ],
    contribution_bases: [
      { field: '员工姓名', required: true },
    ],
    category_assignment: [
      { field: '员工姓名', required: true },
      { field: '人员类别', required: true }
    ],
    job_assignment: [
      { field: '员工姓名', required: true },
      { field: '部门', required: true },
      { field: '职位', required: true }
    ]
  };
};

/**
 * 验证单个字段
 */
export const validateField = (value: any, rule: ExtendedValidationRule): string | null => {
  // 检查必填
  if (rule.required && (!value || value === '')) {
    return `${rule.field}不能为空`;
  }

  // 如果值为空且非必填，跳过后续验证
  if (!value || value === '') return null;

  // 类型验证
  switch (rule.type) {
    case 'number':
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `${rule.field}必须是有效的数字`;
      }
      if (rule.min !== undefined && numValue < rule.min) {
        return `${rule.field}不能小于${rule.min}`;
      }
      if (rule.max !== undefined && numValue > rule.max) {
        return `${rule.field}不能大于${rule.max}`;
      }
      break;
    
    case 'date':
      if (!Date.parse(value)) {
        return `${rule.field}必须是有效的日期格式`;
      }
      break;
    
    case 'email':
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        return `${rule.field}必须是有效的邮箱地址`;
      }
      break;
    
    case 'idcard':
      const idCardPattern = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}(\d|X)$/i;
      if (!idCardPattern.test(value)) {
        return `${rule.field}必须是有效的身份证号码`;
      }
      break;
  }

  // 正则表达式验证
  if (rule.pattern && !rule.pattern.test(value)) {
    return `${rule.field}格式不正确`;
  }

  // 自定义验证
  if (rule.customValidator) {
    return rule.customValidator(value, {} as ExcelDataRow);
  }

  return null;
};

/**
 * 验证导入数据
 */
export const validateImportData = async (
  data: ExcelDataRow[],
  config: ImportConfig
): Promise<{ isValid: boolean; errors: any[]; warnings: any[] }> => {
  console.log('🔍 开始数据验证...');
  console.log(`📊 待验证数据行数: ${data.length}`);
  console.log('⚙️ 验证配置:', config);
  
  const errors: any[] = [];
  const warnings: any[] = [];
  
  // 动态获取验证规则
  const validationRules = await getValidationRules();
  console.log('🛠️ 动态获取的验证规则:', validationRules);
  
  // 根据选择的数据组进行验证
  const dataGroups = Array.isArray(config.dataGroup) ? config.dataGroup : [config.dataGroup];
  console.log('📋 数据组类型:', dataGroups);
  
  dataGroups.forEach(group => {
    const groupName = group.toLowerCase().replace('_', '');
    const rules = validationRules[groupName] || validationRules[group] || [];
    
    console.log(`🔎 验证数据组: ${group}`);
    console.log(`📝 找到验证规则: ${rules.length} 条`);
    
    if (rules.length === 0) {
      console.log(`⚠️ 数据组 "${group}" 没有找到验证规则`);
    }
    
    data.forEach((row, index) => {
      console.log(`🔍 验证第 ${index + 1} 行数据...`);
      
      rules.forEach(rule => {
        // 支持多个可能的字段名
        const possibleFields = [
          rule.field,
          rule.field.replace('_', ''),
          rule.field.toLowerCase(),
          // 英文字段名映射
          rule.field === '员工姓名' ? 'employee_name' : null,
          rule.field === '基本工资' ? 'basic_salary' : null,
          rule.field === '岗位工资' ? 'position_salary' : null,
          rule.field === '绩效奖金' ? 'performance_bonus' : null,
          rule.field === '人员类别' ? 'category_name' : null,
          rule.field === '部门' ? 'department_name' : null,
          rule.field === '职位' ? 'position_name' : null,
        ].filter(Boolean);
        
        let value = null;
        let fieldName = rule.field;
        
        for (const field of possibleFields) {
          if (field && row[field] !== undefined) {
            value = row[field];
            fieldName = field;
            break;
          }
        }
        
        console.log(`  📝 验证字段: ${rule.field} -> ${fieldName} = ${value}`);
        
        const validationError = validateField(value, rule);
        if (validationError) {
          errors.push({
            row: index + 2, // Excel行号从2开始（去掉标题行）
            field: fieldName,
            message: validationError
          });
          console.log(`  ❌ 验证失败: ${validationError}`);
        } else {
          console.log(`  ✅ 验证通过`);
        }
      });
    });
  });
  
  console.log(`🎯 验证完成: ${errors.length} 个错误, ${warnings.length} 个警告`);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};