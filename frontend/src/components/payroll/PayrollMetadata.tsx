import { useTranslation } from '@/hooks/useTranslation';

interface PayrollMetadataProps {
  selectedMonth: string;
}

export function PayrollMetadata({ selectedMonth }: PayrollMetadataProps) {
  const { t } = useTranslation(['common', 'payroll']);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-base-100 border border-base-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-base-content mb-4">
          薪资元数据管理
        </h2>
        <p className="text-base-content/70 mb-6">
          管理薪资计算相关的元数据配置，包括薪资项目、计算规则等。
        </p>
        
        {/* 占位内容 */}
        <div className="bg-base-50 border-2 border-dashed border-base-300 rounded-lg p-8 text-center">
          <div className="text-base-content/50 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-base-content/70 mb-2">
            元数据管理功能
          </h3>
          <p className="text-base-content/50 mb-4">
            此区域将用于配置和管理薪资计算的各种元数据
          </p>
          <div className="text-sm text-base-content/40">
            包括：薪资项目配置、计算规则设置、扣款项目管理等
          </div>
        </div>
      </div>

      {/* 功能模块预览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            title: '薪资项目配置',
            description: '管理基本工资、津贴补贴等薪资项目',
            icon: (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          },
          {
            title: '扣款项目管理',
            description: '配置社保、公积金、个税等扣款项目',
            icon: (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )
          },
          {
            title: '计算规则设置',
            description: '定义各种薪资组件的计算逻辑和规则',
            icon: (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )
          }
        ].map((item, index) => (
          <div key={index} className="card bg-base-100 border border-base-200 shadow-sm">
            <div className="card-body p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-primary">
                  {item.icon}
                </div>
                <h3 className="card-title text-base">{item.title}</h3>
              </div>
              <p className="text-sm text-base-content/70">
                {item.description}
              </p>
              <div className="card-actions justify-end mt-4">
                <button className="btn btn-sm btn-outline btn-primary" disabled>
                  即将推出
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}