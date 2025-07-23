import React, { useState } from 'react';
import { cn } from '../../lib/utils';

/**
 * Navigation Item Interface
 */
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: NavItem[];
  permissions?: string[];
}

/**
 * Breadcrumb Item Interface
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * App Layout Props
 */
export interface AppLayoutProps {
  /**
   * Child content to render in the main area
   */
  children: React.ReactNode;
  /**
   * Navigation items for the sidebar
   */
  navigation: NavItem[];
  /**
   * Current active navigation item ID
   */
  activeNavId?: string;
  /**
   * Breadcrumb items
   */
  breadcrumbs?: BreadcrumbItem[];
  /**
   * User information for the header
   */
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  /**
   * Whether sidebar is collapsible
   */
  collapsibleSidebar?: boolean;
  /**
   * Page title
   */
  title?: string;
  /**
   * Header actions (buttons, etc.)
   */
  headerActions?: React.ReactNode;
  /**
   * Whether to show the sidebar
   */
  showSidebar?: boolean;
  /**
   * Logo component
   */
  logo?: React.ReactNode;
  /**
   * Notification count for header
   */
  notificationCount?: number;
}

/**
 * Sidebar Component
 */
const Sidebar: React.FC<{
  navigation: NavItem[];
  activeNavId?: string;
  collapsed: boolean;
  onNavClick: (item: NavItem) => void;
}> = ({ navigation, activeNavId, collapsed, onNavClick }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const isActive = activeNavId === item.id;
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              onNavClick(item);
            }
          }}
          className={cn(
            'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-150',
            'hover:bg-gray-100-hover focus:outline-none focus:ring-2 focus:ring-primary',
            level > 0 && 'ml-4 pl-6',
            isActive
              ? 'bg-primary text-primary-content'
              : 'text-gray-600 hover:text-gray-900',
            collapsed && level === 0 && 'justify-center px-2'
          )}
        >
          {/* Icon */}
          {item.icon && (
            <span className={cn('flex-shrink-0 w-5 h-5', !collapsed && 'mr-3')}>
              {item.icon}
            </span>
          )}

          {/* Label */}
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              
              {/* Badge */}
              {item.badge && (
                <span className="ml-2 bg-primary text-primary-content text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}

              {/* Expand Icon */}
              {hasChildren && (
                <svg
                  className={cn('w-4 h-4 ml-2 transition-transform', isExpanded && 'rotate-180')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </>
          )}
        </button>

        {/* Children */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="space-y-2">
      {navigation.map((item) => renderNavItem(item))}
    </nav>
  );
};

/**
 * Header Component
 */
const Header: React.FC<{
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  user?: AppLayoutProps['user'];
  headerActions?: React.ReactNode;
  notificationCount?: number;
  onToggleSidebar: () => void;
  showSidebarToggle: boolean;
}> = ({ title, breadcrumbs, user, headerActions, notificationCount, onToggleSidebar, showSidebarToggle }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="layout-page-header">
      <div className="flex-header">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Sidebar Toggle */}
          {showSidebarToggle && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md hover:bg-gray-100-hover focus:outline-none focus:ring-2 focus:ring-primary lg:hidden"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Title and Breadcrumbs */}
          <div className="flex flex-col">
            {title && (
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            )}
            
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="hover:text-gray-900 transition-colors"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="text-gray-900">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Header Actions */}
          {headerActions}

          {/* Notifications */}
          <button className="relative p-2 rounded-md hover:bg-gray-100-hover focus:outline-none focus:ring-2 focus:ring-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5l-5-5h5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 13a6 6 0 11-12 0" />
            </svg>
            {notificationCount && notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-negative text-negative-content text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* User Menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100-hover focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  {user.role && (
                    <div className="text-xs text-gray-500">{user.role}</div>
                  )}
                </div>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-base-200 border border-gray-300 rounded-md shadow-elevated py-1 z-50">
                  <a
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100-hover hover:text-gray-900"
                  >
                    Profile Settings
                  </a>
                  <a
                    href="/preferences"
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100-hover hover:text-gray-900"
                  >
                    Preferences
                  </a>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100-hover hover:text-gray-900"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

/**
 * Professional App Layout Component
 * 
 * Features:
 * - Responsive sidebar with collapsible option
 * - Professional header with breadcrumbs
 * - User menu and notifications
 * - Mobile-optimized navigation
 * - Accessibility optimized
 * - Consistent spacing and typography
 * 
 * @example
 * ```tsx
 * const navigation = [
 *   {
 *     id: 'dashboard',
 *     label: 'Dashboard',
 *     href: '/dashboard',
 *     icon: <DashboardIcon />
 *   },
 *   {
 *     id: 'employees',
 *     label: 'Employees',
 *     href: '/employees',
 *     icon: <UsersIcon />,
 *     badge: 5
 *   }
 * ];
 * 
 * <AppLayout
 *   navigation={navigation}
 *   activeNavId="dashboard"
 *   title="Employee Management"
 *   user={{ name: 'John Doe', role: 'Admin' }}
 * >
 *   <YourPageContent />
 * </AppLayout>
 * ```
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  navigation,
  activeNavId,
  breadcrumbs,
  user,
  collapsibleSidebar = true,
  title,
  headerActions,
  showSidebar = true,
  logo,
  notificationCount,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleNavClick = (item: NavItem) => {
    // Handle navigation click
    if (item.href) {
      window.location.href = item.href;
    }
    // Close mobile sidebar after navigation
    setMobileSidebarOpen(false);
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="layout-page">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Header */}
      <Header
        title={title}
        breadcrumbs={breadcrumbs}
        user={user}
        headerActions={headerActions}
        notificationCount={notificationCount}
        onToggleSidebar={toggleSidebar}
        showSidebarToggle={showSidebar && collapsibleSidebar}
      />

      <div className="flex">
        {/* Sidebar */}
        {showSidebar && (
          <aside
            className={cn(
              'bg-base-200 border-r border-gray-300 transition-all duration-300 ease-in-out',
              // Desktop sidebar
              'hidden lg:flex lg:flex-col',
              sidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
              // Mobile sidebar
              'lg:hidden fixed inset-y-0 left-0 z-50 w-64 transform',
              mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
              'lg:translate-x-0 lg:static lg:inset-0'
            )}
          >
            {/* Logo */}
            {logo && (
              <div className={cn('flex items-center h-16 px-4 border-b border-gray-200', sidebarCollapsed && 'justify-center')}>
                {logo}
              </div>
            )}

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4">
              <Sidebar
                navigation={navigation}
                activeNavId={activeNavId}
                collapsed={sidebarCollapsed}
                onNavClick={handleNavClick}
              />
            </div>

            {/* Collapse Toggle */}
            {collapsibleSidebar && (
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="w-full p-2 rounded-md hover:bg-gray-100-hover focus:outline-none focus:ring-2 focus:ring-primary hidden lg:flex items-center justify-center"
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <svg
                    className={cn('w-5 h-5 transition-transform', sidebarCollapsed && 'rotate-180')}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            )}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="layout-page-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};