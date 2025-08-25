import { useState } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { ThemeSelector } from '@/components/common/ThemeSelector';
import { LogoutConfirmModal } from '@/components/common/LogoutConfirmModal';
import { Link } from 'react-router-dom';
import { useModal } from '@/components/common/Modal';

export function Header() {
  const { user, signOut } = useUnifiedAuth();
  const { t } = useTranslation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const modal = useModal();

  const handleSignOutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    
    try {
      console.log('[Header] User confirmed logout, proceeding...');
      
      // 优化的登出处理：不期待抛出错误，因为auth.signOut已经优化为不抛出错误
      await signOut();
      
      console.log('[Header] Logout process completed');
      
      // 关闭模态框
      setShowLogoutModal(false);
      
      // signOut 已经优化，不会抛出错误，UI状态会通过AuthContext自动更新
      
    } catch (error) {
      // 这种情况现在应该很少发生，因为auth.signOut已经优化
      console.error('[Header] Unexpected logout error:', error);
      
      // 关闭模态框
      setShowLogoutModal(false);
      
      // 简化的错误处理：如果真的出现了意外错误，提供用户友好的提示
      modal.showError('退出登录时发生意外错误。如果问题持续存在，请刷新页面后重试。');
      
      // 提供重试选项
      modal.confirmAction(
        '是否要刷新页面以完成退出？',
        () => {
          window.location.reload();
        },
        '刷新页面'
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
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
            <label tabIndex={0} className="btn btn-ghost btn-circle btn-compact">
              <div className="avatar avatar-placeholder">
                <div className="w-6 rounded-full bg-primary text-primary-content">
                  <span className="font-semibold text-xs">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </label>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-1 z-[1] p-2 shadow bg-base-100 rounded-box w-48">
              <li>
                <span className="text-xs opacity-70 px-2 py-1">{user.email}</span>
              </li>
              <li><hr className="my-0.5" /></li>
              <li>
                <button onClick={handleSignOutClick} className="text-error text-sm px-2 py-1">
                  {String(t('common:logout'))}
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
      
      {/* 退出确认模态框 */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        isLoading={isLoggingOut}
      />
      
      {/* Modal组件 */}
      {modal.AlertModal}
      {modal.ConfirmModal}
    </header>
  );
}