/**
 * 薪酬组件索引文件
 * 统一导出所有薪酬相关的业务组件
 */

// 五险一金配置组件
export { InsuranceConfigForm } from './InsuranceConfigForm';
export type { InsuranceConfigFormProps, InsuranceConfig } from './InsuranceConfigForm';

// 个税配置组件
export { TaxConfigForm } from './TaxConfigForm';
export type { TaxConfigFormProps, TaxConfig } from './TaxConfigForm';

// 费率配置卡片组件
export { RateConfigCard, RateConfigGrid } from './RateConfigCard';
export type { 
  RateConfigCardProps, 
  RateConfigGridProps,
  RateConfig 
} from './RateConfigCard';

// 基数配置卡片组件
export { BaseConfigCard, BaseConfigGrid } from './BaseConfigCard';
export type { 
  BaseConfigCardProps, 
  BaseConfigGridProps,
  BaseConfig 
} from './BaseConfigCard';