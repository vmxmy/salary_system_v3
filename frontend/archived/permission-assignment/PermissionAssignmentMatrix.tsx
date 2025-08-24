/**
 * 权限分配矩阵组件
 * 
 * 提供可视化的权限分配矩阵界面，支持拖拽分配和批量操作
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  PermissionMatrix,
  PermissionAssignment,
  ResourcePermissions,
  PermissionConflict
} from '@/types/permission-assignment';
import { usePermissionAssignment } from '@/hooks/permissions/usePermissionAssignment';
import { useTranslation } from '@/hooks/useTranslation';

interface PermissionAssignmentMatrixProps {
  userId?: string;
  onSelectionChange?: (selectedPermissions: string[]) => void;
  onAssignmentChange?: (userId: string, permissionId: string, isGranted: boolean) => void;
  readOnly?: boolean;
  showConflicts?: boolean;
  compactMode?: boolean;
  className?: string;
}

interface MatrixCell {
  userId: string;
  permissionId: string;
  isGranted: boolean;
  source: 'role' | 'direct' | 'override';
  hasConflict: boolean;
  conflictSeverity?: 'low' | 'medium' | 'high' | 'critical';
  expiresAt?: Date;
  isExpired: boolean;
}

interface ResourceGroup {
  resourceType: string;
  resourceName: string;
  permissions: Array<{
    permissionId: string;
    permissionName: string;
    actionType: string;
  }>;
}

export function PermissionAssignmentMatrix({
  userId,
  onSelectionChange,
  onAssignmentChange,
  readOnly = false,
  showConflicts = true,
  compactMode = false,
  className = ''
}: PermissionAssignmentMatrixProps) {
  const { t } = useTranslation();
  const {
    assignments,
    conflicts,
    getUserPermissionMatrix,
    assignPermission,
    revokePermission,
    loading
  } = usePermissionAssignment();

  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false);

  // 加载用户权限矩阵
  const loadMatrix = useCallback(async () => {
    if (!userId) return;
    
    try {
      const matrixData = await getUserPermissionMatrix(userId);
      setMatrix(matrixData);
    } catch (error) {
      console.error('Failed to load permission matrix:', error);
    }
  }, [userId, getUserPermissionMatrix]);

  useEffect(() => {
    if (userId) {
      loadMatrix();
    }
  }, [userId, loadMatrix]);

  // 构建资源分组
  const resourceGroups = useMemo<ResourceGroup[]>(() => {
    if (!matrix) return [];

    const groups: Record<string, ResourceGroup> = {};
    
    matrix.resources.forEach(resource => {
      if (!groups[resource.resourceType]) {
        groups[resource.resourceType] = {
          resourceType: resource.resourceType,
          resourceName: resource.resourceType,
          permissions: []
        };
      }

      resource.permissions.forEach(permission => {
        if (!groups[resource.resourceType].permissions.find(p => p.permissionId === permission.permissionId)) {
          groups[resource.resourceType].permissions.push({
            permissionId: permission.permissionId,
            permissionName: permission.permissionName,
            actionType: permission.actionType
          });
        }
      });
    });

    return Object.values(groups);
  }, [matrix]);

  // 过滤资源组
  const filteredResourceGroups = useMemo(() => {
    let filtered = resourceGroups;

    if (selectedResourceType !== 'all') {
      filtered = filtered.filter(group => group.resourceType === selectedResourceType);
    }

    if (filterText) {
      filtered = filtered.map(group => ({
        ...group,
        permissions: group.permissions.filter(permission =>
          permission.permissionName.toLowerCase().includes(filterText.toLowerCase()) ||
          permission.actionType.toLowerCase().includes(filterText.toLowerCase())
        )
      })).filter(group => group.permissions.length > 0);
    }

    if (showOnlyConflicts && matrix) {
      const conflictPermissionIds = new Set(
        conflicts.flatMap(conflict => 
          conflict.involvedPermissions.map(p => p.permissionId)
        )
      );

      filtered = filtered.map(group => ({
        ...group,
        permissions: group.permissions.filter(permission =>
          conflictPermissionIds.has(permission.permissionId)
        )
      })).filter(group => group.permissions.length > 0);
    }

    return filtered;
  }, [resourceGroups, selectedResourceType, filterText, showOnlyConflicts, conflicts, matrix]);

  // 构建矩阵单元格数据
  const matrixCells = useMemo<MatrixCell[][]>(() => {
    if (!matrix || filteredResourceGroups.length === 0) return [];

    const cells: MatrixCell[][] = [];
    const users = [matrix]; // 目前只支持单用户视图

    users.forEach((userMatrix, userIndex) => {
      filteredResourceGroups.forEach((group, groupIndex) => {
        group.permissions.forEach((permission, permissionIndex) => {
          const resource = userMatrix.resources.find(r => r.resourceType === group.resourceType);
          const permissionData = resource?.permissions.find(p => p.permissionId === permission.permissionId);
          
          const conflict = conflicts.find(c => 
            c.userId === userMatrix.userId &&
            c.involvedPermissions.some(p => p.permissionId === permission.permissionId)
          );

          const isExpired = permissionData?.source.expiresAt ? 
            new Date(permissionData.source.expiresAt) < new Date() : false;

          const cell: MatrixCell = {
            userId: userMatrix.userId,
            permissionId: permission.permissionId,
            isGranted: permissionData?.isGranted || false,
            source: (permissionData?.source.type as 'role' | 'direct' | 'override') || 'role',
            hasConflict: !!conflict,
            conflictSeverity: conflict?.severity,
            expiresAt: permissionData?.source.expiresAt ? new Date(permissionData.source.expiresAt) : undefined,
            isExpired
          };

          if (!cells[userIndex]) {
            cells[userIndex] = [];
          }
          cells[userIndex].push(cell);
        });
      });
    });

    return cells;
  }, [matrix, filteredResourceGroups, conflicts]);

  // 处理单元格点击
  const handleCellClick = useCallback(async (
    userIndex: number,
    permissionIndex: number,
    event: React.MouseEvent
  ) => {
    if (readOnly || !matrix) return;

    const cell = matrixCells[userIndex]?.[permissionIndex];
    if (!cell) return;

    event.preventDefault();
    
    try {
      if (cell.isGranted) {
        await revokePermission(cell.userId, cell.permissionId, '手动撤销权限');
      } else {
        await assignPermission(cell.userId, cell.permissionId, {
          reason: '手动分配权限'
        });
      }

      onAssignmentChange?.(cell.userId, cell.permissionId, !cell.isGranted);
      await loadMatrix(); // 刷新矩阵数据
    } catch (error) {
      console.error('Failed to toggle permission:', error);
    }
  }, [readOnly, matrix, matrixCells, revokePermission, assignPermission, onAssignmentChange, loadMatrix]);

  // 处理拖拽开始
  const handleMouseDown = useCallback((row: number, col: number, event: React.MouseEvent) => {
    if (readOnly) return;
    
    event.preventDefault();
    setDragStart({ row, col });
    setDragEnd({ row, col });
    setIsDragging(true);
  }, [readOnly]);

  // 处理拖拽移动
  const handleMouseEnter = useCallback((row: number, col: number) => {
    if (!isDragging || !dragStart) return;
    
    setDragEnd({ row, col });
  }, [isDragging, dragStart]);

  // 处理拖拽结束
  const handleMouseUp = useCallback(async () => {
    if (!isDragging || !dragStart || !dragEnd || !matrix) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const minRow = Math.min(dragStart.row, dragEnd.row);
    const maxRow = Math.max(dragStart.row, dragEnd.row);
    const minCol = Math.min(dragStart.col, dragEnd.col);
    const maxCol = Math.max(dragStart.col, dragEnd.col);

    const selectedPermissions: string[] = [];
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cell = matrixCells[row]?.[col];
        if (cell) {
          selectedPermissions.push(cell.permissionId);
        }
      }
    }

    onSelectionChange?.(selectedPermissions);
    
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, matrix, matrixCells, onSelectionChange]);

  // 获取单元格样式
  const getCellClassName = useCallback((
    userIndex: number,
    permissionIndex: number
  ) => {
    const cell = matrixCells[userIndex]?.[permissionIndex];
    if (!cell) return 'matrix-cell matrix-cell-empty';

    let className = 'matrix-cell';
    
    // 权限状态样式
    if (cell.isGranted) {
      className += ` matrix-cell-granted matrix-cell-${cell.source}`;
    } else {
      className += ' matrix-cell-denied';
    }

    // 冲突样式
    if (cell.hasConflict && showConflicts) {
      className += ` matrix-cell-conflict matrix-cell-conflict-${cell.conflictSeverity}`;
    }

    // 过期样式
    if (cell.isExpired) {
      className += ' matrix-cell-expired';
    }

    // 拖拽选择样式
    if (isDragging && dragStart && dragEnd) {
      const minRow = Math.min(dragStart.row, dragEnd.row);
      const maxRow = Math.max(dragStart.row, dragEnd.row);
      const minCol = Math.min(dragStart.col, dragEnd.col);
      const maxCol = Math.max(dragStart.col, dragEnd.col);
      
      if (userIndex >= minRow && userIndex <= maxRow && 
          permissionIndex >= minCol && permissionIndex <= maxCol) {
        className += ' matrix-cell-selecting';
      }
    }

    // 只读样式
    if (readOnly) {
      className += ' matrix-cell-readonly';
    }

    return className;
  }, [matrixCells, showConflicts, isDragging, dragStart, dragEnd, readOnly]);

  // 获取资源类型选项
  const resourceTypeOptions = useMemo(() => {
    const types = [...new Set(resourceGroups.map(group => group.resourceType))];
    return [
      { value: 'all', label: t('admin.permissions.allResources') },
      ...types.map(type => ({ value: type, label: type }))
    ];
  }, [resourceGroups, t]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    );
  }

  if (!matrix) {
    return (
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>{t('admin.permissions.selectUserToViewMatrix')}</span>
      </div>
    );
  }

  return (
    <div className={`permission-assignment-matrix ${className}`}>
      {/* 工具栏 */}
      <div className="matrix-toolbar mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* 搜索框 */}
          <div className="form-control">
            <input
              type="text"
              placeholder={t('admin.permissions.searchPermissions')}
              className="input input-bordered input-sm w-64"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>

          {/* 资源类型筛选 */}
          <div className="form-control">
            <select 
              className="select select-bordered select-sm"
              value={selectedResourceType}
              onChange={(e) => setSelectedResourceType(e.target.value)}
            >
              {resourceTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 冲突过滤 */}
          {showConflicts && (
            <div className="form-control">
              <label className="cursor-pointer label">
                <input 
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={showOnlyConflicts}
                  onChange={(e) => setShowOnlyConflicts(e.target.checked)}
                />
                <span className="label-text ml-2">{t('admin.permissions.showOnlyConflicts')}</span>
              </label>
            </div>
          )}

          {/* 统计信息 */}
          <div className="text-sm text-base-content/70">
            {t('admin.permissions.totalPermissions', { 
              count: filteredResourceGroups.reduce((sum, group) => sum + group.permissions.length, 0)
            })}
          </div>
        </div>
      </div>

      {/* 权限矩阵 */}
      <div className="matrix-container">
        {filteredResourceGroups.length === 0 ? (
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>{t('admin.permissions.noPermissionsFound')}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm table-pin-rows">
              <thead>
                <tr>
                  <th className="matrix-header-user">{t('admin.permissions.user')}</th>
                  {filteredResourceGroups.map(group => (
                    <th key={group.resourceType} className="matrix-header-resource" colSpan={group.permissions.length}>
                      <div className="text-center font-semibold">
                        {group.resourceName}
                      </div>
                    </th>
                  ))}
                </tr>
                <tr>
                  <th></th>
                  {filteredResourceGroups.map(group => 
                    group.permissions.map(permission => (
                      <th key={permission.permissionId} className="matrix-header-permission">
                        <div className="writing-mode-vertical text-xs" title={permission.permissionName}>
                          {compactMode ? permission.actionType : permission.permissionName}
                        </div>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="matrix-user-cell">
                    <div className="flex items-center gap-2">
                      <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-8">
                          <span className="text-xs">{matrix.userName.charAt(0).toUpperCase()}</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{matrix.userName}</div>
                      </div>
                    </div>
                  </td>
                  {filteredResourceGroups.map((group, groupIndex) => 
                    group.permissions.map((permission, permissionIndex) => {
                      const globalPermissionIndex = filteredResourceGroups
                        .slice(0, groupIndex)
                        .reduce((sum, g) => sum + g.permissions.length, 0) + permissionIndex;
                      
                      return (
                        <td 
                          key={permission.permissionId}
                          className={getCellClassName(0, globalPermissionIndex)}
                          onMouseDown={(e) => handleMouseDown(0, globalPermissionIndex, e)}
                          onMouseEnter={() => handleMouseEnter(0, globalPermissionIndex)}
                          onMouseUp={handleMouseUp}
                          onClick={(e) => handleCellClick(0, globalPermissionIndex, e)}
                          title={permission.permissionName}
                        >
                          <div className="matrix-cell-content">
                            {matrixCells[0]?.[globalPermissionIndex]?.isGranted ? '✓' : '✗'}
                          </div>
                        </td>
                      );
                    })
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="matrix-legend mt-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-success rounded"></div>
            <span>{t('admin.permissions.granted')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-base-300 rounded"></div>
            <span>{t('admin.permissions.denied')}</span>
          </div>
          {showConflicts && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-warning rounded"></div>
                <span>{t('admin.permissions.hasConflict')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-error rounded"></div>
                <span>{t('admin.permissions.criticalConflict')}</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-base-300 opacity-50 rounded"></div>
            <span>{t('admin.permissions.expired')}</span>
          </div>
        </div>
      </div>

      {/* 样式 */}
      <style>{`
        .matrix-cell {
          @apply w-8 h-8 text-center cursor-pointer border border-base-300 hover:border-base-400;
          user-select: none;
        }
        
        .matrix-cell-granted {
          @apply bg-success text-success-content;
        }
        
        .matrix-cell-denied {
          @apply bg-base-300 text-base-content;
        }
        
        .matrix-cell-role {
          @apply border-l-4 border-l-primary;
        }
        
        .matrix-cell-direct {
          @apply border-l-4 border-l-secondary;
        }
        
        .matrix-cell-override {
          @apply border-l-4 border-l-accent;
        }
        
        .matrix-cell-conflict {
          @apply ring-2 ring-warning;
        }
        
        .matrix-cell-conflict-critical {
          @apply ring-2 ring-error;
        }
        
        .matrix-cell-expired {
          @apply opacity-50;
        }
        
        .matrix-cell-selecting {
          @apply ring-2 ring-info bg-info/20;
        }
        
        .matrix-cell-readonly {
          @apply cursor-not-allowed;
        }
        
        .matrix-cell-content {
          @apply flex items-center justify-center w-full h-full text-xs font-medium;
        }
        
        .writing-mode-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
        
        .matrix-header-user {
          @apply sticky left-0 bg-base-100 z-10;
        }
        
        .matrix-user-cell {
          @apply sticky left-0 bg-base-100 z-10;
        }
      `}</style>
    </div>
  );
}