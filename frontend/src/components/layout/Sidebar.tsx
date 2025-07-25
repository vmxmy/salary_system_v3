import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    key: 'dashboard',
    path: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    permissions: [],
  },
  {
    key: 'employees',
    path: '/employees',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    permissions: ['employee.view'],
  },
  {
    key: 'organization',
    path: '/organization/departments',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    permissions: ['department.view', 'position.view'],
    children: [
      {
        key: 'departments',
        path: '/organization/departments',
        permissions: ['department.view'],
      },
      {
        key: 'positions',
        path: '/organization/positions',
        permissions: ['position.view'],
      },
    ],
  },
  {
    key: 'payroll',
    path: '/payroll',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    permissions: ['payroll.view'],
  },
  {
    key: 'settings',
    path: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    permissions: ['system.settings'],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const { t } = useTranslation();
  const { hasAnyPermission } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const renderMenuItem = (item: any, isChild = false) => {
    // Check permissions
    if (item.permissions?.length > 0 && !hasAnyPermission(item.permissions)) {
      return null;
    }

    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      return (
        <li key={item.key}>
          <details open>
            <summary className="flex items-center gap-3">
              {!isChild && item.icon}
              <span className={cn("flex-1", isCollapsed && "lg:hidden")}>
                {t(`nav.${item.key}`)}
              </span>
            </summary>
            <ul>
              {item.children.map((child: any) => renderMenuItem(child, true))}
            </ul>
          </details>
        </li>
      );
    }

    return (
      <li key={item.key}>
        <NavLink
          to={item.path}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3",
              isActive && "active"
            )
          }
        >
          {!isChild && item.icon}
          <span className={cn("flex-1", isCollapsed && "lg:hidden")}>
            {t(`nav.${item.key}`)}
          </span>
        </NavLink>
      </li>
    );
  };

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-base-100 border-r border-base-300 transition-all duration-300 lg:fixed",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-base-300">
          <h1 className={cn(
            "font-serif text-xl font-bold",
            isCollapsed && "lg:hidden"
          )}>
            {t('app.name')}
          </h1>
          <button
            onClick={onToggleCollapse}
            className="btn btn-ghost btn-sm hidden lg:flex"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d={isCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} 
              />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="menu menu-compact">
            {menuItems.map(item => renderMenuItem(item))}
          </ul>
        </nav>
      </aside>

      {/* Mobile Header with Hamburger */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-base-100 border-b border-base-300">
        <h1 className="font-serif text-xl font-bold">{t('app.name')}</h1>
        <button onClick={() => setIsMobileOpen(true)} className="btn btn-ghost btn-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>
    </>
  );
}