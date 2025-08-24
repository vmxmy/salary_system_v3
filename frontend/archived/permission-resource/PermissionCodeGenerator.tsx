/**
 * 权限代码生成器组件
 * 
 * 根据资源代码和操作类型自动生成权限代码
 */

import React, { useState, useEffect } from 'react';
import type { 
  PermissionCodeGeneratorProps, 
  Permission 
} from '@/types/permission-resource';

export function PermissionCodeGenerator({
  resourceCode,
  actionType,
  onCodeGenerated,
  autoGenerate = true,
  className = ''
}: PermissionCodeGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // 生成权限代码
  const generateCode = (resource: string, action: Permission['action_type']): string => {
    if (!resource || !action) return '';
    
    // 清理资源代码：移除特殊字符，转换为小写
    const cleanResourceCode = resource
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '')
      .replace(/^\.+|\.+$/g, '') // 移除开头和结尾的点
      .replace(/\.+/g, '.'); // 合并多个连续的点
    
    return `${cleanResourceCode}.${action}`;
  };

  // 自动生成代码
  useEffect(() => {
    if (autoGenerate && resourceCode && actionType) {
      const code = generateCode(resourceCode, actionType);
      setGeneratedCode(code);
      onCodeGenerated(code);
    }
  }, [resourceCode, actionType, autoGenerate, onCodeGenerated]);

  // 手动生成代码
  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const code = generateCode(resourceCode, actionType);
      setGeneratedCode(code);
      onCodeGenerated(code);
    } catch (error) {
      console.error('生成权限代码失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 如果是自动生成模式，返回生成的代码展示
  if (autoGenerate) {
    return (
      <div className={`permission-code-generator ${className}`}>
        {generatedCode && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-base-content/60">权限代码:</span>
            <code className="bg-base-200 px-2 py-1 rounded text-primary">
              {generatedCode}
            </code>
            <div className="tooltip" data-tip="自动生成">
              <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 手动生成模式
  return (
    <div className={`permission-code-generator ${className}`}>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={handleGenerate}
        disabled={isGenerating || !resourceCode || !actionType}
        title="生成权限代码"
      >
        {isGenerating ? (
          <>
            <span className="loading loading-spinner loading-xs"></span>
            生成中...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            生成代码
          </>
        )}
      </button>
      
      {generatedCode && (
        <div className="mt-2 text-xs text-base-content/60">
          生成的代码: <code className="text-primary">{generatedCode}</code>
        </div>
      )}
    </div>
  );
}

// 导出工具函数供其他组件使用
export const permissionCodeUtils = {
  /**
   * 生成权限代码
   */
  generate: (resourceCode: string, actionType: Permission['action_type']): string => {
    if (!resourceCode || !actionType) return '';
    
    const cleanResourceCode = resourceCode
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '')
      .replace(/^\.+|\.+$/g, '')
      .replace(/\.+/g, '.');
    
    return `${cleanResourceCode}.${actionType}`;
  },

  /**
   * 验证权限代码格式
   */
  validate: (code: string): { valid: boolean; message?: string } => {
    if (!code) {
      return { valid: false, message: '权限代码不能为空' };
    }

    if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(code)) {
      return { 
        valid: false, 
        message: '权限代码格式不正确，应使用小写字母、数字和点号，如：resource.action' 
      };
    }

    const parts = code.split('.');
    if (parts.length < 2) {
      return { 
        valid: false, 
        message: '权限代码至少应包含资源和操作两部分' 
      };
    }

    return { valid: true };
  },

  /**
   * 从权限代码中提取资源代码
   */
  extractResourceCode: (permissionCode: string): string => {
    const parts = permissionCode.split('.');
    return parts.slice(0, -1).join('.');
  },

  /**
   * 从权限代码中提取操作类型
   */
  extractActionType: (permissionCode: string): string => {
    const parts = permissionCode.split('.');
    return parts[parts.length - 1];
  },

  /**
   * 生成建议的权限代码
   */
  suggest: (resourceName: string, actionType: Permission['action_type']): string[] => {
    if (!resourceName) return [];

    const suggestions: string[] = [];
    
    // 基于资源名称生成多种可能的代码
    const cleanName = resourceName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim();

    // 方案1：直接转换
    const direct = cleanName.replace(/[\s-]+/g, '.');
    if (direct) suggestions.push(`${direct}.${actionType}`);

    // 方案2：简化转换
    const simplified = cleanName
      .replace(/[\s-]+/g, '')
      .replace(/management|page|component/g, '')
      .replace(/([a-z])([A-Z])/g, '$1.$2')
      .toLowerCase();
    if (simplified && simplified !== direct) {
      suggestions.push(`${simplified}.${actionType}`);
    }

    // 方案3：缩写
    const abbreviated = cleanName
      .split(/[\s-]+/)
      .map(word => word.charAt(0))
      .join('')
      .toLowerCase();
    if (abbreviated && abbreviated.length >= 2) {
      suggestions.push(`${abbreviated}.${actionType}`);
    }

    return [...new Set(suggestions)]; // 去重
  }
};