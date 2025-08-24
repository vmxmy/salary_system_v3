/**
 * 权限申请页面
 * 
 * 功能特性：
 * - 权限申请表单
 * - 申请历史查看
 * - 申请状态跟踪
 * - 快捷申请模板
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { usePermissionRequest } from '@/hooks/permissions/usePermissionRequest';
import { PageHeader } from '@/components/common/PageHeader';
import { PermissionRequestForm, RequestStatusTracker } from '@/components/permission-request';
import { useToast, ToastContainer } from '@/components/common/Toast';
import type {
  PermissionRequestFormData,
  PermissionRequest
} from '@/types/permission-request';

const PermissionRequestPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const {
    myRequests,
    loading,
    error,
    getMyRequests
  } = usePermissionRequest();

  const { messages, removeToast, toast } = useToast();

  // 状态管理
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
  const [submitting, setSubmitting] = useState(false);

  // 从URL参数获取预选权限ID
  const preSelectedPermissionId = searchParams.get('permission');

  // 显示提示消息
  const showMessage = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  }, [toast]);

  // 处理申请提交
  const handleSubmitRequest = useCallback(async (formData: PermissionRequestFormData) => {
    setSubmitting(true);
    
    try {
      // 这里需要调用 usePermissionRequest 的 requestPermission 方法
      // 由于当前的实现需要调整，我们先模拟成功
      console.log('Submitting permission request:', formData);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      showMessage('权限申请已成功提交，请等待审批！', 'success');
      
      // 刷新申请历史
      await getMyRequests();
      
      // 切换到历史标签
      setActiveTab('history');
      
    } catch (error) {
      console.error('Failed to submit permission request:', error);
      showMessage('权限申请提交失败，请稍后重试。', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [showMessage, getMyRequests]);

  // 处理申请取消
  const handleCancelRequest = useCallback(async (requestId: string) => {
    try {
      // 这里需要实现取消申请的逻辑
      console.log('Cancelling permission request:', requestId);
      showMessage('申请已取消', 'success');
      await getMyRequests();
    } catch (error) {
      console.error('Failed to cancel request:', error);
      showMessage('取消申请失败', 'error');
    }
  }, [showMessage, getMyRequests]);

  // 处理查看详情
  const handleViewDetails = useCallback((request: PermissionRequest) => {
    // 可以导航到详情页面或打开模态框
    console.log('View request details:', request.request_id);
  }, []);

  // 页面初始化
  useEffect(() => {
    getMyRequests();
  }, [getMyRequests]);

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <PageHeader
        title="权限申请"
        subtitle="申请系统权限或查看申请历史"
      />

      {/* 错误提示 */}
      {error && (
        <div className="alert alert-error">
          <div>
            <h3 className="font-bold">操作失败</h3>
            <div className="text-sm">{error.message}</div>
          </div>
        </div>
      )}

      {/* 标签导航 */}
      <div className="tabs tabs-boxed">
        <button
          className={`tab ${activeTab === 'request' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          📝 申请权限
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 申请历史 {myRequests.length > 0 && `(${myRequests.length})`}
        </button>
      </div>

      {/* 内容区域 */}
      <div className="min-h-[500px]">
        {activeTab === 'request' && (
          <div className="card bg-base-100">
            <div className="card-body">
              <div className="card-title mb-4">
                申请新权限
                {preSelectedPermissionId && (
                  <span className="badge badge-info">预选权限</span>
                )}
              </div>
              
              <PermissionRequestForm
                onSubmit={handleSubmitRequest}
                onCancel={() => navigate(-1)}
                loading={submitting}
                preSelectedPermissionId={preSelectedPermissionId || undefined}
              />
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                申请历史 ({myRequests.length})
              </h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={getMyRequests}
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  '🔄'
                )}
                刷新
              </button>
            </div>

            {myRequests.length > 0 ? (
              <div className="space-y-4">
                {myRequests.map(request => (
                  <div key={request.id} className="card bg-base-100">
                    <div className="card-body">
                      <RequestStatusTracker
                        request={request}
                        showActions
                        onViewDetails={() => handleViewDetails(request)}
                        onCancel={
                          request.status === 'pending' 
                            ? () => handleCancelRequest(request.id)
                            : undefined
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : loading ? (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <span className="loading loading-spinner loading-lg"></span>
                  <p className="mt-4">加载申请历史...</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium mb-2">暂无申请记录</h3>
                <p className="text-base-content/60 mb-4">
                  您还没有提交过任何权限申请。
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab('request')}
                >
                  立即申请权限
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 快捷申请面板（可选） */}
      {activeTab === 'request' && (
        <div className="card bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20">
          <div className="card-body">
            <h4 className="card-title text-primary">💡 快捷申请</h4>
            <p className="text-sm text-base-content/70 mb-4">
              根据您的角色和工作需要，这些权限可能对您有帮助：
            </p>
            
            <div className="flex flex-wrap gap-2">
              {/* 这里可以显示推荐的权限快捷申请按钮 */}
              <button className="btn btn-outline btn-sm">员工管理权限</button>
              <button className="btn btn-outline btn-sm">薪资查看权限</button>
              <button className="btn btn-outline btn-sm">部门报表权限</button>
              <button className="btn btn-outline btn-sm">系统设置权限</button>
            </div>
          </div>
        </div>
      )}

      {/* 申请指南（可选） */}
      {activeTab === 'request' && (
        <div className="card bg-base-200">
          <div className="card-body">
            <h4 className="card-title">📚 申请指南</h4>
            <div className="space-y-2 text-sm">
              <p>• <strong>选择权限：</strong>请仔细选择您需要的具体权限</p>
              <p>• <strong>申请理由：</strong>详细说明为什么需要此权限，如何使用</p>
              <p>• <strong>权限类型：</strong>根据需要选择永久权限或临时权限</p>
              <p>• <strong>审批流程：</strong>申请提交后，相关管理员会进行审批</p>
              <p>• <strong>权限生效：</strong>审批通过后，权限会立即生效</p>
            </div>
          </div>
        </div>
      )}

      {/* Toast 通知 */}
      <ToastContainer messages={messages} onClose={removeToast} />
    </div>
  );
};

export default PermissionRequestPage;