import { useState, useCallback, useMemo } from 'react';
import { MagnifyingGlassIcon, FolderOpenIcon, FolderIcon } from '@heroicons/react/24/outline';
import { DepartmentTreeNode } from './DepartmentTreeNode';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ModernButton } from '@/components/common/ModernButton';
import { useDepartmentTree } from '@/hooks/useDepartments';
import { cn } from '@/lib/utils';
import type { DepartmentNode } from '@/types/department';

interface DepartmentTreeProps {
  data?: DepartmentNode[];
  selectedId?: string;
  onSelect?: (departmentId: string) => void;
  onAction?: (action: string, department: DepartmentNode) => void;
  showSearch?: boolean;
  showControls?: boolean;
  className?: string;
  loading?: boolean;
  // Batch selection props
  selectionMode?: boolean;
  selectedDepartments?: DepartmentNode[];
  onSelectionChange?: (departments: DepartmentNode[]) => void;
  // Tree control callbacks
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  // External expanded state control
  expandedNodes?: Set<string>;
  onExpandedNodesChange?: (expandedNodes: Set<string>) => void;
}

export function DepartmentTree({
  data,
  selectedId,
  onSelect,
  onAction,
  showSearch = true,
  showControls = true,
  className,
  loading = false,
  selectionMode = false,
  selectedDepartments = [],
  onSelectionChange,
  onExpandAll,
  onCollapseAll,
  expandedNodes: externalExpandedNodes,
  onExpandedNodesChange
}: DepartmentTreeProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalExpandedNodes, setInternalExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentNode | null>(null);
  
  // Use external expanded state if provided, otherwise use internal state
  const expandedNodes = externalExpandedNodes || internalExpandedNodes;
  const setExpandedNodes = onExpandedNodesChange || setInternalExpandedNodes;
  
  // 使用 DaisyUI 样式系统
  const cardClasses = 'card bg-base-100 shadow-lg border border-base-200';

  // Use provided data or fetch from hook
  const { data: fetchedTree, isLoading: isFetching, error } = useDepartmentTree();
  const departmentTree = data || fetchedTree;
  const isLoading = loading || isFetching;

  // 过滤树结构
  const filteredTree = useMemo(() => {
    if (!departmentTree || !searchTerm.trim()) {
      return departmentTree || [];
    }

    const filterTree = (nodes: DepartmentNode[]): DepartmentNode[] => {
      return nodes.reduce((acc: DepartmentNode[], node) => {
        const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase());
        const filteredChildren = node.children ? filterTree(node.children) : [];
        
        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren
          });
          
          // 自动展开匹配的节点的父节点
          if (matchesSearch || filteredChildren.length > 0) {
            if (onExpandedNodesChange) {
              // External handler expects direct Set
              onExpandedNodesChange(new Set([...expandedNodes, node.id]));
            } else {
              // Internal state setter can handle function
              setInternalExpandedNodes((prev: Set<string>) => new Set([...prev, node.id]));
            }
          }
        }
        
        return acc;
      }, []);
    };

    return filterTree(departmentTree);
  }, [departmentTree, searchTerm, onExpandedNodesChange, expandedNodes]);

  // 处理节点展开/折叠
  const handleToggleNode = useCallback((departmentId: string) => {
    const newSet = new Set(expandedNodes);
    if (newSet.has(departmentId)) {
      newSet.delete(departmentId);
    } else {
      newSet.add(departmentId);
    }
    setExpandedNodes(newSet);
  }, [expandedNodes, setExpandedNodes]);

  // 处理部门选择
  const handleDepartmentSelect = useCallback((department: DepartmentNode) => {
    setSelectedDepartment(department);
    onSelect?.(department.id);
  }, [onSelect]);

  // 处理部门操作
  const handleDepartmentAction = useCallback((action: string, department: DepartmentNode) => {
    onAction?.(action, department);
  }, [onAction]);

  // 处理批量选择
  const handleSelectionChange = useCallback((department: DepartmentNode, checked: boolean) => {
    if (!onSelectionChange) return;

    let newSelection: DepartmentNode[];
    if (checked) {
      newSelection = [...selectedDepartments, department];
    } else {
      newSelection = selectedDepartments.filter(d => d.id !== department.id);
    }
    onSelectionChange(newSelection);
  }, [selectedDepartments, onSelectionChange]);

  // 展开全部 - 支持外部控制
  const handleExpandAll = useCallback(() => {
    if (onExpandAll) {
      onExpandAll();
      return;
    }
    
    const getAllIds = (nodes: DepartmentNode[]): string[] => {
      return nodes.reduce((acc: string[], node) => {
        acc.push(node.id);
        if (node.children) {
          acc.push(...getAllIds(node.children));
        }
        return acc;
      }, []);
    };

    if (departmentTree) {
      setExpandedNodes(new Set(getAllIds(departmentTree)));
    }
  }, [onExpandAll, departmentTree]);

  // 折叠全部 - 支持外部控制
  const handleCollapseAll = useCallback(() => {
    if (onCollapseAll) {
      onCollapseAll();
      return;
    }
    
    setExpandedNodes(new Set());
  }, [onCollapseAll]);

  // 清空搜索
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const renderTreeNodes = useCallback((nodes: DepartmentNode[], level: number = 0) => {
    return nodes.map((node) => (
      <DepartmentTreeNode
        key={node.id}
        department={node}
        level={level}
        isExpanded={expandedNodes.has(node.id)}
        isSelected={selectedId === node.id || selectedDepartment?.id === node.id}
        onToggle={handleToggleNode}
        onSelect={handleDepartmentSelect}
        onMenuAction={handleDepartmentAction}
        selectionMode={selectionMode}
        isChecked={selectedDepartments.some(d => d.id === node.id)}
        onCheckChange={handleSelectionChange}
      />
    ));
  }, [
    expandedNodes,
    selectedId,
    selectedDepartment,
    handleToggleNode,
    handleDepartmentSelect,
    handleDepartmentAction,
    selectionMode,
    selectedDepartments,
    handleSelectionChange
  ]);

  if (isLoading) {
    return <LoadingScreen message="加载部门结构中..." />;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-error">
        <p className="mb-2">加载部门数据失败</p>
        <p className="text-sm text-text-secondary">{error.message}</p>
      </div>
    );
  }

  if (!filteredTree || filteredTree.length === 0) {
    return (
      <div className="p-8 text-center text-text-secondary">
        {searchTerm ? (
          <>
            <p className="mb-2">未找到匹配的部门</p>
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
            >
              清空搜索
            </ModernButton>
          </>
        ) : (
          <p>暂无部门数据</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('department-tree', className)}>
      {/* 搜索和控制栏 */}
      {(showSearch || showControls) && (
        <div className={cn(cardClasses, 'mb-4 space-y-3 p-4')}>
          {/* 搜索框 */}
          {showSearch && (
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
              <input
                type="text"
                placeholder="搜索部门..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input input-bordered w-full pl-10 focus:input-primary"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* 控制按钮 - 只在没有外部控制时显示 */}
          {showControls && !onExpandAll && !onCollapseAll && (
            <div className="flex items-center gap-2">
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={handleExpandAll}
              >
                <FolderOpenIcon className="w-4 h-4 mr-1.5" />
                展开全部
              </ModernButton>
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={handleCollapseAll}
              >
                <FolderIcon className="w-4 h-4 mr-1.5" />
                折叠全部
              </ModernButton>
            </div>
          )}
          
          {/* 搜索结果显示 */}
          {searchTerm && (
            <div className="text-sm text-base-content/70">
              搜索结果: "{searchTerm}"
            </div>
          )}
        </div>
      )}

      {/* 树形结构 */}
      <div className="department-tree-container space-y-1">
        {renderTreeNodes(filteredTree)}
      </div>

      {/* 选中部门信息 */}
      {selectedDepartment && (
        <div className={cn(cardClasses, 'mt-4 p-3')}>
          <div className="text-xs text-base-content/70">
            已选择部门
          </div>
          <div className="text-base font-semibold text-primary">
            {selectedDepartment.name}
          </div>
          {selectedDepartment.full_path && (
            <div className="text-xs text-base-content/70 mt-1">
              路径: {selectedDepartment.full_path}
            </div>
          )}
        </div>
      )}
    </div>
  );
}