// 表格配置常量
export const TABLE_CONFIGS = {
  'view_payroll_summary': {
    displayName: '薪资汇总',
    primaryKey: 'payroll_id',
    defaultSort: { field: 'actual_pay_date', direction: 'desc' as const },
    defaultFields: [
      'employee_name', 
      'department_name', 
      'position_name',
      'actual_pay_date',
      'gross_pay', 
      'total_deductions',
      'net_pay',
      'payroll_status'
    ],
    fieldLabels: {
      'payroll_id': '薪资ID',
      'employee_name': '员工姓名',
      'department_name': '部门',
      'position_name': '职位',
      'actual_pay_date': '实际发薪日期',
      'scheduled_pay_date': '计划发薪日期',
      'gross_pay': '应发工资',
      'total_deductions': '扣除合计',
      'net_pay': '实发工资',
      'payroll_status': '薪资状态',
      'period_code': '薪资周期',
      'period_name': '周期名称'
    },
    fieldTypes: {
      'payroll_id': 'text',
      'employee_name': 'text',
      'department_name': 'text',
      'position_name': 'text',
      'actual_pay_date': 'date',
      'scheduled_pay_date': 'date',
      'gross_pay': 'currency',
      'total_deductions': 'currency',
      'net_pay': 'currency',
      'payroll_status': 'select',
      'period_code': 'text',
      'period_name': 'text'
    }
  },
  'view_employee_basic_info': {
    displayName: '员工管理',
    primaryKey: 'employee_id',
    defaultSort: { field: 'employee_name', direction: 'asc' as const },
    defaultFields: [
      'employee_name',
      'id_number',
      'department_name',
      'position_name',
      'employment_status',
      'hire_date',
      'mobile_phone'
    ],
    fieldLabels: {
      'employee_id': '员工ID',
      'employee_name': '员工姓名',
      'id_number': '身份证号',
      'department_name': '部门',
      'position_name': '职位',
      'employment_status': '雇佣状态',
      'hire_date': '入职日期',
      'mobile_phone': '手机号码',
      'email': '邮箱',
      'gender': '性别',
      'birth_date': '出生日期'
    },
    fieldTypes: {
      'employee_id': 'text',
      'employee_name': 'text',
      'id_number': 'text',
      'department_name': 'text',
      'position_name': 'text',
      'employment_status': 'select',
      'hire_date': 'date',
      'mobile_phone': 'phone',
      'email': 'email',
      'gender': 'select',
      'birth_date': 'date'
    }
  },
  'payroll': {
    displayName: '薪资管理',
    primaryKey: 'payroll_id',
    defaultSort: { field: 'actual_pay_date', direction: 'desc' as const },
    defaultFields: [
      'employee_name', 
      'department_name', 
      'position_name',
      'actual_pay_date',
      'gross_pay', 
      'total_deductions',
      'net_pay',
      'status'
    ],
    fieldLabels: {
      'payroll_id': '薪资ID',
      'employee_name': '员工姓名',
      'department_name': '部门',
      'position_name': '职位',
      'actual_pay_date': '实际发薪日期',
      'scheduled_pay_date': '计划发薪日期',
      'pay_date': '支付日期',
      'gross_pay': '应发工资',
      'total_deductions': '扣除合计',
      'net_pay': '实发工资',
      'status': '薪资状态',
      'period_code': '薪资周期',
      'period_name': '周期名称'
    },
    fieldTypes: {
      'payroll_id': 'text',
      'employee_name': 'text',
      'department_name': 'text',
      'position_name': 'text',
      'actual_pay_date': 'date',
      'scheduled_pay_date': 'date',
      'pay_date': 'date',
      'gross_pay': 'currency',
      'total_deductions': 'currency',
      'net_pay': 'currency',
      'status': 'select',
      'period_code': 'text',
      'period_name': 'text'
    }
  }
};

export type TableConfigKey = keyof typeof TABLE_CONFIGS;
export type TableConfig = typeof TABLE_CONFIGS[TableConfigKey];