import React from 'react';
import InsuranceConfigManager from '@/components/insurance/InsuranceConfigManager';

/**
 * 五险一金配置页面
 * 提供完整的保险类型配置管理界面
 */
const InsuranceConfigPage: React.FC = () => {
  return (
    <div className="h-full bg-base-200">
      <InsuranceConfigManager />
    </div>
  );
};

export default InsuranceConfigPage;