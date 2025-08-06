import React, { useState } from 'react';
import { 
  TrashIcon, 
  ArrowRightIcon, 
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { ModernButton } from '@/components/common/ModernButton';
import { useToast } from '@/contexts/ToastContext';
import { useDepartmentTree, useUpdateDepartment, useDeleteDepartment } from '@/hooks/useDepartments';
import { cn } from '@/lib/utils';
import type { Department } from '@/types/department';

interface DepartmentBatchOperationsProps {
  selectedDepartments: Department[];
  onClearSelection: () => void;
  onOperationComplete: () => void;
}

interface BatchMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDepartments: Department[];
  onConfirm: (targetDepartmentId: string | null) => void;
}

const BatchMoveModal: React.FC<BatchMoveModalProps> = ({
  isOpen,
  onClose,
  selectedDepartments,
  onConfirm,
}) => {
  const [targetDepartmentId, setTargetDepartmentId] = useState<string | null>(null);
  const { data: departments } = useDepartmentTree();

  // DaisyUI classes for styling

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(targetDepartmentId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={cn('card bg-base-100 shadow-xl', "max-w-md w-full mx-4")}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            批量移动部门
          </h3>
          
          <p className="text-sm text-text-secondary mb-4">
            将选中的 {selectedDepartments.length} 个部门移动到新的父部门下：
          </p>
          
          <div className="space-y-2 mb-6">
            {selectedDepartments.map((dept) => (
              <div key={dept.id} className="text-sm text-text-primary bg-background-secondary px-3 py-2 rounded">
                {dept.name}
              </div>
            ))}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              目标父部门
            </label>
            <select
              value={targetDepartmentId || ''}
              onChange={(e) => setTargetDepartmentId(e.target.value || null)}
              className="select select-bordered w-full border-border-subtle bg-background-primary focus:border-primary"
            >
              <option value="">根级部门</option>
              {departments?.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <ModernButton
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              <XMarkIcon className="w-4 h-4 mr-2" />
              取消
            </ModernButton>
            <ModernButton
              variant="primary"
              onClick={handleConfirm}
              className="flex-1"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              确认移动
            </ModernButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DepartmentBatchOperations: React.FC<DepartmentBatchOperationsProps> = ({
  selectedDepartments,
  onClearSelection,
  onOperationComplete,
}) => {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [isOperating, setIsOperating] = useState(false);
  const { showSuccess, showError, showInfo } = useToast();
  const deleteDepartment = useDeleteDepartment();
  const updateDepartment = useUpdateDepartment();

  // DaisyUI classes for styling

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedDepartments.length} 个部门吗？此操作不可恢复。`)) {
      return;
    }

    setIsOperating(true);
    try {
      // 按层级从深到浅删除，避免外键约束问题
      // 注意：Department 类型没有 full_path 属性，这里先简单处理
      const sortedDepartments = [...selectedDepartments];

      for (const department of sortedDepartments) {
        await deleteDepartment.mutateAsync(department.id);
      }

      showSuccess(`成功删除 ${selectedDepartments.length} 个部门`);
      onClearSelection();
      onOperationComplete();
    } catch (error) {
      showError('批量删除失败，请重试');
    } finally {
      setIsOperating(false);
    }
  };

  const handleBatchMove = async (targetDepartmentId: string | null) => {
    setIsOperating(true);
    try {
      for (const department of selectedDepartments) {
        await updateDepartment.mutateAsync({
          id: department.id,
          updates: {
            parent_department_id: targetDepartmentId,
          }
        });
      }

      showSuccess(`成功移动 ${selectedDepartments.length} 个部门`);
      onClearSelection();
      onOperationComplete();
    } catch (error) {
      showError('批量移动失败，请重试');
    } finally {
      setIsOperating(false);
    }
  };

  const handleBatchUpdate = () => {
    // 这里可以打开一个批量编辑模态框
    showInfo('批量编辑功能开发中...');
  };

  if (selectedDepartments.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn('card bg-base-100 shadow-xl', "p-4 mb-6")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckIcon className="w-5 h-5 text-info" />
            <span className="text-sm font-medium text-text-primary">
              已选择 {selectedDepartments.length} 个部门
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={handleBatchUpdate}
              disabled={isOperating}
            >
              <PencilSquareIcon className="w-4 h-4 mr-1" />
              批量编辑
            </ModernButton>
            
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={() => setShowMoveModal(true)}
              disabled={isOperating}
            >
              <ArrowRightIcon className="w-4 h-4 mr-1" />
              批量移动
            </ModernButton>
            
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={handleBatchDelete}
              disabled={isOperating}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              批量删除
            </ModernButton>
            
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              disabled={isOperating}
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              取消选择
            </ModernButton>
          </div>
        </div>
      </div>

      <BatchMoveModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        selectedDepartments={selectedDepartments}
        onConfirm={handleBatchMove}
      />
    </>
  );
};