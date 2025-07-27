import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TreeNode {
  id: string;
  name: string;
  parent_category_id: string | null;
  full_path: string;
  level: number;
}

interface NativeTreeSelectProps {
  data: TreeNode[];
  value?: string;
  onChange?: (value: string, node: TreeNode) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function NativeTreeSelect({ 
  data, 
  value, 
  onChange, 
  placeholder = "请选择", 
  className,
  disabled = false 
}: NativeTreeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 构建树状结构
  const buildTree = (nodes: TreeNode[]) => {
    const tree: { [key: string]: TreeNode & { children: TreeNode[] } } = {};
    const roots: (TreeNode & { children: TreeNode[] })[] = [];

    // 初始化所有节点
    nodes.forEach(node => {
      tree[node.id] = { ...node, children: [] };
    });

    // 建立父子关系
    nodes.forEach(node => {
      if (node.parent_category_id && tree[node.parent_category_id]) {
        tree[node.parent_category_id].children.push(tree[node.id]);
      } else {
        roots.push(tree[node.id]);
      }
    });

    return roots;
  };

  const treeData = buildTree(data);
  const selectedNode = data.find(node => node.name === value);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 选择节点
  const selectNode = (node: TreeNode) => {
    onChange?.(node.name, node);
    setIsOpen(false);
  };

  // 递归渲染树节点 - 使用原生details/summary
  const renderTreeNode = (node: TreeNode & { children: TreeNode[] }) => {
    const hasChildren = node.children.length > 0;
    const isSelected = value === node.name;

    if (hasChildren) {
      return (
        <details key={node.id} className="collapse collapse-arrow">
          <summary className="collapse-title text-sm font-medium p-2 cursor-pointer hover:bg-base-200">
            <span className="flex items-center">
              <span className="mr-2">{node.name}</span>
              {isSelected && (
                <div className="badge badge-primary badge-sm">已选</div>
              )}
            </span>
          </summary>
          <div className="collapse-content p-0">
            <div className="ml-4 border-l border-base-300">
              {node.children.map(child => renderTreeNode(child))}
            </div>
          </div>
        </details>
      );
    } else {
      return (
        <div key={node.id} className="p-2">
          <button
            type="button"
            onClick={() => selectNode(node)}
            className={cn(
              "w-full text-left p-2 rounded transition-colors",
              "hover:bg-base-200 text-sm",
              isSelected && "bg-primary text-primary-content font-medium"
            )}
          >
            {node.name}
          </button>
        </div>
      );
    }
  };

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      {/* 触发按钮 */}
      <div
        tabIndex={0}
        role="button"
        className={cn(
          "select select-bordered w-full flex items-center justify-between cursor-pointer",
          disabled && "select-disabled cursor-not-allowed",
          isOpen && "select-focus"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={cn(
          "flex-1 text-left truncate",
          !selectedNode && "text-base-content/50"
        )}>
          {disabled ? (
            <span className="flex items-center">
              <span className="loading loading-spinner loading-xs mr-2"></span>
              加载中...
            </span>
          ) : selectedNode ? (
            <span className="flex flex-col">
              <span className="font-medium">{selectedNode.name}</span>
              {selectedNode.level > 1 && (
                <span className="text-xs text-base-content/60 truncate">
                  {selectedNode.full_path}
                </span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>
        
        <svg 
          className={cn(
            "w-4 h-4 transition-transform flex-shrink-0 ml-2",
            isOpen && "rotate-180"
          )}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* 下拉内容 */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {data.length > 0 ? (
            <div className="p-2">
              {treeData.map(node => renderTreeNode(node))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-base-content/60 text-sm">
              暂无数据
            </div>
          )}
        </div>
      )}
    </div>
  );
}