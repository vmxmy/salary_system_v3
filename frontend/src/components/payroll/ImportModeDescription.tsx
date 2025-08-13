import React from 'react';
import { ImportMode } from '@/types/payroll-import';
import { InfoIcon } from '@/components/common/Icons';

interface ImportModeDescriptionProps {
  mode: ImportMode;
}

export const ImportModeDescription: React.FC<ImportModeDescriptionProps> = ({ mode }) => {
  const getModeDescription = () => {
    switch (mode) {
      case ImportMode.CREATE:
        return {
          title: '仅创建新记录',
          description: '只为当前薪资周期中没有记录的员工创建新的薪资记录。',
          behavior: [
            '✅ 如果员工在当前周期没有薪资记录，创建新记录',
            '⏭️ 如果员工在当前周期已有薪资记录，跳过该员工',
            '❌ 不会更新任何现有记录'
          ],
          useCase: '适用于首次导入或新员工薪资录入'
        };
      
      case ImportMode.UPDATE:
        return {
          title: '仅更新现有记录',
          description: '只更新当前薪资周期中已存在的薪资记录。',
          behavior: [
            '✅ 如果员工在当前周期有薪资记录，更新该记录',
            '⏭️ 如果员工在当前周期没有薪资记录，跳过该员工',
            '🔄 完全替换现有薪资项目'
          ],
          useCase: '适用于修正已导入的薪资数据'
        };
      
      case ImportMode.UPSERT:
        return {
          title: '更新或创建（推荐）',
          description: '智能处理：有记录则更新，无记录则创建。',
          behavior: [
            '✅ 如果员工在当前周期有薪资记录，更新该记录',
            '✅ 如果员工在当前周期没有薪资记录，创建新记录',
            '🔄 使用事务保证数据一致性',
            '⚡ 批量处理提高性能'
          ],
          useCase: '适用于大多数导入场景，最灵活的选项'
        };
      
      case ImportMode.APPEND:
        return {
          title: '追加新字段',
          description: '保留现有数据，只添加新的薪资项目。',
          behavior: [
            '✅ 保留所有现有薪资项目',
            '➕ 只添加Excel中有但系统中没有的薪资项目',
            '🔒 不会修改或删除任何现有数据',
            '✅ 如果没有记录，创建完整的新记录'
          ],
          useCase: '适用于补充导入额外的薪资项目'
        };
      
      default:
        return null;
    }
  };

  const modeInfo = getModeDescription();
  if (!modeInfo) return null;

  return (
    <div className="alert alert-info mt-2">
      <InfoIcon className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1">
        <h4 className="font-semibold mb-1">{modeInfo.title}</h4>
        <p className="text-sm mb-2">{modeInfo.description}</p>
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium">行为说明：</span>
            <ul className="mt-1 space-y-0.5">
              {modeInfo.behavior.map((item, index) => (
                <li key={index} className="ml-2">{item}</li>
              ))}
            </ul>
          </div>
          <div className="text-sm">
            <span className="font-medium">适用场景：</span> {modeInfo.useCase}
          </div>
        </div>
      </div>
    </div>
  );
};