/**
 * 权限申请系统组件统一导出
 * 
 * 功能模块：
 * - PermissionRequestForm: 权限申请表单
 * - RequestStatusTracker: 申请状态跟踪
 * - ApprovalPanel: 审批管理面板
 * - MyPermissionsDashboard: 个人权限仪表板
 * - PermissionRequestHistory: 申请历史记录
 * - NotificationCenter: 通知中心
 */

// 核心组件
export { default as PermissionRequestForm } from './PermissionRequestForm';
export { default as RequestStatusTracker, statusUtils } from './RequestStatusTracker';
export { default as ApprovalPanel } from './ApprovalPanel';
export { default as MyPermissionsDashboard } from './MyPermissionsDashboard';

// 辅助组件（即将实现）
// export { default as PermissionRequestHistory } from './PermissionRequestHistory';
// export { default as NotificationCenter } from './NotificationCenter';

// 组件类型导出
export type { 
  // 暂时导出通用的 React 组件 props 类型
  // 具体的组件 Props 类型可以根据需要添加
} from 'react';