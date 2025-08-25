/**
 * 薪资导入测试页面
 * 集成所有薪资导入相关的测试模块
 */

import React from 'react';
import { SimpleTestCenter } from '@/components/payroll/import/components/SimpleTestCenter';

/**
 * 薪资导入测试页面组件
 * 提供薪资导入模块化重构测试环境（简化版本）
 */
const PayrollImportTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-100">
      <SimpleTestCenter />
    </div>
  );
};

export default PayrollImportTestPage;