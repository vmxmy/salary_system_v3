import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import logoSvg from '@/assets/logos/gaoxiaocai.svg';

interface MenuItem {
  key: string;
  path?: string;
  icon: React.ReactNode;
  permissions: string[];
  children?: MenuItem[];
  tourId?: string;
}

const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    path: '/dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    permissions: [],
  },
  {
    key: 'statistics',
    path: '/statistics',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    permissions: ['statistics.view'],
  },
  {
    key: 'employees',
    path: '/employees',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h3v-1a5.97 5.97 0 00-3-5.17" />
      </svg>
    ),
    permissions: ['employees:read'],
    tourId: 'employee-management',
  },
  {
    key: 'departments',
    path: '/organization/departments',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    permissions: ['departments:read'],
  },
  {
    key: 'payroll',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    permissions: ['payroll:read'],
    tourId: 'payroll-management',
    children: [
      {
        key: 'payrollImport',
        path: '/payroll/import',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        ),
        permissions: ['payroll:import'],
      },
      {
        key: 'payrollManagement',
        path: '/payroll/list',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        permissions: ['payroll:read'],
      },
      {
        key: 'payrollApproval',
        path: '/payroll/approval',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        permissions: ['payroll:approve'],
      },
      {
        key: 'insuranceConfig',
        path: '/payroll/insurance-config',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
        permissions: ['payroll:config'],
      },
      {
        key: 'reportManagement',
        path: '/payroll/reports',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        permissions: ['payroll_management.read'],
      },
      {
        key: 'salaryComponentManagement',
        path: '/admin/salary-components',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ),
        permissions: ['user_management.read'],
      },
    ],
  },
  {
    key: 'admin',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    permissions: ['admin:access'],
    children: [
      {
        key: 'userManagement',
        path: '/admin/users',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h3v-1a5.97 5.97 0 00-3-5.17" />
          </svg>
        ),
        permissions: ['user_management.read'],
      },
      {
        key: 'roleManagement',
        path: '/admin/roles',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        permissions: ['manage_roles'],
      },
      {
        key: 'permissionManagement',
        path: '/admin/permissions',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
        permissions: ['permission_management.read', 'manage_role_permissions'],
      },
      {
        key: 'systemSettings',
        path: '/admin/system-settings',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        ),
        permissions: ['manage_roles'],
      },
      {
        key: 'permissionResources',
        path: '/admin/permissions/resources',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        ),
        permissions: ['permission:manage'],
      },
      {
        key: 'permissionAssignment',
        path: '/admin/permissions/assignment',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ),
        permissions: ['permission:assign'],
      },
      {
        key: 'permissionApproval',
        path: '/admin/permissions/approval',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        permissions: ['permission_request:manage'],
      },
    ],
  },
  {
    key: 'permissions',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
    permissions: [],
    children: [
      {
        key: 'permissionRequest',
        path: '/permissions/request',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        permissions: [],
      },
      {
        key: 'myPermissions',
        path: '/permissions/my-permissions',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
        permissions: [],
      },
    ],
  },
  {
    key: 'testFeatures',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    permissions: [],
    children: [
      {
        key: 'insuranceCalculation',
        path: '/test/insurance-calculation',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
        permissions: [],
      },
      {
        key: 'payrollCalculation',
        path: '/test/payroll-calculation',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m2 3v1a1 1 0 001 1h2a1 1 0 001-1v-1m-4 5h.01M15 14h.01M12 14h.01M9 14h.01M12 11h.01M15 11h.01M12 17h.01M9 17h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
        permissions: [],
      },
      {
        key: 'fontTest',
        path: '/font-test',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        permissions: [],
      },
      {
        key: 'permissionHooksTest',
        path: '/test/permission-hooks',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        ),
        permissions: [],
      },
      {
        key: 'payrollImportTest',
        path: '/test/payroll-import',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        permissions: [],
      },
      {
        key: 'payrollImportV2',
        path: '/test/payroll-import-v2',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            <circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
            <text x="18" y="8" textAnchor="middle" fontSize="8" fill="currentColor">V2</text>
          </svg>
        ),
        permissions: [],
      },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { t } = useTranslation(['common']);
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['payroll']); // 默认只展开薪资管理菜单

  // 临时翻译映射，保持界面友好
  const getDisplayName = (key: string): string => {
    const translations: Record<string, string> = {
      'dashboard': '工作台',
      'employees': '员工管理',
      'departments': '部门管理',
      'statistics': '统计分析',
      'payroll': '薪资管理',
      'payrollImport': '薪资导入',
      'payrollManagement': '薪资列表',
      'payrollApproval': '薪资审批',
      'insuranceConfig': '五险一金配置',
      'reportManagement': '报表管理',
      'admin': '系统管理',
      'userManagement': '用户管理',
      'roleManagement': '角色管理',
      'permissionManagement': '权限管理',
      'systemSettings': '系统设置',
      'salaryComponentManagement': '薪资字段管理',
      'permissionResources': '权限资源',
      'permissionAssignment': '权限分配',
      'permissionApproval': '权限审批',
      'permissions': '我的权限',
      'permissionRequest': '权限申请',
      'myPermissions': '权限查看',
      'testFeatures': '计算验证',
      'insuranceCalculation': '保险计算测试',
      'payrollCalculation': '薪资计算测试',
      'fontTest': '字体测试',
      'permissionHooksTest': '权限Hook测试',
      'payrollImportTest': '薪资导入测试',
      'payrollImportV2': '薪资导入V2 🚀',
    };
    return translations[key] || String(t(`common:nav.${key}`));
  };

  // 简化的权限检查
  const hasPermission = (permissions: string[]) => {
    if (permissions.length === 0) return true;
    // 这里可以根据用户权限进行更复杂的检查
    return true;
  };

  // 切换菜单展开状态
  const toggleMenu = (key: string) => {
    setExpandedMenus(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  // 检查菜单是否展开
  const isExpanded = (key: string) => expandedMenus.includes(key);

  // 检查菜单项是否激活
  const isMenuActive = (item: MenuItem): boolean => {
    if (item.path && location.pathname === item.path) return true;
    if (item.children) {
      return item.children.some(child => child.path === location.pathname);
    }
    return false;
  };

  // 渲染菜单项
  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    if (!hasPermission(item.permissions)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isActive = isMenuActive(item);
    const expanded = isExpanded(item.key);

    if (hasChildren) {
      return (
        <li key={item.key}>
          <details open={expanded}>
            <summary 
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-sm cursor-pointer",
                isActive && "bg-base-300",
                "hover:bg-base-300"
              )}
              onClick={(e) => {
                e.preventDefault();
                toggleMenu(item.key);
              }}
              {...(item.tourId && { 'data-tour': item.tourId })}
            >
              <span className="w-4 h-4 flex-shrink-0">
                {item.icon}
              </span>
              <span className="truncate">{getDisplayName(item.key)}</span>
            </summary>
            <ul className="ml-4">
              {item.children?.map(child => renderMenuItem(child, level + 1))}
            </ul>
          </details>
        </li>
      );
    }

    return (
      <li key={item.key}>
        <NavLink
          to={item.path!}
          className={({ isActive }) => cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-sm",
            level > 0 && "ml-2",
            isActive 
              ? "bg-primary text-primary-content" 
              : "hover:bg-base-300"
          )}
          onClick={(e) => {
            // 防止默认的链接行为，使用编程式导航
            e.preventDefault();
            navigate(item.path!);
            onClose?.();
          }}
          {...(item.tourId && { 'data-tour': item.tourId })}
        >
          <span className="w-4 h-4 flex-shrink-0">
            {item.icon}
          </span>
          <span className="truncate">{getDisplayName(item.key)}</span>
        </NavLink>
      </li>
    );
  };

  return (
    <aside className={cn(
      "drawer-side z-20",
      !isOpen && "hidden lg:block"
    )}>
      <label className="drawer-overlay" onClick={onClose}></label>
      
      <div className="min-h-full sidebar-compact bg-base-200" data-tour="navigation-menu">
        <div className="p-2">
          <div className="flex justify-center mb-3 px-1">
            <img 
              src={logoSvg} 
              alt="高小财 Logo" 
              className="h-20 w-auto object-contain rounded-2xl"
              style={{
                clipPath: 'inset(0 round 16px)'
              }}
            />
          </div>
          
          <ul className="menu menu-compact">
            {menuItems.map(item => renderMenuItem(item))}
          </ul>
        </div>
      </div>
    </aside>
  );
}