# 01-架构基础设施搭建

## 功能描述
建立企业级架构的基础设施框架，包括Repository接口定义、Domain实体基类、事件系统基础框架以及依赖注入容器的搭建。

## 功能需求 (EARS格式)

### Repository接口需求
- **Ubiquitous**: 系统应提供通用的Repository接口，支持所有实体的数据访问操作
- **WHEN** 应用启动 **THEN** 系统应自动注册所有Repository实现
- **Ubiquitous**: Repository接口应提供类型安全的泛型支持
- **Ubiquitous**: Repository应支持基本的create、read、update、delete操作
- **WHEN** 执行单个实体操作 **THEN** 系统应返回操作结果和错误信息
- **IF** 实体不存在 **THEN** 系统应抛出NotFoundError异常
- **Ubiquitous**: Repository应支持批量插入、更新、删除操作
- **WHEN** 执行批量操作 **THEN** 系统应以事务方式处理所有操作
- **IF** 批量操作中任一项失败 **THEN** 系统应回滚所有操作
- **Ubiquitous**: Repository应支持分页查询，包含页码、页大小、总数信息
- **Ubiquitous**: Repository应支持多字段排序、范围查询、模糊搜索
- **WHEN** 执行复杂查询 **THEN** 系统应优化查询性能并返回执行统计

### Domain实体基类需求
- **Ubiquitous**: 所有Domain实体应继承包含id、created_at、updated_at的基类
- **Ubiquitous**: 实体基类应支持软删除机制，通过deleted_at字段标记
- **Ubiquitous**: 实体基类应支持乐观锁，通过version字段实现并发控制
- **WHEN** 实体状态变更 **THEN** 系统应触发相应的领域事件
- **WHEN** 调用实体业务方法 **THEN** 系统应先执行业务规则验证
- **IF** 业务规则验证失败 **THEN** 系统应抛出DomainValidationError异常
- **WHEN** 创建新实体 **THEN** 系统应自动设置created_at和初始version
- **WHEN** 更新实体 **THEN** 系统应自动更新updated_at和递增version
- **WHEN** 软删除实体 **THEN** 系统应设置deleted_at而不物理删除

### 事件系统需求
- **Ubiquitous**: 系统应提供同步的领域事件发布机制
- **WHEN** 实体状态变更 **THEN** 系统应立即发布相应的领域事件
- **Ubiquitous**: 事件应包含事件类型、聚合根ID、时间戳和变更数据
- **Ubiquitous**: 系统应支持事件处理器的注册和自动调用
- **WHEN** 发布事件 **THEN** 系统应按注册顺序同步执行所有相关处理器
- **IF** 任何事件处理器失败 **THEN** 系统应记录错误但不影响后续处理器
- **Ubiquitous**: 事件系统应与Supabase实时订阅功能集成
- **WHEN** 数据库发生变更 **THEN** 系统应将Supabase实时事件转换为领域事件
- **Ubiquitous**: 系统应支持客户端事件订阅，利用Supabase的WebSocket连接

### 依赖注入容器需求
- **Ubiquitous**: 系统应提供简单的服务注册API，支持类型安全的注册
- **Ubiquitous**: 系统应支持单例(Singleton)和瞬态(Transient)生命周期
- **WHEN** 应用启动 **THEN** 系统应扫描并自动注册带有@Injectable装饰器的服务
- **Ubiquitous**: 容器应支持构造函数依赖注入和属性注入
- **WHEN** 解析服务 **THEN** 系统应递归解析所有依赖项
- **IF** 发现循环依赖 **THEN** 系统应抛出CircularDependencyError异常
- **Ubiquitous**: 容器应提供完整的TypeScript类型推断支持
- **Ubiquitous**: 系统应在编译时检测依赖注入的类型错误
- **Ubiquitous**: 容器应支持接口到实现的绑定，保持抽象依赖

## 非功能需求

### 性能需求
- **Ubiquitous**: DI容器的服务解析时间应低于1ms
- **Ubiquitous**: Repository操作的响应时间应低于100ms
- **Ubiquitous**: 事件处理的延迟应低于10ms

### 兼容性需求
- **Ubiquitous**: 系统应完全兼容现有的BaseService架构，支持直接替换
- **Ubiquitous**: 系统应兼容TypeScript 4.5+和React 18+
- **Ubiquitous**: 系统应与Supabase免费版的所有特性兼容

### 可维护性需求
- **Ubiquitous**: 所有接口应提供完整的JSDoc文档
- **Ubiquitous**: 系统应提供完整的TypeScript类型定义
- **Ubiquitous**: 代码覆盖率应达到90%以上

## 验收标准
1. 所有Repository接口通过单元测试和集成测试
2. Domain实体基类支持所有企业级特性（审计、版本控制、软删除）
3. 事件系统与Supabase实时功能完美集成
4. DI容器提供完整的类型安全支持
5. 现有BaseService可以无缝迁移到新架构
6. 所有功能提供完整的测试覆盖