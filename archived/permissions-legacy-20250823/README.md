# 权限验证 Hook 系统

## 概述

这是一个完整的权限验证 Hook 系统，提供了企业级的权限管理功能，包括基于角色的访问控制（RBAC）、基于属性的访问控制（ABAC）、实时权限同步、权限申请管理等功能。

## 核心特性

### 🔐 多层权限验证
- **基础权限**: 基于角色的静态权限检查
- **上下文权限**: 考虑用户、资源、环境的动态权限检查
- **资源权限**: 资源级别的细粒度访问控制
- **时间权限**: 支持临时权限和过期机制

### 🚀 性能优化
- **智能缓存**: 多层缓存策略，减少重复权限检查
- **批量处理**: 支持批量权限检查，提高性能
- **防抖处理**: 防抖机制避免频繁的权限检查
- **懒加载**: 按需加载权限规则

### 🔄 实时同步
- **Supabase Realtime**: 集成 Supabase 实时订阅
- **权限变更通知**: 实时广播权限变更事件
- **自动缓存刷新**: 权限变更时自动刷新相关缓存

### 🎯 用户友好
- **权限申请**: 一键申请缺失权限
- **优雅降级**: 权限不足时的友好提示
- **调试模式**: 开发环境下的详细调试信息

## 快速开始

### 1. 基础权限检查

```tsx
import { useEnhancedPermission, PERMISSIONS } from '@/hooks/permissions';

function EmployeeManagementPage() {
  const { hasPermission, hasAnyPermission, loading } = useEnhancedPermission();

  if (loading) return <div>检查权限中...</div>;

  const canViewEmployees = hasPermission(PERMISSIONS.EMPLOYEE_VIEW);
  const canManageEmployees = hasAnyPermission([
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_UPDATE,
    PERMISSIONS.EMPLOYEE_DELETE
  ]);

  return (
    <div>
      {canViewEmployees && <EmployeeList />}
      {canManageEmployees && <EmployeeActions />}
    </div>
  );
}
```

### 2. 角色管理

```tsx
import { useRole } from '@/hooks/permissions';

function AdminPanel() {
  const { 
    role, 
    isRole, 
    hasRoleLevel, 
    switchRole, 
    requestRole 
  } = useRole();

  const handleRoleSwitch = async (newRole: Role) => {
    const success = await switchRole(newRole);
    if (success) {
      console.log(`Role switched to: ${newRole}`);
    }
  };

  return (
    <div>
      <p>当前角色: {role}</p>
      {isRole(['admin', 'super_admin']) && (
        <AdminControls />
      )}
      {hasRoleLevel('manager') && (
        <ManagerTools />
      )}
    </div>
  );
}
```

### 3. 资源访问控制

```tsx
import { useResource } from '@/hooks/permissions';

function EmployeeProfile({ employeeId }: { employeeId: string }) {
  const { 
    canView, 
    canUpdate, 
    canDelete,
    can,
    loading 
  } = useResource({
    resourceType: 'employee',
    resourceId: employeeId,
    scope: 'own' // 只能访问自己的记录
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {canView && <ProfileView employeeId={employeeId} />}
      {canUpdate && <ProfileEditButton employeeId={employeeId} />}
      {canDelete && <ProfileDeleteButton employeeId={employeeId} />}
      {can('export') && <ExportButton employeeId={employeeId} />}
    </div>
  );
}
```

### 4. 权限守卫组件

```tsx
import { 
  EnhancedPermissionGuard,
  RequirePermission,
  RequireOwnership 
} from '@/components/auth/EnhancedPermissionGuard';
import { PERMISSIONS } from '@/hooks/permissions';

function PayrollPage({ employeeId }: { employeeId: string }) {
  return (
    <div>
      {/* 基础权限守卫 */}
      <EnhancedPermissionGuard permissions={[PERMISSIONS.PAYROLL_VIEW]}>
        <PayrollSummary />
      </EnhancedPermissionGuard>

      {/* 便捷的单权限守卫 */}
      <RequirePermission permission={PERMISSIONS.PAYROLL_CREATE}>
        <CreatePayrollButton />
      </RequirePermission>

      {/* 所有权守卫 - 只能查看自己的薪资 */}
      <RequireOwnership resourceType="payroll" resourceId={employeeId}>
        <PayrollDetails employeeId={employeeId} />
      </RequireOwnership>

      {/* 权限申请功能 */}
      <EnhancedPermissionGuard 
        permissions={[PERMISSIONS.PAYROLL_APPROVE]}
        showRequestButton={true}
        requestReason="需要审批权限以处理薪资申请"
        fallback={<div>您可以申请审批权限来访问此功能</div>}
      >
        <PayrollApprovalPanel />
      </EnhancedPermissionGuard>
    </div>
  );
}
```

### 5. 权限申请管理

```tsx
import { usePermissionRequest } from '@/hooks/permissions';

function PermissionRequestPanel() {
  const {
    requestPermission,
    requestTemporaryPermission,
    myRequests,
    pendingRequests,
    approveRequest,
    rejectRequest,
    loading
  } = usePermissionRequest();

  const handleRequestPermission = async () => {
    try {
      const requestId = await requestPermission(
        PERMISSIONS.EMPLOYEE_DELETE,
        undefined,
        '需要删除权限以清理无效员工记录'
      );
      console.log(`权限申请已提交: ${requestId}`);
    } catch (error) {
      console.error('权限申请失败:', error);
    }
  };

  const handleRequestTemporaryPermission = async () => {
    try {
      const requestId = await requestTemporaryPermission(
        PERMISSIONS.SYSTEM_CONFIG,
        2 * 60 * 60 * 1000, // 2小时
        '需要临时系统配置权限以处理紧急维护'
      );
      console.log(`临时权限申请已提交: ${requestId}`);
    } catch (error) {
      console.error('临时权限申请失败:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3>申请权限</h3>
        <div className="flex gap-2">
          <button 
            className="btn btn-primary"
            onClick={handleRequestPermission}
            disabled={loading}
          >
            申请删除权限
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleRequestTemporaryPermission}
            disabled={loading}
          >
            申请临时配置权限
          </button>
        </div>
      </div>

      <div>
        <h4>我的申请 ({myRequests.length})</h4>
        {myRequests.map(request => (
          <div key={request.id} className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h5>{request.permission}</h5>
              <p>{request.reason}</p>
              <div className="badge badge-outline">
                {request.status}
              </div>
            </div>
          </div>
        ))}
      </div>

      {pendingRequests.length > 0 && (
        <div>
          <h4>待审批申请 ({pendingRequests.length})</h4>
          {pendingRequests.map(request => (
            <div key={request.id} className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h5>{request.permission}</h5>
                <p>申请人: {request.metadata?.user_email}</p>
                <p>理由: {request.reason}</p>
                <div className="card-actions justify-end">
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => approveRequest(request.id)}
                  >
                    批准
                  </button>
                  <button 
                    className="btn btn-error btn-sm"
                    onClick={() => rejectRequest(request.id)}
                  >
                    拒绝
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 6. 统一权限管理

```tsx
import { usePermissions } from '@/hooks/permissions';

function ComprehensiveExample() {
  const {
    // 基础权限
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // 角色管理
    role,
    isRole,
    hasRoleLevel,
    switchRole,
    
    // 权限申请
    requestPermission,
    myRequests,
    
    // 资源访问工厂
    forResource,
    
    // 状态
    loading,
    error
  } = usePermissions({
    enableCache: true,
    enableRealtime: true,
    fallbackPermission: false
  });

  // 创建员工资源访问控制
  const employeeResource = forResource('employee', 'emp_123', 'own');

  return (
    <div>
      <p>当前角色: {role}</p>
      <p>是否为管理员: {isRole(['admin', 'super_admin']) ? '是' : '否'}</p>
      
      {employeeResource.canView && (
        <div>可以查看员工信息</div>
      )}
      
      {hasPermission(PERMISSIONS.PAYROLL_CREATE) && (
        <button>创建薪资记录</button>
      )}
      
      <div>我的权限申请数量: {myRequests.length}</div>
    </div>
  );
}
```

## 高级功能

### 权限装饰器

```tsx
import { withPermission } from '@/hooks/permissions';

@withPermission([PERMISSIONS.ADMIN_PANEL], { throwOnError: false })
class AdminComponent extends React.Component {
  render() {
    return <div>管理员面板</div>;
  }
}

// 或者用于函数组件
const AdminPanel = withPermission([PERMISSIONS.ADMIN_PANEL])(
  () => <div>管理员面板</div>
);
```

### 权限路由守卫

```tsx
import { createPermissionGuard } from '@/hooks/permissions';

const AdminRoute = createPermissionGuard([PERMISSIONS.ADMIN_PANEL]);

function App() {
  return (
    <Routes>
      <Route path="/admin" element={
        <AdminRoute>
          <AdminPanel />
        </AdminRoute>
      } />
    </Routes>
  );
}
```

### 动态权限规则

```tsx
import { permissionManager } from '@/hooks/permissions';

// 添加自定义权限规则
permissionManager.addRule({
  permission: PERMISSIONS.PAYROLL_VIEW,
  resource: 'payroll',
  scope: 'department',
  condition: async (context) => {
    // 自定义权限检查逻辑
    return context.user?.departmentId === context.resource?.attributes?.departmentId;
  }
});
```

## 配置选项

### UsePermissionOptions

```tsx
interface UsePermissionOptions {
  // 缓存配置
  enableCache?: boolean;           // 是否启用缓存 (默认: true)
  cacheTimeout?: number;          // 缓存超时时间 (默认: 5分钟)
  
  // 实时同步配置
  enableRealtime?: boolean;       // 是否启用实时同步 (默认: true)
  subscribeToChanges?: boolean;   // 是否订阅权限变更 (默认: true)
  
  // 错误处理
  throwOnError?: boolean;         // 是否在错误时抛出异常 (默认: false)
  fallbackPermission?: boolean;   // 权限检查失败时的降级值 (默认: false)
  
  // 性能配置
  debounceMs?: number;           // 防抖延迟 (默认: 100ms)
  batchRequests?: boolean;       // 是否批量处理请求 (默认: true)
}
```

## 最佳实践

### 1. 权限检查顺序
1. 首先检查用户是否已认证
2. 然后检查基础角色权限
3. 最后检查上下文相关权限

### 2. 性能优化
- 使用缓存减少重复权限检查
- 使用批量检查处理多个权限
- 合理设置防抖延迟

### 3. 错误处理
- 在生产环境中不要抛出权限错误
- 使用优雅的降级策略
- 提供权限申请入口

### 4. 安全考虑
- 权限检查应该在服务端进行最终验证
- 前端权限主要用于用户体验优化
- 敏感操作需要二次验证

## 故障排查

### 常见问题

1. **权限检查总是返回 false**
   - 检查用户是否已认证
   - 确认角色权限配置正确
   - 检查权限常量是否匹配

2. **实时更新不工作**
   - 确认 Supabase Realtime 已启用
   - 检查数据库表是否有实时更新权限
   - 查看控制台是否有订阅错误

3. **缓存问题**
   - 手动清理缓存: `permissionManager.clearCache()`
   - 检查缓存超时设置
   - 确认缓存键生成逻辑

### 调试模式

在开发环境中，权限守卫会显示调试信息：

```tsx
<EnhancedPermissionGuard 
  permissions={[PERMISSIONS.EMPLOYEE_VIEW]}
  debug={true}
>
  <Component />
</EnhancedPermissionGuard>
```

这将显示详细的权限检查信息，帮助诊断问题。

## 类型定义

所有相关的 TypeScript 类型定义都在 `@/types/permission.ts` 文件中，确保类型安全和良好的开发体验。

## 贡献

如需添加新的权限类型或功能，请遵循以下步骤：

1. 在 `@/constants/permissions.ts` 中添加权限常量
2. 在 `@/types/permission.ts` 中添加相关类型定义
3. 更新权限管理器的规则处理逻辑
4. 添加相应的测试用例
5. 更新文档