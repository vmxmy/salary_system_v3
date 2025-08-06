import { NavLink } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h3v-1a5.97 5.97 0 00-3-5.17" />
      </svg>
    ),
    permissions: ['employees:read'],
  },
  {
    key: 'departments',
    path: '/organization/departments',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    permissions: ['departments:read'],
  },
  {
    key: 'payroll',
    path: '/payroll',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    permissions: ['payroll:read'],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { t } = useTranslation(['common']);

  // 简化的权限检查
  const hasPermission = (permissions: string[]) => {
    if (permissions.length === 0) return true;
    // 这里可以根据用户权限进行更复杂的检查
    return true;
  };

  return (
    <aside className={cn(
      "drawer-side z-20",
      !isOpen && "hidden lg:block"
    )}>
      <label className="drawer-overlay" onClick={onClose}></label>
      
      <div className="min-h-full w-64 bg-base-200">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-base-content mb-4">
            菜单
          </h2>
          
          <ul className="menu">
            {menuItems.map((item) => {
              if (!hasPermission(item.permissions)) return null;
              
              return (
                <li key={item.key}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      isActive 
                        ? "bg-primary text-primary-content" 
                        : "hover:bg-base-300"
                    )}
                    onClick={onClose}
                  >
                    {item.icon}
                    <span>{String(t(`common:nav.${item.key}`))}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}