import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { ThemeSelector } from '@/components/common/ThemeSelector';
import { Link } from 'react-router-dom';

export function Header() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    try {
      // Add confirmation dialog
      const confirmed = window.confirm(String(t('auth:logout.confirm')));
      if (!confirmed) return;
      
      console.log('[Header] User confirmed logout, proceeding...');
      console.log('[Header] Current user:', user);
      
      await signOut();
      
      console.log('[Header] Logout completed');
    } catch (error) {
      console.error('[Header] Logout error:', error);
      alert('退出登录失败，请重试');
    }
  };

  return (
    <header className="navbar navbar-compact bg-base-100 border-b border-base-200 sticky top-0 z-30">
      <div className="navbar-start">
        <label htmlFor="drawer-toggle" className="btn btn-square btn-ghost btn-compact lg:hidden">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>
        <Link to="/dashboard" className="btn btn-ghost btn-compact text-lg">
          <span className="font-bold text-primary">薪资管理系统</span>
        </Link>
      </div>
      
      <div className="navbar-center">
        {/* 可以添加导航菜单 */}
      </div>
      
      <div className="navbar-end gap-1">
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeSelector showLabels={false} />
        </div>
        
        {user && (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-circle btn-compact avatar">
              <div className="w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-xs">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            </label>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-1 z-[1] p-2 shadow bg-base-100 rounded-box w-48">
              <li>
                <span className="text-xs opacity-70 px-2 py-1">{user.email}</span>
              </li>
              <li><hr className="my-0.5" /></li>
              <li>
                <button onClick={handleSignOut} className="text-error text-sm px-2 py-1">
                  {String(t('common:logout'))}
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}