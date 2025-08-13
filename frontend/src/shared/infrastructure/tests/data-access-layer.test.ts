/**
 * 数据访问抽象层测试
 * 
 * 验证Repository、Mapper、Domain实体和服务集成的正确实现
 */

import { 
  Employee, 
  EmploymentStatus, 
  Gender 
} from '../../../modules/payroll-import/domain/entities/Employee';
import { 
  Payroll, 
  PayrollStatus, 
  PayrollComponentType 
} from '../../../modules/payroll-import/domain/entities/Payroll';
import { EmployeeMapper } from '../../../modules/payroll-import/infrastructure/mappers/EmployeeMapper';
import { PayrollMapper } from '../../../modules/payroll-import/infrastructure/mappers/PayrollMapper';
import { SupabaseServiceIntegration } from '../integration/SupabaseServiceIntegration';

// ==================== 测试用例定义 ====================

/**
 * 模拟Supabase数据
 */
const mockEmployeeRow = {
  id: 'emp-123',
  employee_name: '张三',
  id_number: '110101199001011234',
  employment_status: 'active',
  hire_date: '2023-01-15',
  date_of_birth: '1990-01-01',
  gender: 'male',
  manager_id: null,
  user_id: null,
  termination_date: null,
  created_at: '2023-01-15T08:00:00Z',
  updated_at: '2023-01-15T08:00:00Z'
};

const mockPayrollRow = {
  id: 'pay-456',
  employee_id: 'emp-123',
  pay_period_start: '2023-01-01',
  pay_period_end: '2023-01-31',
  pay_date: '2023-02-05',
  status: 'draft',
  notes: '测试薪资记录',
  gross_pay: 10000,
  net_pay: 8500,
  total_deductions: 1500,
  created_at: '2023-02-01T08:00:00Z',
  updated_at: '2023-02-01T08:00:00Z'
};

// ==================== 测试用例 ====================

/**
 * 运行所有数据访问层测试
 */
export async function runDataAccessLayerTests(): Promise<boolean> {
  console.log('🧪 Running Data Access Layer Tests...');

  try {
    // 测试Employee实体和映射器
    await testEmployeeEntityAndMapper();
    console.log('✅ Employee Entity and Mapper tests passed');

    // 测试Payroll实体和映射器
    await testPayrollEntityAndMapper();
    console.log('✅ Payroll Entity and Mapper tests passed');

    // 测试服务集成
    await testServiceIntegration();
    console.log('✅ Service Integration tests passed');

    // 测试业务规则
    await testBusinessRules();
    console.log('✅ Business Rules tests passed');

    // 测试导入映射器
    await testImportMappers();
    console.log('✅ Import Mappers tests passed');

    console.log('🎉 All data access layer tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Data access layer tests failed:', error);
    return false;
  }
}

/**
 * 测试Employee实体和映射器
 */
async function testEmployeeEntityAndMapper(): Promise<void> {
  const mapper = new EmployeeMapper();

  // 测试从数据库行转换为Domain实体
  const employee = mapper.toDomain(mockEmployeeRow);

  // 验证基本属性
  if (employee.employeeName !== '张三') {
    throw new Error('Employee name mapping failed');
  }

  if (employee.idNumber !== '110101199001011234') {
    throw new Error('ID number mapping failed');
  }

  if (employee.employmentStatus !== EmploymentStatus.ACTIVE) {
    throw new Error('Employment status mapping failed');
  }

  if (employee.gender !== Gender.MALE) {
    throw new Error('Gender mapping failed');
  }

  // 测试验证
  const validation = employee.validate();
  if (!validation.isValid) {
    throw new Error(`Employee validation failed: ${validation.firstError}`);
  }

  // 测试业务方法
  employee.updateBasicInfo('李四', undefined, Gender.FEMALE);
  if (employee.employeeName !== '李四') {
    throw new Error('Employee name update failed');
  }

  // 测试转换为数据库插入对象
  const insertData = mapper.toInsert(employee);
  if (insertData.employee_name !== '李四') {
    throw new Error('Employee insert mapping failed');
  }

  if (insertData.gender !== 'female') {
    throw new Error('Gender insert mapping failed');
  }

  // 测试银行账户管理
  employee.addBankAccount({
    bankName: '中国银行',
    accountNumber: '1234567890123456',
    accountHolderName: '李四',
    isPrimary: true,
    effectiveStartDate: new Date()
  });

  if (employee.bankAccounts.length !== 1) {
    throw new Error('Bank account addition failed');
  }

  if (!employee.primaryBankAccount) {
    throw new Error('Primary bank account not found');
  }
}

/**
 * 测试Payroll实体和映射器
 */
async function testPayrollEntityAndMapper(): Promise<void> {
  const mapper = new PayrollMapper();

  // 测试从数据库行转换为Domain实体
  const payroll = mapper.toDomain(mockPayrollRow);

  // 验证基本属性
  if (payroll.employeeId !== 'emp-123') {
    throw new Error('Employee ID mapping failed');
  }

  if (payroll.status !== PayrollStatus.DRAFT) {
    throw new Error('Payroll status mapping failed');
  }

  if (payroll.grossPay !== 10000) {
    throw new Error('Gross pay mapping failed');
  }

  // 测试验证
  const validation = payroll.validate();
  if (!validation.isValid) {
    throw new Error(`Payroll validation failed: ${validation.firstError}`);
  }

  // 测试业务方法
  payroll.addComponent({
    type: PayrollComponentType.BASIC_SALARY,
    name: '基本工资',
    amount: 8000,
    isDeduction: false,
    isStatutory: false
  });

  payroll.addComponent({
    type: PayrollComponentType.SOCIAL_INSURANCE,
    name: '社保',
    amount: 800,
    isDeduction: true,
    isStatutory: true
  });

  if (payroll.components.length !== 2) {
    throw new Error('Payroll component addition failed');
  }

  // 测试计算
  payroll.recalculate();
  if (payroll.grossPay !== 8000) {
    throw new Error('Payroll calculation failed');
  }

  // 测试状态转换
  payroll.submitForApproval();
  if (payroll.status !== PayrollStatus.PENDING) {
    throw new Error('Payroll status transition failed');
  }

  // 测试转换为数据库更新对象
  const updateData = mapper.toUpdate(payroll);
  if (updateData.status !== 'pending') {
    throw new Error('Payroll status update mapping failed');
  }

  // 测试薪资摘要
  const summary = payroll.getSummary();
  if (summary.totalEarnings !== 8000) {
    throw new Error('Payroll summary calculation failed');
  }
}

/**
 * 测试服务集成
 */
async function testServiceIntegration(): Promise<void> {
  // 注意：这里只测试集成逻辑，不进行实际的数据库操作
  
  // 测试集成器创建
  const integration = SupabaseServiceIntegration.getInstance();
  
  // 测试统计信息
  const stats = integration.getServiceStats();
  if (typeof stats.totalRegistrations !== 'number') {
    throw new Error('Service stats not properly generated');
  }

  // 测试健康检查结构
  const healthCheck = await integration.healthCheck();
  if (!healthCheck.overall || !Array.isArray(healthCheck.services)) {
    throw new Error('Health check structure invalid');
  }

  console.log('Service integration structure validated');
}

/**
 * 测试业务规则
 */
async function testBusinessRules(): Promise<void> {
  // 测试Employee业务规则
  const employee = new Employee(
    '王五',
    '110101199505051234',
    new Date('2023-01-01'),
    EmploymentStatus.ACTIVE
  );

  // 测试无效的管理者设置
  try {
    employee.setManager(employee.id); // 不能是自己的管理者
    throw new Error('Business rule validation should have failed');
  } catch (error) {
    if (!(error as Error).message.includes('自己的管理者')) {
      throw new Error('Wrong business rule error message');
    }
  }

  // 测试终止雇佣关系
  const terminationDate = new Date();
  employee.terminate(terminationDate, '测试终止');
  
  if (employee.employmentStatus !== EmploymentStatus.TERMINATED) {
    throw new Error('Employee termination failed');
  }

  if (!employee.terminationDate) {
    throw new Error('Termination date not set');
  }

  // 测试Payroll业务规则
  const payroll = new Payroll(
    employee.id,
    new Date('2023-01-01'),
    new Date('2023-01-31'),
    new Date('2023-02-05'),
    PayrollStatus.DRAFT
  );

  // 测试无效的薪资期间
  try {
    payroll.updatePayPeriod(new Date('2023-01-31'), new Date('2023-01-01')); // 开始日期晚于结束日期
    throw new Error('Business rule validation should have failed');
  } catch (error) {
    if (!(error as Error).message.includes('开始日期必须早于结束日期')) {
      throw new Error('Wrong business rule error message');
    }
  }

  // 测试状态转换规则
  try {
    payroll.approve(); // 不能直接从草稿状态审核通过
    throw new Error('Status transition rule should have failed');
  } catch (error) {
    if (!(error as Error).message.includes('待审核状态')) {
      throw new Error('Wrong status transition error message');
    }
  }
}

/**
 * 测试导入映射器
 */
async function testImportMappers(): Promise<void> {
  // 测试Employee导入映射器
  const { EmployeeImportMapper } = await import('../../../modules/payroll-import/infrastructure/mappers/EmployeeMapper');

  const excelEmployeeData = {
    '姓名': '赵六',
    '身份证号': '110101199801011234',
    '入职日期': '2023-03-01',
    '出生日期': '1998-01-01',
    '性别': '女',
    '雇佣状态': '在职'
  };

  const importedEmployee = EmployeeImportMapper.fromExcelRow(excelEmployeeData);

  if (importedEmployee.employeeName !== '赵六') {
    throw new Error('Employee import name mapping failed');
  }

  if (importedEmployee.employmentStatus !== EmploymentStatus.ACTIVE) {
    throw new Error('Employee import status mapping failed');
  }

  if (importedEmployee.gender !== Gender.FEMALE) {
    throw new Error('Employee import gender mapping failed');
  }

  // 测试Payroll导入映射器
  const { PayrollImportMapper } = await import('../../../modules/payroll-import/infrastructure/mappers/PayrollMapper');

  const excelPayrollData = {
    '薪资期间开始': '2023-01-01',
    '薪资期间结束': '2023-01-31',
    '发薪日期': '2023-02-05',
    '基本工资': 8000,
    '加班费': 1000,
    '社保个人': 800,
    '个人所得税': 200,
    '备注': '测试导入'
  };

  const importedPayroll = PayrollImportMapper.fromExcelRow(excelPayrollData, 'emp-123');

  if (importedPayroll.employeeId !== 'emp-123') {
    throw new Error('Payroll import employee ID failed');
  }

  if (importedPayroll.components.length < 4) { // 基本工资、加班费、社保、税
    throw new Error('Payroll import components mapping failed');
  }

  const basicSalaryComponent = importedPayroll.getComponentsByType(PayrollComponentType.BASIC_SALARY)[0];
  if (!basicSalaryComponent || basicSalaryComponent.amount !== 8000) {
    throw new Error('Payroll import basic salary mapping failed');
  }

  if (importedPayroll.notes !== '测试导入') {
    throw new Error('Payroll import notes mapping failed');
  }
}

// 如果在浏览器环境中，自动运行测试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  runDataAccessLayerTests().then(success => {
    if (success) {
      console.log('🎉 Data Access Layer is ready!');
    } else {
      console.error('❌ Data Access Layer has issues!');
    }
  });
}