# 01-架构基础设施搭建 - 设计文档

## 概述
本文档详细设计企业级架构基础设施的四个核心组件：Repository接口、Domain实体基类、事件系统和轻量级DI容器。设计目标是建立可扩展、可维护、类型安全的架构基础，支持与现有Supabase系统的无缝集成。

## 1. Repository接口架构设计

### 核心接口设计
提供类型安全的通用Repository接口，支持CRUD操作、批量处理、复杂查询和分页。

**关键特性：**
- 泛型类型安全支持
- 批量操作事务处理
- 灵活的查询条件和操作符
- 分页和排序支持
- 性能监控和统计

**技术实现：**
```typescript
interface IRepository<TEntity, TKey = string> {
  // 基础CRUD + 批量操作 + 查询操作
  findById(id: TKey): Promise<TEntity | null>
  findAll(options?: QueryOptions<TEntity>): Promise<PagedResult<TEntity>>
  createMany(entities: Omit<TEntity, 'id' | 'created_at' | 'updated_at'>[]): Promise<TEntity[]>
  // ... 其他方法
}
```

### Supabase适配器
通过适配器模式封装Supabase特定操作，提供统一的数据访问接口。

**集成特性：**
- Supabase查询优化
- 错误处理和类型转换
- 实时订阅支持
- 性能监控

## 2. Domain实体基类设计

### 企业级实体特性
基于DDD最佳实践，提供富领域模型基础设施。

**核心功能：**
- 审计字段自动管理（created_at, updated_at, version）
- 软删除支持（deleted_at）
- 乐观锁并发控制（version字段）
- 领域事件管理
- 业务规则验证框架

**技术实现：**
```typescript
abstract class BaseEntity {
  readonly id: string
  readonly created_at: Date
  readonly updated_at: Date
  readonly version: number
  readonly deleted_at: Date | null

  protected addDomainEvent(event: DomainEvent): void
  protected abstract validate(): void
  protected invariant(condition: boolean, message: string): void
}
```

### 聚合根和值对象
提供完整的DDD建模支持，包括聚合边界管理和值对象不可变性。

## 3. 事件系统架构设计

### 同步事件总线
基于同步模式的高性能事件处理机制，确保事务一致性。

**核心特性：**
- 同步事件发布和处理
- 事件处理器注册管理
- 错误隔离（单个处理器失败不影响其他）
- 完整的事件溯源支持

### Supabase实时集成
与Supabase WebSocket功能深度集成，提供客户端实时更新。

**集成方案：**
- 数据库变更自动转换为领域事件
- 客户端事件订阅服务
- 事件处理器桥接机制
- WebSocket连接管理

**技术实现：**
```typescript
class SupabaseRealtimeEventAdapter {
  subscribeToTable(tableName: string, entityType: string): void
  private convertToSupabaseDomainEvent(payload: any, entityType: string): DomainEvent
}
```

## 4. 轻量级DI容器设计

### 类型安全的依赖注入
基于TypeScript装饰器的轻量级DI解决方案，提供企业级特性。

**核心功能：**
- @Injectable和@Inject装饰器
- 单例和瞬态生命周期管理
- 循环依赖检测
- 接口到实现的类型安全绑定
- 自动服务发现和注册

**技术实现：**
```typescript
@Injectable(ServiceLifetime.Singleton)
class EmployeeService {
  constructor(
    @Inject(SERVICE_TOKENS.IEmployeeRepository) private employeeRepo: IEmployeeRepository,
    @Inject(SERVICE_TOKENS.IEventBus) private eventBus: IEventBus
  ) {}
}
```

### 容器配置和初始化
提供声明式的服务配置，支持自动扫描和手动注册。

## 5. 系统集成方案

### 迁移策略
**直接替换方案：** 通过适配器模式保持向后兼容，实现无缝迁移。

**迁移阶段：**
1. **基础设施迁移** - DI容器初始化和事件系统设置
2. **Repository层迁移** - 数据访问层现代化
3. **Domain模型迁移** - 业务逻辑重构到领域模型

### React组件集成
通过Context API和自定义Hook实现服务注入，保持组件的简洁性。

**集成特性：**
- 服务热替换支持
- 类型安全的服务访问
- 自动依赖解析
- 开发时服务监控

### 兼容性保证
提供完整的兼容性测试套件，确保迁移过程中的功能一致性。

## 性能考量

**优化策略：**
- DI容器服务解析 < 1ms
- Repository操作响应 < 100ms  
- 事件处理延迟 < 10ms
- 内存占用优化（单例模式）
- 查询结果缓存策略

## 可扩展性设计

**扩展点：**
- Repository接口支持多数据源
- 事件系统支持异步模式升级
- DI容器支持作用域管理
- 领域模型支持复杂聚合

## 监控和调试

**可观测性：**
- 完整的日志记录
- 性能指标收集
- 错误追踪和上报
- 开发时调试工具

## 总结

本架构基础设施设计提供了企业级的可扩展、可维护、高性能的技术底座，为后续的业务模块重构奠定了坚实基础。通过与Supabase的深度集成和类型安全的设计，确保了开发效率和代码质量的双重提升。