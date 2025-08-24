/**
 * 个人权限管理页面
 * 
 * 功能特性：
 * - 权限概览仪表板
 * - 权限使用统计
 * - 权限推荐系统
 * - 通知设置管理
 * - 快捷权限申请
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { PageHeader } from '@/components/common/PageHeader';
import { MyPermissionsDashboard } from '@/components/permission-request';

const MyPermissionsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 处理权限申请跳转
  const handleRequestPermission = useCallback((permissionId?: string) => {
    if (permissionId) {
      // 带预选权限跳转到申请页面
      navigate(`/permissions/request?permission=${permissionId}`);
    } else {
      // 跳转到一般申请页面
      navigate('/permissions/request');
    }
  }, [navigate]);

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <PageHeader
        title="我的权限"
        subtitle="管理个人权限、查看使用统计和设置通知偏好"
      >
        <div className="flex gap-2">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/permissions/request')}
          >
            📝 申请权限
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/profile')}
          >
            👤 个人设置
          </button>
        </div>
      </PageHeader>

      {/* 权限仪表板 */}
      <MyPermissionsDashboard
        onRequestPermission={handleRequestPermission}
        showRecommendations={true}
        showNotificationSettings={true}
      />

      {/* 帮助信息 */}
      <div className="card bg-info/5 border border-info/20">
        <div className="card-body">
          <h4 className="card-title text-info">
            💡 使用提示
          </h4>
          <div className="text-sm space-y-2">
            <p>
              <strong>权限概览：</strong>
              查看您当前拥有的所有权限，包括角色权限和直接授予的权限。
            </p>
            <p>
              <strong>使用统计：</strong>
              了解权限的使用情况，帮助您优化权限申请。
            </p>
            <p>
              <strong>智能推荐：</strong>
              系统会根据您的角色和工作模式推荐可能需要的权限。
            </p>
            <p>
              <strong>到期提醒：</strong>
              临时权限即将到期时会收到提醒，可以及时申请延期。
            </p>
            <p>
              <strong>通知设置：</strong>
              自定义权限相关的通知偏好，包括邮件和应用内通知。
            </p>
          </div>
        </div>
      </div>

      {/* 快捷操作面板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-base-100 hover:shadow-lg transition-shadow cursor-pointer"
             onClick={() => navigate('/permissions/request')}>
          <div className="card-body text-center">
            <div className="text-3xl mb-2">📝</div>
            <h4 className="font-medium">申请新权限</h4>
            <p className="text-sm text-base-content/60">
              申请您需要的系统权限
            </p>
          </div>
        </div>

        <div className="card bg-base-100 hover:shadow-lg transition-shadow cursor-pointer"
             onClick={() => navigate('/admin/permissions/approval')}>
          <div className="card-body text-center">
            <div className="text-3xl mb-2">✅</div>
            <h4 className="font-medium">审批申请</h4>
            <p className="text-sm text-base-content/60">
              处理待审批的权限申请
            </p>
          </div>
        </div>

        <div className="card bg-base-100 hover:shadow-lg transition-shadow cursor-pointer"
             onClick={() => navigate('/help/permissions')}>
          <div className="card-body text-center">
            <div className="text-3xl mb-2">❓</div>
            <h4 className="font-medium">帮助中心</h4>
            <p className="text-sm text-base-content/60">
              查看权限系统使用帮助
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPermissionsPage;