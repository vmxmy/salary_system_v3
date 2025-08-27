/**
 * 薪资字段管理页面
 * 系统薪资组件的增删改查管理功能
 */

import React, { useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { 
  SalaryComponentStatsCard,
  SalaryComponentTable,
  SalaryComponentFormModal,
  SalaryComponentDetailModal,
} from '@/components/salary-components';
import { type SalaryComponent } from '@/hooks/salary-components';

export default function SalaryComponentManagementPage() {
  useDocumentTitle('薪资字段管理');

  // 模态框状态
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [viewingComponent, setViewingComponent] = useState<SalaryComponent | null>(null);

  // 处理创建新组件
  const handleCreate = () => {
    setEditingComponent(null);
    setShowFormModal(true);
  };

  // 处理编辑组件
  const handleEdit = (component: SalaryComponent) => {
    setEditingComponent(component);
    setShowFormModal(true);
  };

  // 处理查看组件详情
  const handleView = (component: SalaryComponent) => {
    setViewingComponent(component);
    setShowDetailModal(true);
  };

  // 处理表单成功回调
  const handleFormSuccess = (component: SalaryComponent) => {
    console.log('薪资组件操作成功:', component);
    // 这里可以添加成功提示
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">薪资字段管理</h1>
          <p className="text-base-content/70 mt-1">
            管理系统中所有薪资组件的配置和属性设置
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            className="btn btn-primary"
            onClick={handleCreate}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新增薪资组件
          </button>
          
          <div className="dropdown dropdown-end">
            <button tabIndex={0} role="button" className="btn btn-outline">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              更多操作
            </button>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              <li>
                <a>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  导出配置
                </a>
              </li>
              <li>
                <a>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  导入配置
                </a>
              </li>
              <li><hr /></li>
              <li>
                <a>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  使用说明
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <SalaryComponentStatsCard />

      {/* 数据表格 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title">薪资组件列表</h2>
            <div className="text-sm text-base-content/70">
              管理和配置所有薪资相关的收入和扣除项目
            </div>
          </div>
          
          <SalaryComponentTable
            onEdit={handleEdit}
            onView={handleView}
          />
        </div>
      </div>

      {/* 帮助信息 */}
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div className="flex-1">
          <h3 className="font-bold">使用提示</h3>
          <div className="text-sm mt-1 space-y-1">
            <p>• <strong>收入项</strong>：包括基本工资、津贴补贴等所有增加员工收入的项目</p>
            <p>• <strong>扣除项</strong>：包括保险费、税费等所有从员工收入中扣除的项目</p>
            <p>• <strong>税务属性</strong>：设置该项目是否需要计入个人所得税应税收入</p>
            <p>• <strong>基数依赖</strong>：设置该项目的计算是否依赖五险一金缴费基数</p>
            <p>• <strong>复制策略</strong>：控制月度薪资数据生成时该项目的处理方式</p>
          </div>
        </div>
      </div>

      {/* 表单模态框 */}
      <SalaryComponentFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={handleFormSuccess}
        editingComponent={editingComponent}
      />

      {/* 详情查看模态框 */}
      <SalaryComponentDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        component={viewingComponent}
        onEdit={handleEdit}
      />
    </div>
  );
}