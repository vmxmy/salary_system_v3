/**
 * 角色统计组件 - 显示角色管理的统计信息
 * 
 * 功能特性：
 * - 角色数量统计
 * - 用户分布统计
 * - 权限分布统计
 * - 响应式卡片设计
 */

import React from 'react';

interface RoleData {
  id: string;
  code: string;
  name: string;
  description: string;
  level: number;
  color: string;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

interface RoleStatisticsProps {
  roles: RoleData[];
  loading?: boolean;
  className?: string;
}

interface StatCard {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export function RoleStatistics({ roles, loading = false, className = '' }: RoleStatisticsProps) {
  
  // 计算统计数据
  const statistics = React.useMemo(() => {
    if (loading || roles.length === 0) {
      return {
        totalRoles: 0,
        activeRoles: 0,
        systemRoles: 0,
        totalUsers: 0,
        totalPermissions: 0,
        averageUsersPerRole: 0
      };
    }

    const totalRoles = roles.length;
    const activeRoles = roles.filter(role => role.isActive).length;
    const systemRoles = roles.filter(role => role.isSystem).length;
    const totalUsers = roles.reduce((sum, role) => sum + role.userCount, 0);
    
    // 计算权限数（去重）
    const allPermissions = new Set<string>();
    roles.forEach(role => {
      if (role.permissions.includes('*')) {
        // 如果包含通配符，假设有50个权限
        for (let i = 0; i < 50; i++) {
          allPermissions.add(`permission_${i}`);
        }
      } else {
        role.permissions.forEach(permission => allPermissions.add(permission));
      }
    });
    
    const totalPermissions = allPermissions.size;
    const averageUsersPerRole = totalRoles > 0 ? Math.round(totalUsers / totalRoles * 10) / 10 : 0;

    return {
      totalRoles,
      activeRoles,
      systemRoles,
      totalUsers,
      totalPermissions,
      averageUsersPerRole
    };
  }, [roles, loading]);

  // 统计卡片配置
  const statCards: StatCard[] = [
    {
      title: '角色总数',
      value: statistics.totalRoles,
      subtext: `其中 ${statistics.activeRoles} 个启用`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: '用户总数',
      value: statistics.totalUsers,
      subtext: `平均 ${statistics.averageUsersPerRole} 人/角色`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h3v-1a5.97 5.97 0 00-3-5.17" />
        </svg>
      ),
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: '权限总数',
      value: statistics.totalPermissions,
      subtext: `系统共享权限池`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      color: 'text-info',
      bgColor: 'bg-info/10'
    },
    {
      title: '系统角色',
      value: statistics.systemRoles,
      subtext: `共 ${statistics.totalRoles - statistics.systemRoles} 个自定义`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    }
  ];

  if (loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center space-x-3">
                <div className="skeleton w-12 h-12 rounded-full"></div>
                <div className="flex-1">
                  <div className="skeleton h-4 w-20 mb-2"></div>
                  <div className="skeleton h-6 w-16 mb-1"></div>
                  <div className="skeleton h-3 w-24"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {statCards.map((card, index) => (
        <div key={index} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="card-body p-4">
            <div className="flex items-center space-x-3">
              {/* 图标 */}
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <div className={card.color}>
                  {card.icon}
                </div>
              </div>
              
              {/* 内容 */}
              <div className="flex-1">
                <div className="text-sm font-medium text-base-content/70 mb-1">
                  {card.title}
                </div>
                <div className="text-2xl font-bold text-base-content mb-1">
                  {card.value.toLocaleString()}
                </div>
                <div className="text-xs text-base-content/50">
                  {card.subtext}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}