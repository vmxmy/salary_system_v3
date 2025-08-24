/**
 * 权限申请系统类型定义
 * 
 * 功能特性：
 * - 权限申请流程管理
 * - 申请状态跟踪
 * - 审批工作流
 * - 通知系统
 * - 统计报告
 */

import type { Permission, Role } from './permission';

// 权限申请类型
export type PermissionRequestType = 'grant' | 'revoke' | 'temporary' | 'extend';

// 权限申请状态
export type PermissionRequestStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';

// 申请紧急程度
export type RequestUrgency = 'low' | 'medium' | 'high' | 'critical';

// 审批决策类型
export type ApprovalDecision = 'approved' | 'denied' | 'needs_info' | 'delegated';

// 权限申请基础接口
export interface PermissionRequest {
  request_id: string;
  user_id: string;
  permission_id: string;
  permission_name?: string;
  request_type: PermissionRequestType;
  reason: string;
  requested_at: string;
  expires_at?: string;
  status: PermissionRequestStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_reason?: string;
  created_at: string;
  updated_at: string;
  
  // 扩展信息
  user_email?: string;
  reviewer_email?: string;
  urgency?: RequestUrgency;
  metadata?: PermissionRequestMetadata;
}

// 权限申请元数据
export interface PermissionRequestMetadata {
  // 申请相关
  request_source?: 'manual' | 'automatic' | 'system';
  business_justification?: string;
  expected_usage?: string;
  duration_requested?: string;
  
  // 审批相关
  approval_workflow?: string[];
  escalation_path?: string[];
  approval_deadline?: string;
  
  // 通知相关
  notification_preferences?: {
    email?: boolean;
    in_app?: boolean;
    sms?: boolean;
  };
  
  // 临时权限相关
  temp_start_date?: string;
  temp_end_date?: string;
  auto_revoke?: boolean;
  
  // 审批历史
  approval_history?: ApprovalHistoryEntry[];
  
  // 其他
  tags?: string[];
  priority?: RequestUrgency;
  related_requests?: string[];
  attachments?: FileAttachment[];
}

// 审批历史条目
export interface ApprovalHistoryEntry {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_email: string;
  decision: ApprovalDecision;
  reason: string;
  timestamp: string;
  delegation?: {
    delegated_to: string;
    delegated_by: string;
    delegated_at: string;
  };
}

// 文件附件
export interface FileAttachment {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
  url?: string;
}

// 权限申请表单数据
export interface PermissionRequestFormData {
  permission_id: string;
  request_type: PermissionRequestType;
  reason: string;
  business_justification?: string;
  expected_usage?: string;
  duration_days?: number;
  temp_start_date?: Date;
  temp_end_date?: Date;
  urgency?: RequestUrgency;
  tags?: string[];
  attachments?: File[];
  notification_email?: boolean;
  notification_in_app?: boolean;
}

// 批量申请表单数据
export interface BatchPermissionRequestFormData {
  permissions: string[];
  request_type: PermissionRequestType;
  reason: string;
  business_justification?: string;
  duration_days?: number;
  urgency?: RequestUrgency;
  apply_to_all?: boolean;
}

// 审批表单数据
export interface ApprovalFormData {
  decision: ApprovalDecision;
  reason: string;
  conditions?: string;
  duration_override?: number;
  delegate_to?: string;
  notify_user?: boolean;
}

// 批量审批表单数据
export interface BatchApprovalFormData {
  request_ids: string[];
  decision: ApprovalDecision;
  reason: string;
  apply_to_all?: boolean;
  conditions?: string;
}

// 权限申请过滤器
export interface PermissionRequestFilter {
  status?: PermissionRequestStatus[];
  request_type?: PermissionRequestType[];
  urgency?: RequestUrgency[];
  permission_ids?: string[];
  user_ids?: string[];
  date_range?: {
    start: Date;
    end: Date;
  };
  keywords?: string;
}

// 权限申请统计
export interface PermissionRequestStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  denied_requests: number;
  expired_requests: number;
  
  // 按类型统计
  by_type: Record<PermissionRequestType, number>;
  by_urgency: Record<RequestUrgency, number>;
  by_permission: Record<string, number>;
  
  // 审批统计
  approval_rate: number;
  average_approval_time: number; // 小时
  pending_overdue: number;
  
  // 时间趋势
  requests_by_day: Array<{
    date: string;
    count: number;
    approved: number;
    denied: number;
  }>;
}

// 我的权限信息
export interface MyPermissionInfo {
  permission_id: string;
  permission_name: string;
  permission_description: string;
  granted_at: string;
  granted_by: string;
  expires_at?: string;
  is_temporary: boolean;
  source: 'role' | 'direct' | 'request';
  usage_stats?: {
    last_used_at?: string;
    usage_count: number;
    usage_frequency: 'never' | 'rare' | 'occasional' | 'frequent';
  };
}

// 权限推荐
export interface PermissionRecommendation {
  permission_id: string;
  permission_name: string;
  reason: string;
  confidence: number; // 0-1
  similar_users: string[];
  usage_pattern: string;
}

// 通知设置
export interface NotificationSettings {
  user_id: string;
  request_submitted: boolean;
  request_approved: boolean;
  request_denied: boolean;
  request_expired: boolean;
  permission_expiring: boolean;
  new_pending_requests: boolean; // 仅管理员
  approval_deadline: boolean; // 仅审批人
  email_notifications: boolean;
  in_app_notifications: boolean;
  sms_notifications: boolean;
}

// Hook 返回类型
export interface UsePermissionRequestReturn {
  // 申请管理
  submitRequest: (data: PermissionRequestFormData) => Promise<string>;
  submitBatchRequest: (data: BatchPermissionRequestFormData) => Promise<string[]>;
  cancelRequest: (requestId: string) => Promise<boolean>;
  
  // 获取申请
  getMyRequests: (filter?: PermissionRequestFilter) => Promise<PermissionRequest[]>;
  getRequestById: (requestId: string) => Promise<PermissionRequest | null>;
  
  // 状态数据
  myRequests: PermissionRequest[];
  loading: boolean;
  error: Error | null;
  
  // 刷新
  refreshRequests: () => Promise<void>;
}

export interface UsePermissionApprovalReturn {
  // 审批管理
  approveBatch: (data: BatchApprovalFormData) => Promise<boolean>;
  approveRequest: (requestId: string, data: ApprovalFormData) => Promise<boolean>;
  denyRequest: (requestId: string, reason: string) => Promise<boolean>;
  delegateRequest: (requestId: string, delegateToUserId: string, reason: string) => Promise<boolean>;
  
  // 获取申请
  getPendingRequests: (filter?: PermissionRequestFilter) => Promise<PermissionRequest[]>;
  getAllRequests: (filter?: PermissionRequestFilter) => Promise<PermissionRequest[]>;
  getApprovalHistory: (requestId: string) => Promise<ApprovalHistoryEntry[]>;
  
  // 统计数据
  getStats: (timeRange?: { start: Date; end: Date }) => Promise<PermissionRequestStats>;
  
  // 状态数据
  pendingRequests: PermissionRequest[];
  stats: PermissionRequestStats | null;
  loading: boolean;
  error: Error | null;
  
  // 权限检查
  canApprove: boolean;
  
  // 刷新
  refreshRequests: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export interface UseMyPermissionsReturn {
  // 权限查看
  getMyPermissions: () => Promise<MyPermissionInfo[]>;
  getPermissionUsage: (permissionId: string) => Promise<any>;
  
  // 权限推荐
  getRecommendations: () => Promise<PermissionRecommendation[]>;
  
  // 通知设置
  getNotificationSettings: () => Promise<NotificationSettings>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<boolean>;
  
  // 状态数据
  myPermissions: MyPermissionInfo[];
  recommendations: PermissionRecommendation[];
  notificationSettings: NotificationSettings | null;
  loading: boolean;
  error: Error | null;
  
  // 刷新
  refreshPermissions: () => Promise<void>;
  refreshRecommendations: () => Promise<void>;
}

export interface UsePermissionNotificationReturn {
  // 通知获取
  getNotifications: (limit?: number) => Promise<NotificationItem[]>;
  getUnreadCount: () => Promise<number>;
  
  // 通知操作
  markAsRead: (notificationIds: string[]) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  
  // 状态数据
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  
  // 刷新
  refreshNotifications: () => Promise<void>;
}

// 通知项接口
export interface NotificationItem {
  id: string;
  user_id: string;
  type: 'request_approved' | 'request_denied' | 'request_expired' | 'permission_expiring' | 'new_request' | 'approval_deadline';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: {
    request_id?: string;
    permission_id?: string;
    action_url?: string;
    expires_at?: string;
  };
}

// 申请时间线条目
export interface RequestTimelineEntry {
  id: string;
  type: 'submitted' | 'approved' | 'denied' | 'expired' | 'cancelled' | 'delegated' | 'commented';
  title: string;
  description: string;
  timestamp: string;
  user_name: string;
  user_email: string;
  metadata?: Record<string, any>;
}

// 权限申请模板
export interface RequestTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  default_reason: string;
  default_duration?: number;
  tags: string[];
  is_public: boolean;
  created_by: string;
  created_at: string;
}

// 系统配置
export interface PermissionRequestConfig {
  // 申请设置
  max_pending_requests_per_user: number;
  default_expiry_days: number;
  max_request_duration_days: number;
  require_business_justification: boolean;
  allow_attachments: boolean;
  
  // 审批设置
  auto_approve_threshold: number; // 权限级别阈值
  approval_timeout_hours: number;
  escalation_enabled: boolean;
  require_approval_reason: boolean;
  
  // 通知设置
  notification_enabled: boolean;
  email_notifications: boolean;
  reminder_intervals: number[]; // 小时
  
  // 安全设置
  audit_all_requests: boolean;
  restrict_bulk_requests: boolean;
  max_bulk_size: number;
}