import React from 'react';
import { HistoryDataExporter } from '@/components/payroll/HistoryDataExporter';
import { UniversalPageLayout } from '@/components/layout/UniversalPageLayout';

export default function PayrollExportPage() {
  const exportIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V8" />
    </svg>
  );

  return (
    <UniversalPageLayout
      page={{
        title: "薪资数据导出",
        subtitle: "导出历史薪资数据，支持多种数据类型和自定义时间范围。导出的Excel文件可用于数据备份、分析或制作导入模板。",
        icon: exportIcon
      }}
      styling={{
        compact: true,
        spacing: 'normal'
      }}
    >
      <HistoryDataExporter />
    </UniversalPageLayout>
  );
}