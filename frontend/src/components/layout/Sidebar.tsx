import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

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
    permissions: ['statistics:read'],
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
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['payroll', 'testFeatures']); // 默认展开薪资和测试菜单

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
      'testFeatures': '计算验证',
      'insuranceCalculation': '保险计算测试',
      'payrollCalculation': '薪资计算测试',
      'fontTest': '字体测试',
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
          onClick={onClose}
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
          <h2 className="text-sm font-semibold text-base-content mb-2">
            菜单
          </h2>
          
          <ul className="menu menu-compact">
            {menuItems.map(item => renderMenuItem(item))}
          </ul>
        </div>
      </div>
    </aside>
  );
}