/**
 * 企业架构基础设施测试
 * 
 * 验证Repository接口、Domain实体、事件系统和DI容器的正确实现
 */

import 'reflect-metadata';
import { 
  BaseEntity, 
  ValidationResult, 
  DomainEvent,
  ValidationError,
  BusinessRuleError
} from '../../shared/domain';
import { 
  DIContainer, 
  EventBus, 
  Injectable, 
  Inject, 
  ServiceLifetime,
  SERVICE_TOKENS
} from '../index';

// ==================== 测试用例定义 ====================

/**
 * 测试实体
 */
class TestEmployee extends BaseEntity {
  constructor(
    public name: string,
    public email: string,
    public salary: number = 0
  ) {
    super();
  }

  validate(): ValidationResult {
    const baseValidation = this.validateBaseRules();
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: '员工姓名不能为空',
        code: 'REQUIRED'
      });
    }

    if (!this.email || !this.email.includes('@')) {
      errors.push({
        field: 'email',
        message: '请输入有效的邮箱地址',
        code: 'INVALID_FORMAT'
      });
    }

    if (this.salary < 0) {
      errors.push({
        field: 'salary',
        message: '薪资不能为负数',
        code: 'INVALID_VALUE'
      });
    }

    return errors.length > 0 
      ? ValidationResult.failure(errors)
      : ValidationResult.success();
  }

  clone(): TestEmployee {
    return new TestEmployee(this.name, this.email, this.salary);
  }

  increaseSalary(amount: number): void {
    if (amount <= 0) {
      throw new BusinessRuleError('加薪金额必须大于0', 'INVALID_SALARY_INCREASE');
    }

    this.salary += amount;
    this.markAsUpdated();
    
    this.addDomainEvent(new DomainEvent(
      'SalaryIncreased',
      { previousSalary: this.salary - amount, newSalary: this.salary, increaseAmount: amount },
      this.id,
      'Employee'
    ));
  }
}

/**
 * 测试服务接口
 */
interface ITestService {
  processEmployee(employee: TestEmployee): Promise<string>;
}

/**
 * 测试服务实现
 */
@Injectable(ServiceLifetime.Singleton)
class TestEmployeeService implements ITestService {
  constructor(
    @Inject(SERVICE_TOKENS.IEventBus) private eventBus: any
  ) {}

  async processEmployee(employee: TestEmployee): Promise<string> {
    // 验证员工
    const validation = employee.validate();
    if (!validation.isValid) {
      throw new ValidationError(`Employee validation failed: ${validation.firstError}`);
    }

    // 发布事件
    await this.eventBus.publish(new DomainEvent(
      'EmployeeProcessed',
      { employeeId: employee.id, employeeName: employee.name },
      employee.id,
      'Employee'
    ));

    return `Processed employee: ${employee.name}`;
  }
}

// ==================== 测试用例 ====================

/**
 * 运行所有测试
 */
export async function runArchitectureFoundationTests(): Promise<boolean> {
  console.log('🧪 Running Enterprise Architecture Foundation Tests...');

  try {
    // 测试Domain实体
    await testDomainEntity();
    console.log('✅ Domain Entity tests passed');

    // 测试验证结果
    await testValidationResult();
    console.log('✅ Validation Result tests passed');

    // 测试事件系统
    await testEventSystem();
    console.log('✅ Event System tests passed');

    // 测试DI容器
    await testDIContainer();
    console.log('✅ DI Container tests passed');

    // 测试集成场景
    await testIntegrationScenario();
    console.log('✅ Integration tests passed');

    console.log('🎉 All architecture foundation tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Architecture foundation tests failed:', error);
    return false;
  }
}

/**
 * 测试Domain实体
 */
async function testDomainEntity(): Promise<void> {
  // 创建员工实体
  const employee = new TestEmployee('张三', 'zhangsan@example.com', 5000);

  // 验证基础属性
  if (!employee.id || employee.id.length === 0) {
    throw new Error('Entity ID should be generated automatically');
  }

  if (!employee.isActive) {
    throw new Error('New entity should be active by default');
  }

  if (employee.isDeleted) {
    throw new Error('New entity should not be deleted');
  }

  // 测试验证
  const validation = employee.validate();
  if (!validation.isValid) {
    throw new Error(`Valid employee should pass validation: ${validation.firstError}`);
  }

  // 测试业务方法
  employee.increaseSalary(1000);
  if (employee.salary !== 6000) {
    throw new Error('Salary increase should work correctly');
  }

  // 检查事件
  const events = employee.getDomainEvents();
  if (events.length !== 1 || events[0].eventType !== 'SalaryIncreased') {
    throw new Error('Domain events should be recorded');
  }

  // 测试软删除
  employee.delete();
  if (!employee.isDeleted) {
    throw new Error('Entity should be marked as deleted');
  }

  // 测试恢复
  employee.restore();
  if (employee.isDeleted) {
    throw new Error('Entity should be restored');
  }
}

/**
 * 测试验证结果
 */
async function testValidationResult(): Promise<void> {
  // 测试成功结果
  const success = ValidationResult.success();
  if (!success.isValid) {
    throw new Error('Success result should be valid');
  }

  // 测试失败结果
  const failure = ValidationResult.failure('Test error');
  if (failure.isValid) {
    throw new Error('Failure result should be invalid');
  }

  if (failure.firstError !== 'Test error') {
    throw new Error('Error message should be preserved');
  }

  // 测试合并结果
  const merged = success.merge(failure);
  if (merged.isValid) {
    throw new Error('Merged result with failure should be invalid');
  }
}

/**
 * 测试事件系统
 */
async function testEventSystem(): Promise<void> {
  const eventBus = new EventBus();
  let handledEvents: DomainEvent[] = [];

  // 创建事件处理器
  const handler = {
    handle: async (event: DomainEvent) => {
      handledEvents.push(event);
    },
    getHandlerName: () => 'TestHandler',
    canHandle: (event: DomainEvent) => event.eventType === 'TestEvent'
  };

  // 订阅事件
  eventBus.subscribe('TestEvent', handler);

  // 发布事件
  const testEvent = new DomainEvent('TestEvent', { message: 'Hello World' });
  await eventBus.publish(testEvent);

  // 验证事件被处理
  if (handledEvents.length !== 1) {
    throw new Error('Event should be handled once');
  }

  if (handledEvents[0].payload.message !== 'Hello World') {
    throw new Error('Event payload should be preserved');
  }

  // 获取统计信息
  const stats = eventBus.getStats();
  if (stats.totalEventsPublished !== 1 || stats.totalEventsProcessed !== 1) {
    throw new Error('Event statistics should be accurate');
  }

  await eventBus.dispose();
}

/**
 * 测试DI容器
 */
async function testDIContainer(): Promise<void> {
  const container = new DIContainer();

  // 注册服务
  container.registerSingleton('TestService', TestEmployeeService);

  // 检查注册状态
  if (!container.isRegistered('TestService')) {
    throw new Error('Service should be registered');
  }

  // 解析服务
  const service = container.resolve<TestEmployeeService>('TestService');
  if (!service) {
    throw new Error('Service should be resolved');
  }

  // 测试单例行为
  const service2 = container.resolve<TestEmployeeService>('TestService');
  if (service !== service2) {
    throw new Error('Singleton service should return same instance');
  }

  // 获取统计信息
  const stats = container.getStats();
  if (stats.registeredServices < 1) {
    throw new Error('Container should track registered services');
  }

  container.dispose();
}

/**
 * 测试集成场景
 */
async function testIntegrationScenario(): Promise<void> {
  const container = new DIContainer();
  const eventBus = new EventBus();

  // 注册事件总线
  container.registerSingleton(SERVICE_TOKENS.IEventBus, () => eventBus);

  // 注册服务
  container.registerSingleton('EmployeeService', TestEmployeeService);

  // 解析服务
  const employeeService = container.resolve<TestEmployeeService>('EmployeeService');

  // 创建员工
  const employee = new TestEmployee('李四', 'lisi@example.com', 8000);

  // 处理员工
  const result = await employeeService.processEmployee(employee);
  if (!result.includes('李四')) {
    throw new Error('Service should process employee correctly');
  }

  // 清理
  await eventBus.dispose();
  container.dispose();
}

// 如果在浏览器环境中，自动运行测试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  runArchitectureFoundationTests().then(success => {
    if (success) {
      console.log('🎉 Architecture Foundation is ready!');
    } else {
      console.error('❌ Architecture Foundation has issues!');
    }
  });
}