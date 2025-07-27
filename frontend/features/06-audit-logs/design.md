# 审计日志展示模块设计方案

## 架构概述

审计日志展示模块通过数据库触发器自动记录所有数据变更，结合 Supabase Realtime 实现实时更新，提供直观的时间轴视图和强大的分析功能。

## 核心组件设计

### 1. AuditLogViewer - 审计日志主组件

```tsx
// src/components/employee/AuditLogViewer.tsx
import React, { useState, useEffect } from 'react';
import { AuditTimeline } from './AuditTimeline';
import { AuditFilters } from './AuditFilters';
import { AuditStats } from './AuditStats';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useRealtimeAuditLogs } from '@/hooks/useRealtimeAuditLogs';

interface AuditLogViewerProps {
  employeeId: string;
  viewMode?: 'timeline' | 'grouped' | 'stats';
  allowExport?: boolean;
  className?: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  employeeId,
  viewMode = 'timeline',
  allowExport = true,
  className = ''
}) => {
  const [selectedView, setSelectedView] = useState(viewMode);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: dayjs().subtract(30, 'days').toDate(),
    end: new Date()
  });
  const [filters, setFilters] = useState<AuditFilters>({
    operationTypes: [],
    tables: [],
    users: [],
    searchQuery: ''
  });

  // 获取审计日志
  const {
    logs,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh
  } = useAuditLogs({
    employeeId,
    dateRange,
    filters,
    pageSize: 20
  });

  // 实时订阅新日志
  useRealtimeAuditLogs({
    employeeId,
    onNewLog: (log) => {
      refresh(); // 刷新列表以包含新日志
    }
  });

  // 统计数据
  const stats = React.useMemo(() => {
    if (!logs.length) return null;

    return {
      totalChanges: logs.length,
      recentChanges: logs.filter(log => 
        dayjs(log.operated_at).isAfter(dayjs().subtract(7, 'days'))
      ).length,
      topChangedFields: getTopChangedFields(logs),
      activityByDay: getActivityByDay(logs),
      topOperators: getTopOperators(logs)
    };
  }, [logs]);

  const handleExport = async () => {
    const exportData = await exportAuditLogs({
      employeeId,
      dateRange,
      filters,
      format: 'excel'
    });
    
    downloadFile(exportData, `audit_logs_${employeeId}_${Date.now()}.xlsx`);
  };

  return (
    <div className={`audit-log-viewer ${className}`}>
      {/* 视图切换和筛选器 */}
      <div className="viewer-header">
        <div className="view-tabs">
          <button
            className={`tab ${selectedView === 'timeline' ? 'active' : ''}`}
            onClick={() => setSelectedView('timeline')}
          >
            <ClockIcon className="tab-icon" />
            时间轴
          </button>
          <button
            className={`tab ${selectedView === 'grouped' ? 'active' : ''}`}
            onClick={() => setSelectedView('grouped')}
          >
            <ViewGridIcon className="tab-icon" />
            分类视图
          </button>
          <button
            className={`tab ${selectedView === 'stats' ? 'active' : ''}`}
            onClick={() => setSelectedView('stats')}
          >
            <ChartBarIcon className="tab-icon" />
            统计分析
          </button>
        </div>

        <div className="header-actions">
          {allowExport && (
            <button
              onClick={handleExport}
              className="export-button"
              disabled={!logs.length}
            >
              <ArrowDownTrayIcon className="button-icon" />
              导出日志
            </button>
          )}
        </div>
      </div>

      {/* 筛选器 */}
      <AuditFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filters={filters}
        onFiltersChange={setFilters}
        availableFilters={getAvailableFilters(logs)}
      />

      {/* 主内容区域 */}
      <div className="viewer-content">
        {error ? (
          <div className="error-state">
            <ExclamationTriangleIcon className="error-icon" />
            <p>加载审计日志失败</p>
            <button onClick={refresh}>重试</button>
          </div>
        ) : (
          <>
            {selectedView === 'timeline' && (
              <AuditTimeline
                logs={logs}
                isLoading={isLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
              />
            )}

            {selectedView === 'grouped' && (
              <AuditGroupedView
                logs={logs}
                isLoading={isLoading}
              />
            )}

            {selectedView === 'stats' && stats && (
              <AuditStats
                stats={stats}
                dateRange={dateRange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
```

### 2. AuditTimeline - 时间轴组件

```tsx
// src/components/employee/AuditTimeline.tsx
import React, { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { AuditLogItem } from './AuditLogItem';
import { groupLogsByDate } from '@/utils/auditUtils';

interface AuditTimelineProps {
  logs: AuditLog[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  logs,
  isLoading,
  hasMore,
  onLoadMore
}) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // 无限滚动加载
  useInfiniteScroll({
    target: loadMoreRef,
    onIntersect: onLoadMore,
    enabled: hasMore && !isLoading
  });

  // 按日期分组
  const groupedLogs = React.useMemo(() => 
    groupLogsByDate(logs), [logs]
  );

  if (!isLoading && logs.length === 0) {
    return (
      <div className="empty-timeline">
        <DocumentTextIcon className="empty-icon" />
        <p>暂无审计日志</p>
      </div>
    );
  }

  return (
    <div className="audit-timeline">
      <AnimatePresence>
        {Object.entries(groupedLogs).map(([date, dayLogs]) => (
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="timeline-day"
          >
            {/* 日期标签 */}
            <div className="day-header">
              <div className="date-label">
                <CalendarIcon className="date-icon" />
                <span>{formatDate(date)}</span>
              </div>
              <span className="day-count">{dayLogs.length} 条记录</span>
            </div>

            {/* 时间轴线 */}
            <div className="timeline-line" />

            {/* 日志项 */}
            <div className="day-logs">
              {dayLogs.map((log, index) => (
                <AuditLogItem
                  key={log.id}
                  log={log}
                  isFirst={index === 0}
                  isLast={index === dayLogs.length - 1}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 加载更多 */}
      {hasMore && (
        <div ref={loadMoreRef} className="load-more">
          {isLoading ? (
            <div className="loading-spinner" />
          ) : (
            <p>向下滚动加载更多</p>
          )}
        </div>
      )}
    </div>
  );
};
```

### 3. AuditLogItem - 单条日志组件

```tsx
// src/components/employee/AuditLogItem.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserIcon, 
  ClockIcon, 
  ChevronDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { DiffViewer } from './DiffViewer';
import { getOperationIcon, getOperationColor } from '@/utils/auditUtils';

interface AuditLogItemProps {
  log: AuditLog;
  isFirst: boolean;
  isLast: boolean;
}

export const AuditLogItem: React.FC<AuditLogItemProps> = ({
  log,
  isFirst,
  isLast
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const operationIcon = getOperationIcon(log.operation_type);
  const operationColor = getOperationColor(log.operation_type);

  const handleRevert = async () => {
    if (!confirm('确定要回滚到此版本吗？')) return;

    try {
      await revertToVersion(log);
      toast.success('回滚成功');
    } catch (error) {
      toast.error('回滚失败：' + error.message);
    }
  };

  return (
    <motion.div
      layout
      className={`audit-log-item ${isExpanded ? 'expanded' : ''}`}
    >
      {/* 时间轴节点 */}
      <div className={`timeline-node ${operationColor}`}>
        {operationIcon}
      </div>

      {/* 日志内容 */}
      <div className="log-content">
        {/* 摘要信息 */}
        <div 
          className="log-summary"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="summary-main">
            <h4 className="operation-title">
              {getOperationTitle(log)}
            </h4>
            <p className="operation-description">
              {getOperationDescription(log)}
            </p>
          </div>

          <div className="summary-meta">
            <div className="meta-item">
              <ClockIcon className="meta-icon" />
              <span>{formatTime(log.operated_at)}</span>
            </div>
            <div className="meta-item">
              <UserIcon className="meta-icon" />
              <span>{log.operator?.name || '系统'}</span>
            </div>
            
            <ChevronDownIcon 
              className={`expand-icon ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* 展开的详细信息 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="log-details"
            >
              {/* 变更字段列表 */}
              {log.changed_fields && log.changed_fields.length > 0 && (
                <div className="changed-fields">
                  <h5>变更字段</h5>
                  <div className="fields-grid">
                    {log.changed_fields.map(field => (
                      <FieldChange
                        key={field}
                        fieldName={field}
                        oldValue={log.old_data?.[field]}
                        newValue={log.new_data?.[field]}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 变更原因 */}
              {log.reason && (
                <div className="change-reason">
                  <h5>变更原因</h5>
                  <p>{log.reason}</p>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="log-actions">
                <button
                  onClick={() => setShowDiff(!showDiff)}
                  className="action-button"
                >
                  查看完整对比
                </button>
                
                {canRevert(log) && (
                  <button
                    onClick={handleRevert}
                    className="action-button revert"
                  >
                    <ArrowPathIcon className="button-icon" />
                    回滚到此版本
                  </button>
                )}
              </div>

              {/* Diff 查看器 */}
              {showDiff && (
                <DiffViewer
                  oldData={log.old_data}
                  newData={log.new_data}
                  changedFields={log.changed_fields}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// 字段变更组件
const FieldChange: React.FC<{
  fieldName: string;
  oldValue: any;
  newValue: any;
}> = ({ fieldName, oldValue, newValue }) => {
  const fieldLabel = getFieldLabel(fieldName);
  
  return (
    <div className="field-change">
      <div className="field-label">{fieldLabel}</div>
      <div className="field-values">
        <span className="old-value">
          {formatFieldValue(fieldName, oldValue) || '(空)'}
        </span>
        <ArrowRightIcon className="change-arrow" />
        <span className="new-value">
          {formatFieldValue(fieldName, newValue) || '(空)'}
        </span>
      </div>
    </div>
  );
};
```

### 4. DiffViewer - 差异对比组件

```tsx
// src/components/employee/DiffViewer.tsx
import React, { useMemo } from 'react';
import { diffJson } from 'diff';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface DiffViewerProps {
  oldData: any;
  newData: any;
  changedFields?: string[];
  viewMode?: 'unified' | 'split';
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldData,
  newData,
  changedFields = [],
  viewMode = 'unified'
}) => {
  const diffResult = useMemo(() => {
    // 如果指定了变更字段，只比较这些字段
    const filteredOld = changedFields.length > 0
      ? pick(oldData, changedFields)
      : oldData;
    const filteredNew = changedFields.length > 0
      ? pick(newData, changedFields)
      : newData;

    return diffJson(filteredOld || {}, filteredNew || {});
  }, [oldData, newData, changedFields]);

  if (viewMode === 'unified') {
    return (
      <div className="diff-viewer unified">
        <div className="diff-content">
          {diffResult.map((part, index) => (
            <div
              key={index}
              className={`diff-line ${
                part.added ? 'added' : part.removed ? 'removed' : 'unchanged'
              }`}
            >
              <span className="diff-marker">
                {part.added ? '+' : part.removed ? '-' : ' '}
              </span>
              <pre className="diff-text">{part.value}</pre>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Split view
  return (
    <div className="diff-viewer split">
      <div className="diff-side old">
        <h6>变更前</h6>
        <SyntaxHighlighter
          language="json"
          style={vscDarkPlus}
          customStyle={{ margin: 0 }}
        >
          {JSON.stringify(oldData || {}, null, 2)}
        </SyntaxHighlighter>
      </div>
      
      <div className="diff-side new">
        <h6>变更后</h6>
        <SyntaxHighlighter
          language="json"
          style={vscDarkPlus}
          customStyle={{ margin: 0 }}
        >
          {JSON.stringify(newData || {}, null, 2)}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
```

### 5. AuditStats - 统计分析组件

```tsx
// src/components/employee/AuditStats.tsx
import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface AuditStatsProps {
  stats: AuditStatistics;
  dateRange: DateRange;
}

export const AuditStats: React.FC<AuditStatsProps> = ({
  stats,
  dateRange
}) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="audit-stats">
      {/* 概览卡片 */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">
            <DocumentTextIcon />
          </div>
          <div className="stat-content">
            <h4>总变更次数</h4>
            <p className="stat-value">{stats.totalChanges}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ClockIcon />
          </div>
          <div className="stat-content">
            <h4>最近7天变更</h4>
            <p className="stat-value">{stats.recentChanges}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <UserGroupIcon />
          </div>
          <div className="stat-content">
            <h4>活跃操作人</h4>
            <p className="stat-value">{stats.topOperators.length}</p>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="stats-charts">
        {/* 每日活动趋势 */}
        <div className="chart-container">
          <h3>变更趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.activityByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => dayjs(value).format('MM-DD')}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => dayjs(value).format('YYYY-MM-DD')}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3B82F6" 
                name="变更次数"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 热门变更字段 */}
        <div className="chart-container">
          <h3>热门变更字段</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={stats.topChangedFields}
              layout="horizontal"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                dataKey="field" 
                type="category"
                width={100}
                tickFormatter={(value) => getFieldLabel(value)}
              />
              <Tooltip />
              <Bar 
                dataKey="count" 
                fill="#10B981"
                name="变更次数"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 操作类型分布 */}
        <div className="chart-container">
          <h3>操作类型分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.operationTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => 
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.operationTypes.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 操作人排行 */}
        <div className="chart-container">
          <h3>操作人排行</h3>
          <div className="operator-ranking">
            {stats.topOperators.map((operator, index) => (
              <div key={operator.id} className="operator-item">
                <div className="operator-rank">#{index + 1}</div>
                <div className="operator-info">
                  <span className="operator-name">{operator.name}</span>
                  <span className="operator-role">{operator.role}</span>
                </div>
                <div className="operator-count">{operator.count} 次</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 6. 数据库触发器实现

```sql
-- 创建审计日志函数
CREATE OR REPLACE FUNCTION audit_log_changes() RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[];
  user_id UUID;
BEGIN
  -- 获取当前用户ID
  user_id := auth.uid();
  
  -- 根据操作类型设置数据
  IF TG_OP = 'DELETE' THEN
    old_data := row_to_json(OLD)::JSONB;
    new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_data := NULL;
    new_data := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := row_to_json(OLD)::JSONB;
    new_data := row_to_json(NEW)::JSONB;
    
    -- 计算变更的字段
    SELECT array_agg(key) INTO changed_fields
    FROM (
      SELECT key
      FROM jsonb_each(old_data)
      WHERE NOT (old_data->key = new_data->key)
    ) AS changes;
  END IF;

  -- 插入审计日志
  INSERT INTO audit_logs (
    table_name,
    record_id,
    operation_type,
    operated_by,
    old_data,
    new_data,
    changed_fields,
    metadata
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    user_id,
    old_data,
    new_data,
    changed_fields,
    jsonb_build_object(
      'schema', TG_TABLE_SCHEMA,
      'timestamp', NOW(),
      'session_id', current_setting('request.session', true)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 为各个表创建触发器
CREATE TRIGGER audit_trigger_employees
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_trigger_employee_education
  AFTER INSERT OR UPDATE OR DELETE ON employee_education
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_trigger_employee_job_history
  AFTER INSERT OR UPDATE OR DELETE ON employee_job_history
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- 创建审计日志查询视图
CREATE OR REPLACE VIEW v_audit_logs_with_details AS
SELECT 
  al.*,
  u.name as operator_name,
  u.email as operator_email,
  up.avatar_url as operator_avatar,
  r.name as operator_role
FROM audit_logs al
LEFT JOIN auth.users u ON al.operated_by = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN roles r ON up.role_id = r.id;

-- 创建索引优化查询
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id, operated_at DESC);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, operated_at DESC);
CREATE INDEX idx_audit_logs_operator ON audit_logs(operated_by, operated_at DESC);
CREATE INDEX idx_audit_logs_operation ON audit_logs(operation_type, operated_at DESC);
```

### 7. 实时订阅Hook

```tsx
// src/hooks/useRealtimeAuditLogs.ts
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeAuditLogsOptions {
  employeeId?: string;
  tableName?: string;
  onNewLog: (log: AuditLog) => void;
  onError?: (error: Error) => void;
}

export const useRealtimeAuditLogs = ({
  employeeId,
  tableName,
  onNewLog,
  onError
}: UseRealtimeAuditLogsOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // 构建订阅过滤器
    let filter = 'event=INSERT';
    if (employeeId) {
      filter += `,record_id=eq.${employeeId}`;
    }
    if (tableName) {
      filter += `,table_name=eq.${tableName}`;
    }

    // 创建订阅
    channelRef.current = supabase
      .channel(`audit-logs-${employeeId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: employeeId ? `record_id=eq.${employeeId}` : undefined
        },
        async (payload) => {
          try {
            // 获取完整的日志信息（包含操作人信息）
            const { data, error } = await supabase
              .from('v_audit_logs_with_details')
              .select('*')
              .eq('id', payload.new.id)
              .single();

            if (error) throw error;
            onNewLog(data);
          } catch (error) {
            onError?.(error as Error);
          }
        }
      )
      .subscribe();

    // 清理函数
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [employeeId, tableName, onNewLog, onError]);

  return channelRef.current;
};
```

## 样式设计

```scss
// src/styles/components/audit-log-viewer.scss
.audit-log-viewer {
  @apply space-y-6;

  .viewer-header {
    @apply flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4;

    .view-tabs {
      @apply flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg;

      .tab {
        @apply flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 rounded-md transition-all duration-200 hover:text-gray-900 dark:hover:text-gray-100;

        &.active {
          @apply bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm;
        }

        .tab-icon {
          @apply w-4 h-4;
        }
      }
    }

    .header-actions {
      .export-button {
        @apply flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed;

        .button-icon {
          @apply w-4 h-4;
        }
      }
    }
  }

  .viewer-content {
    @apply bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700;
  }
}

// 时间轴样式
.audit-timeline {
  @apply p-6 space-y-8;

  .timeline-day {
    @apply relative;

    .day-header {
      @apply flex items-center justify-between mb-4;

      .date-label {
        @apply flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100;

        .date-icon {
          @apply w-5 h-5 text-gray-500 dark:text-gray-400;
        }
      }

      .day-count {
        @apply text-sm text-gray-500 dark:text-gray-400;
      }
    }

    .timeline-line {
      @apply absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700;
    }

    .day-logs {
      @apply space-y-4;
    }
  }

  .empty-timeline {
    @apply text-center py-12;

    .empty-icon {
      @apply w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500;
    }

    p {
      @apply text-gray-600 dark:text-gray-400;
    }
  }

  .load-more {
    @apply text-center py-4;

    .loading-spinner {
      @apply inline-block w-6 h-6 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin;
    }

    p {
      @apply text-sm text-gray-500 dark:text-gray-400;
    }
  }
}

// 日志项样式
.audit-log-item {
  @apply relative pl-12;

  .timeline-node {
    @apply absolute left-0 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md;

    &.blue { @apply bg-blue-500; }
    &.green { @apply bg-green-500; }
    &.yellow { @apply bg-yellow-500; }
    &.red { @apply bg-red-500; }
    &.gray { @apply bg-gray-500; }

    svg {
      @apply w-6 h-6;
    }
  }

  .log-content {
    @apply bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden;

    .log-summary {
      @apply p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200;

      .summary-main {
        @apply mb-2;

        .operation-title {
          @apply text-base font-medium text-gray-900 dark:text-gray-100 mb-1;
        }

        .operation-description {
          @apply text-sm text-gray-600 dark:text-gray-400;
        }
      }

      .summary-meta {
        @apply flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400;

        .meta-item {
          @apply flex items-center gap-1;

          .meta-icon {
            @apply w-3 h-3;
          }
        }

        .expand-icon {
          @apply w-4 h-4 ml-auto transform transition-transform duration-200;

          &.rotate-180 {
            @apply rotate-180;
          }
        }
      }
    }

    .log-details {
      @apply border-t border-gray-200 dark:border-gray-600 p-4 space-y-4;

      .changed-fields {
        h5 {
          @apply text-sm font-medium text-gray-900 dark:text-gray-100 mb-2;
        }

        .fields-grid {
          @apply grid grid-cols-1 sm:grid-cols-2 gap-3;
        }
      }

      .change-reason {
        @apply bg-blue-50 dark:bg-blue-900/20 p-3 rounded;

        h5 {
          @apply text-sm font-medium text-blue-900 dark:text-blue-100 mb-1;
        }

        p {
          @apply text-sm text-blue-700 dark:text-blue-300;
        }
      }

      .log-actions {
        @apply flex gap-2;

        .action-button {
          @apply px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700;

          &.revert {
            @apply text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20;
          }

          .button-icon {
            @apply w-4 h-4 inline-block mr-1;
          }
        }
      }
    }
  }
}

// 字段变更样式
.field-change {
  @apply bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600;

  .field-label {
    @apply text-xs font-medium text-gray-500 dark:text-gray-400 mb-1;
  }

  .field-values {
    @apply flex items-center gap-2 text-sm;

    .old-value {
      @apply text-red-600 dark:text-red-400 line-through;
    }

    .change-arrow {
      @apply w-4 h-4 text-gray-400;
    }

    .new-value {
      @apply text-green-600 dark:text-green-400 font-medium;
    }
  }
}

// Diff 查看器样式
.diff-viewer {
  @apply mt-4 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600;

  &.unified {
    .diff-content {
      @apply bg-gray-900 text-gray-100 font-mono text-xs p-4 overflow-x-auto;

      .diff-line {
        @apply flex;

        &.added {
          @apply bg-green-900/30;

          .diff-marker { @apply text-green-400; }
        }

        &.removed {
          @apply bg-red-900/30;

          .diff-marker { @apply text-red-400; }
        }

        .diff-marker {
          @apply w-4 text-gray-500 flex-shrink-0;
        }

        .diff-text {
          @apply flex-1 whitespace-pre;
        }
      }
    }
  }

  &.split {
    @apply flex;

    .diff-side {
      @apply flex-1 overflow-hidden;

      h6 {
        @apply px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700;
      }

      &.old {
        @apply border-r border-gray-300 dark:border-gray-600;

        h6 { @apply bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300; }
      }

      &.new {
        h6 { @apply bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300; }
      }
    }
  }
}

// 统计图表样式
.audit-stats {
  @apply p-6 space-y-6;

  .stats-overview {
    @apply grid grid-cols-1 sm:grid-cols-3 gap-4;

    .stat-card {
      @apply flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg;

      .stat-icon {
        @apply w-12 h-12 bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-lg flex items-center justify-center;

        svg {
          @apply w-6 h-6;
        }
      }

      .stat-content {
        h4 {
          @apply text-sm font-medium text-gray-600 dark:text-gray-400;
        }

        .stat-value {
          @apply text-2xl font-bold text-gray-900 dark:text-gray-100;
        }
      }
    }
  }

  .stats-charts {
    @apply grid grid-cols-1 lg:grid-cols-2 gap-6;

    .chart-container {
      @apply bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg;

      h3 {
        @apply text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4;
      }
    }

    .operator-ranking {
      @apply space-y-2;

      .operator-item {
        @apply flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded;

        .operator-rank {
          @apply text-lg font-bold text-gray-500 dark:text-gray-400 w-8;
        }

        .operator-info {
          @apply flex-1;

          .operator-name {
            @apply block text-sm font-medium text-gray-900 dark:text-gray-100;
          }

          .operator-role {
            @apply block text-xs text-gray-500 dark:text-gray-400;
          }
        }

        .operator-count {
          @apply text-sm font-medium text-gray-600 dark:text-gray-400;
        }
      }
    }
  }
}
```

## 性能优化策略

### 1. 虚拟滚动

```typescript
// src/hooks/useVirtualScroll.ts
export const useVirtualScroll = <T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: VirtualScrollOptions<T>) => {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
};
```

### 2. 查询优化

```typescript
// src/services/auditLog.service.ts
export class AuditLogService {
  // 使用游标分页而不是 offset
  static async fetchLogs({
    employeeId,
    cursor,
    limit = 20,
    filters
  }: FetchLogsParams): Promise<PaginatedResult<AuditLog>> {
    let query = supabase
      .from('v_audit_logs_with_details')
      .select('*', { count: 'exact' });

    // 应用筛选器
    if (employeeId) {
      query = query.eq('record_id', employeeId);
    }

    if (filters.dateRange) {
      query = query
        .gte('operated_at', filters.dateRange.start)
        .lte('operated_at', filters.dateRange.end);
    }

    if (filters.operationTypes?.length) {
      query = query.in('operation_type', filters.operationTypes);
    }

    // 使用游标分页
    if (cursor) {
      query = query.lt('operated_at', cursor);
    }

    // 排序并限制结果
    const { data, error, count } = await query
      .order('operated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      nextCursor: data?.[data.length - 1]?.operated_at || null
    };
  }

  // 批量获取操作人信息
  static async fetchOperatorsBatch(userIds: string[]): Promise<Map<string, User>> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, roles(*)')
      .in('user_id', userIds);

    if (error) throw error;

    const userMap = new Map<string, User>();
    data?.forEach(user => {
      userMap.set(user.user_id, user);
    });

    return userMap;
  }
}
```

## 总结

审计日志展示模块通过以下特性提供全面的数据追踪能力：

1. **自动记录**：数据库触发器自动捕获所有数据变更
2. **实时更新**：Supabase Realtime 实现新日志即时显示
3. **直观展示**：时间轴视图清晰展示变更历史
4. **强大分析**：统计图表帮助发现变更模式
5. **详细对比**：Diff 视图精确展示字段变化
6. **灵活筛选**：多维度筛选快速定位目标日志
7. **安全可靠**：完整的权限控制和数据保护

这个设计为企业级应用提供了完善的审计追踪解决方案。