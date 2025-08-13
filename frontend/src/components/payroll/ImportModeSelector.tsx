import React from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

/**
 * 导入模式选择器
 * 让用户在传统四模式和新智能模式之间切换
 */
export const ImportModeSelector: React.FC = () => {
  const location = useLocation();
  const isSmartMode = location.pathname.includes('smart-import');
  
  return (
    <div className="alert alert-info mb-4">
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <div className="flex-1">
        <h3 className="font-bold">选择导入模式</h3>
        <div className="text-sm mt-1">
          {isSmartMode ? (
            <>
              您正在使用<span className="font-semibold">智能导入模式</span>（推荐）
              <br />
              系统会自动识别员工信息并智能处理薪资数据
            </>
          ) : (
            <>
              您正在使用<span className="font-semibold">传统导入模式</span>
              <br />
              需要手动选择CREATE/UPDATE/UPSERT/APPEND模式
            </>
          )}
        </div>
      </div>
      <div>
        {isSmartMode ? (
          <Link to="/payroll/import" className="btn btn-sm btn-outline">
            切换到传统模式
          </Link>
        ) : (
          <Link to="/payroll/smart-import" className="btn btn-sm btn-primary">
            试试智能模式
          </Link>
        )}
      </div>
    </div>
  );
};