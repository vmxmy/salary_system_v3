-- 创建示例报表模板数据
-- 用于测试批量报表生成功能

-- 插入月度标准报表套装
INSERT INTO report_templates (
  template_name, 
  template_key, 
  description, 
  category, 
  config, 
  field_mappings, 
  output_formats, 
  is_active
) VALUES 

-- 1. 月度薪资汇总表
(
  '月度薪资汇总表',
  'monthly-payroll-summary',
  '每月薪资发放的汇总统计报表，包含应发、实发、扣款等核心数据',
  'payroll',
  '{
    "tags": [
      {"key": "monthly", "name": "月度报表", "color": "badge-info", "icon": "📅"},
      {"key": "summary", "name": "汇总报表", "color": "badge-primary", "icon": "📊"},
      {"key": "required", "name": "必需报表", "color": "badge-error", "icon": "❗"}
    ],
    "group": {
      "id": "monthly-standard", 
      "name": "月度标准报表套装", 
      "description": "每月必须生成的标准报表集合",
      "priority": 1,
      "isDefault": true
    },
    "batchGeneration": {
      "enabled": true,
      "priority": 1,
      "delay": 1000
    },
    "usage": {
      "dataSources": ["view_payroll_summary"],
      "periodTypes": ["monthly"],
      "recommendedFormats": ["xlsx", "pdf"]
    },
    "display": {
      "icon": "📊",
      "theme": "primary",
      "showInQuickSelect": true,
      "sortWeight": 1
    }
  }'::jsonb,
  '[
    {"field_key": "employee_name", "display_name": "员工姓名", "field_type": "string", "visible": true, "sort_order": 1},
    {"field_key": "department_name", "display_name": "部门", "field_type": "string", "visible": true, "sort_order": 2},
    {"field_key": "position_name", "display_name": "职位", "field_type": "string", "visible": true, "sort_order": 3},
    {"field_key": "gross_pay", "display_name": "应发工资", "field_type": "currency", "visible": true, "sort_order": 4},
    {"field_key": "total_deductions", "display_name": "扣款总额", "field_type": "currency", "visible": true, "sort_order": 5},
    {"field_key": "net_pay", "display_name": "实发工资", "field_type": "currency", "visible": true, "sort_order": 6},
    {"field_key": "payroll_status", "display_name": "状态", "field_type": "string", "visible": true, "sort_order": 7}
  ]'::jsonb,
  ARRAY['xlsx', 'pdf'],
  true
),

-- 2. 月度薪资明细表
(
  '月度薪资明细表',
  'monthly-payroll-detail',
  '详细的薪资发放明细，包含各项薪资组成部分',
  'payroll',
  '{
    "tags": [
      {"key": "monthly", "name": "月度报表", "color": "badge-info", "icon": "📅"},
      {"key": "detail", "name": "明细报表", "color": "badge-secondary", "icon": "📋"},
      {"key": "required", "name": "必需报表", "color": "badge-error", "icon": "❗"}
    ],
    "group": {
      "id": "monthly-standard", 
      "name": "月度标准报表套装", 
      "description": "每月必须生成的标准报表集合",
      "priority": 1,
      "isDefault": true
    },
    "batchGeneration": {
      "enabled": true,
      "priority": 2,
      "delay": 1200
    },
    "usage": {
      "dataSources": ["view_payroll_unified"],
      "periodTypes": ["monthly"],
      "recommendedFormats": ["xlsx"]
    },
    "display": {
      "icon": "📋",
      "theme": "secondary",
      "showInQuickSelect": true,
      "sortWeight": 2
    }
  }'::jsonb,
  '[
    {"field_key": "employee_name", "display_name": "员工姓名", "field_type": "string", "visible": true, "sort_order": 1},
    {"field_key": "department_name", "display_name": "部门", "field_type": "string", "visible": true, "sort_order": 2},
    {"field_key": "category_name", "display_name": "人员类别", "field_type": "string", "visible": true, "sort_order": 3},
    {"field_key": "gross_pay", "display_name": "应发工资", "field_type": "currency", "visible": true, "sort_order": 4},
    {"field_key": "net_pay", "display_name": "实发工资", "field_type": "currency", "visible": true, "sort_order": 5}
  ]'::jsonb,
  ARRAY['xlsx'],
  true
),

-- 3. 部门薪资统计表
(
  '部门薪资统计表',
  'department-payroll-stats',
  '按部门汇总的薪资统计报表',
  'payroll',
  '{
    "tags": [
      {"key": "monthly", "name": "月度报表", "color": "badge-info", "icon": "📅"},
      {"key": "analysis", "name": "分析报表", "color": "badge-accent", "icon": "📈"},
      {"key": "optional", "name": "可选报表", "color": "badge-ghost", "icon": "💡"}
    ],
    "group": {
      "id": "monthly-detailed", 
      "name": "月度详细报表套装", 
      "description": "包含详细分析的月度报表集合",
      "priority": 2
    },
    "batchGeneration": {
      "enabled": true,
      "priority": 3,
      "delay": 800
    },
    "usage": {
      "dataSources": ["view_payroll_summary"],
      "periodTypes": ["monthly"],
      "recommendedFormats": ["xlsx", "pdf"]
    },
    "display": {
      "icon": "🏢",
      "theme": "accent",
      "showInQuickSelect": true,
      "sortWeight": 3
    }
  }'::jsonb,
  '[
    {"field_key": "department_name", "display_name": "部门名称", "field_type": "string", "visible": true, "sort_order": 1},
    {"field_key": "employee_count", "display_name": "员工人数", "field_type": "number", "visible": true, "sort_order": 2},
    {"field_key": "total_gross_pay", "display_name": "应发工资总额", "field_type": "currency", "visible": true, "sort_order": 3},
    {"field_key": "total_net_pay", "display_name": "实发工资总额", "field_type": "currency", "visible": true, "sort_order": 4},
    {"field_key": "avg_gross_pay", "display_name": "平均应发工资", "field_type": "currency", "visible": true, "sort_order": 5}
  ]'::jsonb,
  ARRAY['xlsx', 'pdf'],
  true
),

-- 4. 合规报表 - 社保公积金汇总
(
  '社保公积金汇总表',
  'insurance-fund-summary',
  '社会保险和住房公积金的汇总报表，用于向相关部门报送',
  'payroll',
  '{
    "tags": [
      {"key": "monthly", "name": "月度报表", "color": "badge-info", "icon": "📅"},
      {"key": "compliance", "name": "合规报表", "color": "badge-warning", "icon": "⚖️"},
      {"key": "external", "name": "对外报送", "color": "badge-error", "icon": "📤"}
    ],
    "group": {
      "id": "compliance", 
      "name": "合规报表套装", 
      "description": "监管部门要求的合规报表集合",
      "priority": 3
    },
    "batchGeneration": {
      "enabled": true,
      "priority": 4,
      "delay": 1500
    },
    "usage": {
      "dataSources": ["view_payroll_summary"],
      "periodTypes": ["monthly"],
      "recommendedFormats": ["xlsx", "csv"]
    },
    "display": {
      "icon": "⚖️",
      "theme": "warning",
      "showInQuickSelect": true,
      "sortWeight": 4
    }
  }'::jsonb,
  '[
    {"field_key": "employee_name", "display_name": "员工姓名", "field_type": "string", "visible": true, "sort_order": 1},
    {"field_key": "id_number", "display_name": "身份证号", "field_type": "string", "visible": true, "sort_order": 2},
    {"field_key": "department_name", "display_name": "部门", "field_type": "string", "visible": true, "sort_order": 3},
    {"field_key": "gross_pay", "display_name": "缴费基数", "field_type": "currency", "visible": true, "sort_order": 4}
  ]'::jsonb,
  ARRAY['xlsx', 'csv'],
  true
),

-- 5. 管理层报表 - 薪资成本分析
(
  '薪资成本分析表',
  'payroll-cost-analysis',
  '面向管理层的薪资成本分析报表',
  'payroll',
  '{
    "tags": [
      {"key": "monthly", "name": "月度报表", "color": "badge-info", "icon": "📅"},
      {"key": "analysis", "name": "分析报表", "color": "badge-accent", "icon": "📈"},
      {"key": "internal", "name": "内部使用", "color": "badge-neutral", "icon": "🏢"}
    ],
    "group": {
      "id": "management", 
      "name": "管理层报表套装", 
      "description": "面向管理层的分析报表集合",
      "priority": 4
    },
    "batchGeneration": {
      "enabled": true,
      "priority": 5,
      "delay": 2000
    },
    "usage": {
      "dataSources": ["view_payroll_summary"],
      "periodTypes": ["monthly"],
      "recommendedFormats": ["xlsx", "pdf"]
    },
    "display": {
      "icon": "💼",
      "theme": "primary",
      "showInQuickSelect": false,
      "sortWeight": 5
    }
  }'::jsonb,
  '[
    {"field_key": "department_name", "display_name": "部门", "field_type": "string", "visible": true, "sort_order": 1},
    {"field_key": "total_cost", "display_name": "总成本", "field_type": "currency", "visible": true, "sort_order": 2},
    {"field_key": "cost_per_employee", "display_name": "人均成本", "field_type": "currency", "visible": true, "sort_order": 3},
    {"field_key": "cost_ratio", "display_name": "成本占比", "field_type": "number", "visible": true, "sort_order": 4}
  ]'::jsonb,
  ARRAY['xlsx', 'pdf'],
  true
);

-- 验证插入的数据
SELECT 
  template_name, 
  template_key, 
  category,
  (config->>'group')::jsonb->>'name' as group_name,
  (config->'batchGeneration'->>'enabled')::boolean as batch_enabled,
  array_length(output_formats, 1) as format_count,
  is_active
FROM report_templates 
WHERE category = 'payroll'
ORDER BY (config->'group'->>'priority')::int, (config->'batchGeneration'->>'priority')::int;