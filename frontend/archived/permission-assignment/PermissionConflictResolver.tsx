/**
 * 权限冲突解决器组件
 * 
 * 检测并解决权限冲突，提供智能解决方案建议
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { 
  PermissionConflict,
  OverrideConflict,
  OverrideResolution
} from '@/types/permission-assignment';
import { usePermissionOverride } from '@/hooks/permissions/usePermissionOverride';
import { usePermissionAssignment } from '@/hooks/permissions/usePermissionAssignment';
import { useTranslation } from '@/hooks/useTranslation';
import { ConfirmModal } from '@/components/common/ConfirmModal';

interface PermissionConflictResolverProps {
  userId?: string; // 如果指定，只显示该用户的冲突
  onConflictResolved?: (conflictId: string) => void;
  onClose?: () => void;
  className?: string;
}

interface ConflictResolutionPlan {
  conflictId: string;
  resolution: OverrideResolution;
  reason: string;
  impact: {
    affectedUsers: string[];
    permissionChanges: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

interface ResolutionSuggestion {
  type: 'remove_lower_priority' | 'merge_overrides' | 'escalate_to_admin' | 'create_exception';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  autoApplicable: boolean;
  metadata?: Record<string, any>;
}

// 转换函数：将 OverrideConflict 转换为 PermissionConflict
function convertOverrideConflictToPermissionConflict(overrideConflict: OverrideConflict, userId?: string): PermissionConflict {
  return {
    id: overrideConflict.id,
    userId: userId || 'unknown',
    userName: userId || 'Unknown User', // 这里可以后续优化，通过用户信息获取真实用户名
    conflictType: 'override_conflict',
    severity: overrideConflict.severity,
    title: overrideConflict.title,
    description: overrideConflict.description,
    involvedPermissions: overrideConflict.involvedOverrides.map(override => ({
      permissionId: override.permissionId,
      permissionName: override.permissionId, // 这里可以后续优化，获取真实权限名
      sources: [{
        type: 'override' as const,
        sourceId: override.id,
        sourceName: `Override ${override.id}`,
        priority: 100 // Override 通常有高优先级
      }]
    })),
    suggestedResolution: overrideConflict.suggestedResolution?.description,
    autoResolvable: overrideConflict.suggestedResolution?.type === 'remove_lower_priority',
    detectedAt: overrideConflict.detectedAt,
    resolvedAt: undefined,
    resolvedBy: undefined,
    resolution: undefined
  };
}

export function PermissionConflictResolver({
  userId,
  onConflictResolved,
  onClose,
  className = ''
}: PermissionConflictResolverProps) {
  const { t } = useTranslation();
  const {
    conflicts,
    detectConflicts,
    resolveConflict,
    getConflictSuggestions,
    loading: overrideLoading,
    refreshData
  } = usePermissionOverride();

  const {
    conflicts: allConflicts,
    refreshData: refreshAssignmentData
  } = usePermissionAssignment();

  const [filteredConflicts, setFilteredConflicts] = useState<PermissionConflict[]>([]);
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set());
  const [resolutionPlans, setResolutionPlans] = useState<ConflictResolutionPlan[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, ResolutionSuggestion[]>>({});
  const [activeConflictId, setActiveConflictId] = useState<string | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [autoResolveMode, setAutoResolveMode] = useState(false);
  const [processingConflicts, setProcessingConflicts] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [filterType, setFilterType] = useState<'all' | string>('all');

  const loading = overrideLoading;

  // 加载冲突数据
  const loadConflicts = useCallback(async () => {
    try {
      let conflictsData = allConflicts;
      
      if (userId) {
        const overrideConflicts = await detectConflicts(userId);
        conflictsData = overrideConflicts.map(conflict => 
          convertOverrideConflictToPermissionConflict(conflict, userId)
        );
      }

      // 应用过滤器
      let filtered = conflictsData;
      
      if (filterSeverity !== 'all') {
        filtered = filtered.filter(c => c.severity === filterSeverity);
      }
      
      if (filterType !== 'all') {
        filtered = filtered.filter(c => c.conflictType === filterType);
      }

      setFilteredConflicts(filtered);

      // 为每个冲突加载解决建议
      const newSuggestions: Record<string, ResolutionSuggestion[]> = {};
      for (const conflict of filtered) {
        try {
          const conflictSuggestions = await getConflictSuggestions(conflict.id);
          newSuggestions[conflict.id] = conflictSuggestions;
        } catch (error) {
          console.error(`Failed to load suggestions for conflict ${conflict.id}:`, error);
          newSuggestions[conflict.id] = [];
        }
      }
      setSuggestions(newSuggestions);

    } catch (error) {
      console.error('Failed to load conflicts:', error);
    }
  }, [userId, allConflicts, detectConflicts, getConflictSuggestions, filterSeverity, filterType]);

  useEffect(() => {
    loadConflicts();
  }, [loadConflicts]);

  // 冲突类型统计
  const conflictStats = useMemo(() => {
    const stats = {
      total: filteredConflicts.length,
      critical: filteredConflicts.filter(c => c.severity === 'critical').length,
      high: filteredConflicts.filter(c => c.severity === 'high').length,
      medium: filteredConflicts.filter(c => c.severity === 'medium').length,
      low: filteredConflicts.filter(c => c.severity === 'low').length,
      byType: {} as Record<string, number>
    };

    filteredConflicts.forEach(conflict => {
      stats.byType[conflict.conflictType] = (stats.byType[conflict.conflictType] || 0) + 1;
    });

    return stats;
  }, [filteredConflicts]);

  // 处理冲突选择
  const handleConflictSelection = useCallback((conflictId: string, selected: boolean) => {
    setSelectedConflicts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(conflictId);
      } else {
        newSet.delete(conflictId);
      }
      return newSet;
    });
  }, []);

  // 全选/取消全选
  const handleSelectAll = useCallback((selectAll: boolean) => {
    if (selectAll) {
      setSelectedConflicts(new Set(filteredConflicts.map(c => c.id)));
    } else {
      setSelectedConflicts(new Set());
    }
  }, [filteredConflicts]);

  // 自动解决冲突
  const handleAutoResolve = useCallback(async () => {
    setAutoResolveMode(true);
    setProcessingConflicts(true);

    try {
      const autoResolvableConflicts = filteredConflicts.filter(conflict => {
        const conflictSuggestions = suggestions[conflict.id] || [];
        return conflictSuggestions.some(s => s.autoApplicable && s.impact === 'low');
      });

      let resolvedCount = 0;
      const errors: string[] = [];

      for (const conflict of autoResolvableConflicts) {
        try {
          const conflictSuggestions = suggestions[conflict.id] || [];
          const autoSuggestion = conflictSuggestions.find(s => s.autoApplicable && s.impact === 'low');
          
          if (autoSuggestion) {
            const resolution: OverrideResolution = {
              type: autoSuggestion.type,
              description: autoSuggestion.description,
              parameters: autoSuggestion.metadata
            };

            await resolveConflict(conflict.id, resolution);
            resolvedCount++;
            onConflictResolved?.(conflict.id);
          }
        } catch (error) {
          errors.push(`冲突 ${conflict.title}: ${error}`);
        }
      }

      if (resolvedCount > 0) {
        await loadConflicts();
        await refreshAssignmentData();
      }

      if (errors.length === 0) {
        alert(t('admin.permissions.autoResolveSuccess', { count: resolvedCount }));
      } else {
        alert(t('admin.permissions.autoResolvePartial', { 
          resolved: resolvedCount, 
          errors: errors.length 
        }));
      }

    } catch (error) {
      console.error('Auto resolve failed:', error);
      alert(t('admin.permissions.autoResolveFailed'));
    } finally {
      setAutoResolveMode(false);
      setProcessingConflicts(false);
    }
  }, [filteredConflicts, suggestions, resolveConflict, onConflictResolved, loadConflicts, refreshAssignmentData, t]);

  // 手动解决冲突
  const handleManualResolve = useCallback(async (
    conflictId: string,
    resolution: OverrideResolution,
    reason: string
  ) => {
    try {
      await resolveConflict(conflictId, resolution);
      onConflictResolved?.(conflictId);
      await loadConflicts();
      await refreshAssignmentData();
      setShowResolutionModal(false);
      setActiveConflictId(null);
    } catch (error) {
      console.error('Manual resolve failed:', error);
      alert(t('admin.permissions.resolveConflictFailed'));
    }
  }, [resolveConflict, onConflictResolved, loadConflicts, refreshAssignmentData, t]);

  // 批量解决冲突
  const handleBatchResolve = useCallback(async () => {
    if (selectedConflicts.size === 0) return;

    setProcessingConflicts(true);
    let resolvedCount = 0;
    const errors: string[] = [];

    try {
      for (const conflictId of selectedConflicts) {
        try {
          const conflictSuggestions = suggestions[conflictId] || [];
          const bestSuggestion = conflictSuggestions
            .filter(s => s.impact !== 'high')
            .sort((a, b) => a.impact === 'low' ? -1 : b.impact === 'low' ? 1 : 0)[0];

          if (bestSuggestion) {
            const resolution: OverrideResolution = {
              type: bestSuggestion.type,
              description: bestSuggestion.description,
              parameters: bestSuggestion.metadata
            };

            await resolveConflict(conflictId, resolution);
            resolvedCount++;
            onConflictResolved?.(conflictId);
          }
        } catch (error) {
          errors.push(`冲突 ${conflictId}: ${error}`);
        }
      }

      if (resolvedCount > 0) {
        await loadConflicts();
        await refreshAssignmentData();
        setSelectedConflicts(new Set());
      }

      if (errors.length === 0) {
        alert(t('admin.permissions.batchResolveSuccess', { count: resolvedCount }));
      } else {
        alert(t('admin.permissions.batchResolvePartial', { 
          resolved: resolvedCount, 
          errors: errors.length 
        }));
      }

    } catch (error) {
      console.error('Batch resolve failed:', error);
      alert(t('admin.permissions.batchResolveFailed'));
    } finally {
      setProcessingConflicts(false);
    }
  }, [selectedConflicts, suggestions, resolveConflict, onConflictResolved, loadConflicts, refreshAssignmentData, t]);

  // 获取严重程度样式
  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'badge-error';
      case 'high': return 'badge-warning';
      case 'medium': return 'badge-info';
      case 'low': return 'badge-success';
      default: return 'badge-neutral';
    }
  };

  // 获取冲突类型图标
  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'role_permission_conflict': return '👥';
      case 'override_conflict': return '⚡';
      case 'inheritance_conflict': return '🔗';
      default: return '⚠️';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className={`permission-conflict-resolver ${className}`}>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {/* 标题和关闭按钮 */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="card-title text-2xl">
              权限冲突解决器
              {userId && (
                <div className="badge badge-primary">用户专用</div>
              )}
            </h3>
            {onClose && (
              <button className="btn btn-ghost btn-sm" onClick={onClose}>
                ✕
              </button>
            )}
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">总冲突</div>
              <div className="stat-value text-primary">{conflictStats.total}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">严重</div>
              <div className="stat-value text-error">{conflictStats.critical}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">高</div>
              <div className="stat-value text-warning">{conflictStats.high}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">中</div>
              <div className="stat-value text-info">{conflictStats.medium}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">低</div>
              <div className="stat-value text-success">{conflictStats.low}</div>
            </div>
          </div>

          {/* 工具栏 */}
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex gap-4 items-center">
              {/* 过滤器 */}
              <div className="form-control">
                <select
                  className="select select-bordered select-sm"
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as any)}
                >
                  <option value="all">所有严重程度</option>
                  <option value="critical">严重</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>

              <div className="form-control">
                <select
                  className="select select-bordered select-sm"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">所有类型</option>
                  {Object.keys(conflictStats.byType).map(type => (
                    <option key={type} value={type}>
                      {type} ({conflictStats.byType[type]})
                    </option>
                  ))}
                </select>
              </div>

              {/* 选择控制 */}
              <div className="form-control">
                <label className="cursor-pointer label">
                  <input 
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedConflicts.size === filteredConflicts.length && filteredConflicts.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <span className="label-text ml-2">全选 ({selectedConflicts.size})</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              {/* 操作按钮 */}
              <button
                className="btn btn-success btn-sm"
                onClick={handleAutoResolve}
                disabled={processingConflicts || conflictStats.total === 0}
              >
                {processingConflicts ? '处理中...' : '自动解决'}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleBatchResolve}
                disabled={selectedConflicts.size === 0 || processingConflicts}
              >
                批量解决 ({selectedConflicts.size})
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={loadConflicts}
              >
                刷新
              </button>
            </div>
          </div>

          {/* 冲突列表 */}
          {filteredConflicts.length === 0 ? (
            <div className="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>🎉 没有发现权限冲突！系统权限配置良好。</span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConflicts.map(conflict => (
                <div key={conflict.id} className="card border border-base-300 bg-base-50">
                  <div className="card-body">
                    <div className="flex items-start gap-4">
                      {/* 选择框 */}
                      <input
                        type="checkbox"
                        className="checkbox mt-1"
                        checked={selectedConflicts.has(conflict.id)}
                        onChange={(e) => handleConflictSelection(conflict.id, e.target.checked)}
                      />

                      {/* 冲突信息 */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{getConflictTypeIcon(conflict.conflictType)}</span>
                          <h4 className="font-bold text-lg">{conflict.title}</h4>
                          <div className={`badge ${getSeverityClass(conflict.severity)}`}>
                            {conflict.severity}
                          </div>
                          <div className="badge badge-outline">
                            {conflict.conflictType}
                          </div>
                        </div>

                        <p className="text-base-content/80 mb-3">{conflict.description}</p>

                        {/* 涉及的权限 */}
                        {conflict.involvedPermissions.length > 0 && (
                          <div className="mb-3">
                            <div className="text-sm font-medium mb-1">涉及权限:</div>
                            <div className="flex flex-wrap gap-2">
                              {conflict.involvedPermissions.map(permission => (
                                <div key={permission.permissionId} className="badge badge-outline">
                                  {permission.permissionName}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 解决建议 */}
                        {suggestions[conflict.id] && suggestions[conflict.id].length > 0 && (
                          <div className="mb-3">
                            <div className="text-sm font-medium mb-2">建议解决方案:</div>
                            <div className="grid gap-2">
                              {suggestions[conflict.id].map((suggestion, index) => (
                                <div key={index} className="flex items-center justify-between p-2 border rounded">
                                  <div className="flex-1">
                                    <div className="font-medium">{suggestion.title}</div>
                                    <div className="text-sm text-base-content/70">{suggestion.description}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className={`badge badge-sm ${
                                      suggestion.impact === 'low' ? 'badge-success' :
                                      suggestion.impact === 'medium' ? 'badge-warning' :
                                      'badge-error'
                                    }`}>
                                      {suggestion.impact} 影响
                                    </div>
                                    {suggestion.autoApplicable && (
                                      <div className="badge badge-sm badge-info">自动</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 检测时间 */}
                        <div className="text-xs text-base-content/50">
                          检测时间: {new Date(conflict.detectedAt).toLocaleString()}
                          {conflict.resolvedAt && (
                            <span className="ml-4 text-success">
                              已解决: {new Date(conflict.resolvedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex flex-col gap-2">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setActiveConflictId(conflict.id);
                            setShowResolutionModal(true);
                          }}
                        >
                          手动解决
                        </button>
                        {suggestions[conflict.id]?.some(s => s.autoApplicable) && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={async () => {
                              const autoSuggestion = suggestions[conflict.id].find(s => s.autoApplicable);
                              if (autoSuggestion) {
                                const resolution: OverrideResolution = {
                                  type: autoSuggestion.type,
                                  description: autoSuggestion.description,
                                  parameters: autoSuggestion.metadata
                                };
                                await handleManualResolve(conflict.id, resolution, '自动解决');
                              }
                            }}
                            disabled={processingConflicts}
                          >
                            自动解决
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 手动解决冲突模态框 */}
      {showResolutionModal && activeConflictId && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-5xl">
            <h3 className="font-bold text-lg mb-4">手动解决权限冲突</h3>
            
            {(() => {
              const conflict = filteredConflicts.find(c => c.id === activeConflictId);
              const conflictSuggestions = suggestions[activeConflictId] || [];
              
              return conflict ? (
                <div className="space-y-4">
                  <div className="alert alert-info">
                    <div>
                      <h4 className="font-bold">{conflict.title}</h4>
                      <p>{conflict.description}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">选择解决方案:</h4>
                    <div className="space-y-2">
                      {conflictSuggestions.map((suggestion, index) => (
                        <label key={index} className="cursor-pointer">
                          <input
                            type="radio"
                            name="resolution"
                            value={index}
                            className="radio mr-2"
                          />
                          <div className="inline-block">
                            <div className="font-medium">{suggestion.title}</div>
                            <div className="text-sm text-base-content/70">{suggestion.description}</div>
                            <div className="flex gap-2 mt-1">
                              <div className={`badge badge-xs ${
                                suggestion.impact === 'low' ? 'badge-success' :
                                suggestion.impact === 'medium' ? 'badge-warning' :
                                'badge-error'
                              }`}>
                                {suggestion.impact} 影响
                              </div>
                              {suggestion.autoApplicable && (
                                <div className="badge badge-xs badge-info">推荐</div>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">解决原因</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered"
                      placeholder="请说明解决此冲突的原因..."
                    ></textarea>
                  </div>

                  <div className="modal-action">
                    <button 
                      className="btn btn-ghost"
                      onClick={() => setShowResolutionModal(false)}
                    >
                      取消
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        // 这里应该获取选中的解决方案和原因，然后调用 handleManualResolve
                        // 简化处理，使用第一个建议
                        if (conflictSuggestions.length > 0) {
                          const resolution: OverrideResolution = {
                            type: conflictSuggestions[0].type,
                            description: conflictSuggestions[0].description,
                            parameters: conflictSuggestions[0].metadata
                          };
                          handleManualResolve(activeConflictId, resolution, '手动解决');
                        }
                      }}
                    >
                      确认解决
                    </button>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}