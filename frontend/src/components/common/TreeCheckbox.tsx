import React, { useState, useEffect } from 'react';

interface TreeNode {
  value: string;
  label: string;
  level: number;
  parentId: string | null;
  children: TreeNode[];
}

interface TreeCheckboxProps {
  data: TreeNode[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  expandAll?: boolean;
}

export const TreeCheckbox: React.FC<TreeCheckboxProps> = ({ data, selectedValues, onChange, expandAll = false }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (expandAll) {
      const allNodeIds = new Set<string>();
      const collectNodeIds = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            allNodeIds.add(node.value);
            collectNodeIds(node.children);
          }
        });
      };
      collectNodeIds(data);
      setExpandedNodes(allNodeIds);
    }
  }, [data, expandAll]);

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleNodeChange = (nodeValue: string, checked: boolean) => {
    const newValues = new Set(selectedValues);
    
    const updateNode = (node: TreeNode) => {
      if (checked) {
        newValues.add(node.value);
      } else {
        newValues.delete(node.value);
      }
      
      // Update all children
      if (node.children) {
        node.children.forEach(child => updateNode(child));
      }
    };

    // Find the node and update it and its children
    const findAndUpdate = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.value === nodeValue) {
          updateNode(node);
          return;
        }
        if (node.children) {
          findAndUpdate(node.children);
        }
      }
    };
    
    findAndUpdate(data);
    
    // Update parent nodes if needed
    const updateParents = (nodes: TreeNode[], parentChecked: boolean = true) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          const allChildrenChecked = node.children.every(child => 
            newValues.has(child.value) || 
            (child.children && child.children.length > 0 && checkAllDescendants(child, newValues))
          );
          
          if (allChildrenChecked && parentChecked) {
            newValues.add(node.value);
          } else if (!allChildrenChecked) {
            newValues.delete(node.value);
          }
          
          updateParents(node.children, allChildrenChecked);
        }
      }
    };
    
    updateParents(data);
    
    onChange(Array.from(newValues));
  };

  const checkAllDescendants = (node: TreeNode, values: Set<string>): boolean => {
    if (!node.children || node.children.length === 0) {
      return values.has(node.value);
    }
    return node.children.every(child => checkAllDescendants(child, values));
  };

  const isIndeterminate = (node: TreeNode): boolean => {
    if (!node.children || node.children.length === 0) {
      return false;
    }
    
    const childStates = node.children.map(child => {
      if (child.children && child.children.length > 0) {
        return checkAllDescendants(child, new Set(selectedValues));
      }
      return selectedValues.includes(child.value);
    });
    
    const checkedCount = childStates.filter(state => state).length;
    return checkedCount > 0 && checkedCount < childStates.length;
  };

  const renderNode = (node: TreeNode) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.value);
    const isChecked = selectedValues.includes(node.value);
    const indeterminate = isIndeterminate(node);
    
    return (
      <div key={node.value} className="select-none">
        <div 
          className={`flex items-center gap-2 py-2 hover:bg-base-100 rounded-lg px-2 transition-colors duration-200`}
          style={{ paddingLeft: `${node.level * 1.2}rem` }}
        >
          {hasChildren && (
            <button
              className="btn btn-ghost btn-xs p-0 min-h-0 h-5 w-5 hover:bg-base-200"
              onClick={() => toggleExpand(node.value)}
            >
              <svg 
                className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          <label className="flex items-center gap-2 cursor-pointer flex-1 hover:text-primary transition-colors">
            <input
              type="checkbox"
              className={`checkbox checkbox-sm ${
                indeterminate 
                  ? 'checkbox-primary opacity-70' 
                  : 'checkbox-primary'
              }`}
              checked={isChecked}
              onChange={(e) => handleNodeChange(node.value, e.target.checked)}
              ref={(el) => {
                if (el) {
                  el.indeterminate = indeterminate;
                }
              }}
            />
            <span className={`text-sm ${node.level === 1 ? 'font-medium' : ''}`}>
              {node.label}
            </span>
            {node.level === 1 && (
              <div className="badge badge-outline badge-xs">
                {node.children?.length || 0}
              </div>
            )}
          </label>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {data.map(node => renderNode(node))}
    </div>
  );
};