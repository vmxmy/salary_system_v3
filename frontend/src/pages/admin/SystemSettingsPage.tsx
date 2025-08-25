/**
 * 系统设置管理页面 - DaisyUI 5 优化版本
 * 
 * 功能：
 * - 新用户默认角色配置
 * - 用户注册设置
 * - 基于邮箱域名的角色分配规则
 * - 系统配置的实时预览
 * 
 * DaisyUI 5 特性：
 * - 完全响应式设计
 * - 无障碍访问优化
 * - 高级通知系统
 * - 主题适配
 */

import { useState, useCallback, useEffect } from 'react';
import { useSystemSettings, type NewUserRoleConfig, type UserRegistrationSettings, type RoleAssignmentRules } from '@/hooks/admin';

export default function SystemSettingsPage() {
  // 使用 Hook 获取数据和操作
  const {
    newUserRoleConfig,
    userRegistrationSettings,
    roleAssignmentRules,
    availableRoles,
    loading,
    error,
    isUpdating,
    updateNewUserRoleConfig,
    updateUserRegistrationSettings,
    updateRoleAssignmentRules,
    canReadSettings,
    canWriteSettings
  } = useSystemSettings();
  
  // UI 状态管理
  const [activeTab, setActiveTab] = useState<'user-roles' | 'registration' | 'domain-rules'>('user-roles');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // 本地编辑状态（用于批量更新和撤销功能）
  const [localNewUserConfig, setLocalNewUserConfig] = useState<NewUserRoleConfig | null>(null);
  const [localRegistrationSettings, setLocalRegistrationSettings] = useState<UserRegistrationSettings | null>(null);
  const [localRoleAssignmentRules, setLocalRoleAssignmentRules] = useState<RoleAssignmentRules | null>(null);
  
  // 同步远程数据到本地编辑状态
  const syncLocalState = useCallback(() => {
    if (newUserRoleConfig) setLocalNewUserConfig({...newUserRoleConfig});
    if (userRegistrationSettings) setLocalRegistrationSettings({...userRegistrationSettings});
    if (roleAssignmentRules) setLocalRoleAssignmentRules({...roleAssignmentRules});
  }, [newUserRoleConfig, userRegistrationSettings, roleAssignmentRules]);
  
  // 初始化时同步数据 - 由useEffect处理

  // 域名规则编辑状态
  const [newDomain, setNewDomain] = useState('');
  const [selectedDomainRole, setSelectedDomainRole] = useState('employee');

  // UX改进：配置预览状态
  const [showConfigPreview, setShowConfigPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // UX改进：域名规则内联编辑状态
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>('');

  // UX改进：批量操作和撤销功能
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalConfigs, setOriginalConfigs] = useState({
    newUserRoleConfig: null as NewUserRoleConfig | null,
    registrationSettings: null as UserRegistrationSettings | null,
    roleAssignmentRules: null as RoleAssignmentRules | null,
  });

  // Toast 通知系统
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      setShowSuccessToast(true);
      setErrorMessage('');
      setTimeout(() => setShowSuccessToast(false), 3000);
    } else {
      setErrorMessage(message);
      setShowSuccessToast(false);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  }, []);

  // UX改进：配置验证函数
  const validateNewUserRoleConfig = useCallback((config: NewUserRoleConfig): string[] => {
    const errors: string[] = [];
    
    if (config.require_approval && config.auto_assign) {
      errors.push('自动分配角色与需要管理员审批产生冲突，请选择其中一个选项');
    }
    
    if (!config.registration_enabled && config.auto_assign) {
      errors.push('禁用用户注册时不能启用自动分配角色');
    }
    
    if (config.allowed_registration_domains.length === 0 && config.auto_assign && localRoleAssignmentRules && Object.keys(localRoleAssignmentRules.auto_assign_by_email_domain).length === 0) {
      errors.push('启用自动分配时建议设置域名规则或允许的注册域名');
    }
    
    return errors;
  }, [localRoleAssignmentRules]);

  // UX改进：实时配置预览
  const getConfigPreview = useCallback(() => {
    if (!localNewUserConfig || !localRoleAssignmentRules) return null;
    
    const roleName = availableRoles.find(r => r.role_code === localNewUserConfig.role)?.role_name || localNewUserConfig.role;
    const domainRulesCount = Object.keys(localRoleAssignmentRules.auto_assign_by_email_domain).length;
    
    return {
      roleName,
      domainRulesCount,
      autoAssignEnabled: localNewUserConfig.auto_assign && localNewUserConfig.registration_enabled,
      approvalRequired: localNewUserConfig.require_approval,
      notifyAdmins: localNewUserConfig.notify_admins
    };
  }, [localNewUserConfig, localRoleAssignmentRules, availableRoles]);

  // 配置变更时实时验证
  useEffect(() => {
    if (localNewUserConfig) {
      const errors = validateNewUserRoleConfig(localNewUserConfig);
      setValidationErrors(errors);
    }
  }, [localNewUserConfig, validateNewUserRoleConfig]);

  // 初始化本地状态
  useEffect(() => {
    if (newUserRoleConfig && !localNewUserConfig) {
      setLocalNewUserConfig({...newUserRoleConfig});
    }
    if (userRegistrationSettings && !localRegistrationSettings) {
      setLocalRegistrationSettings({...userRegistrationSettings});
    }
    if (roleAssignmentRules && !localRoleAssignmentRules) {
      setLocalRoleAssignmentRules({...roleAssignmentRules});
      
      // UX改进：保存原始配置用于撤销功能
      setOriginalConfigs({
        newUserRoleConfig: newUserRoleConfig ? {...newUserRoleConfig} : null,
        registrationSettings: userRegistrationSettings ? {...userRegistrationSettings} : null,
        roleAssignmentRules: {...roleAssignmentRules},
      });
    }
  }, [newUserRoleConfig, userRegistrationSettings, roleAssignmentRules, localNewUserConfig, localRegistrationSettings, localRoleAssignmentRules]);

  // Hook已经处理了数据加载，不需要额外的loadSettings函数

  const handleSaveUserRoleConfig = async () => {
    if (!localNewUserConfig) return;
    
    try {
      // UX改进：保存前验证配置
      const errors = validateNewUserRoleConfig(localNewUserConfig);
      if (errors.length > 0) {
        showToast('配置存在问题，请检查后重试', 'error');
        return;
      }

      await updateNewUserRoleConfig(localNewUserConfig);
      
      // 更新原始配置
      setOriginalConfigs(prev => ({
        ...prev,
        newUserRoleConfig: { ...localNewUserConfig },
      }));
      setHasUnsavedChanges(false);
      
      showToast('用户角色配置保存成功！');
    } catch (error) {
      console.error('Failed to save user role config:', error);
      showToast('保存失败，请重试', 'error');
    }
  };

  const handleSaveRegistrationSettings = async () => {
    if (!localRegistrationSettings) return;
    
    try {
      await updateUserRegistrationSettings(localRegistrationSettings);
      
      // 更新原始配置
      setOriginalConfigs(prev => ({
        ...prev,
        registrationSettings: { ...localRegistrationSettings },
      }));
      setHasUnsavedChanges(false);
      
      showToast('注册设置保存成功！');
    } catch (error) {
      console.error('Failed to save registration settings:', error);
      showToast('保存失败，请重试', 'error');
    }
  };

  const handleSaveDomainRules = async () => {
    if (!localRoleAssignmentRules) return;
    
    try {
      await updateRoleAssignmentRules(localRoleAssignmentRules);
      
      // 更新原始配置
      setOriginalConfigs(prev => ({
        ...prev,
        roleAssignmentRules: { ...localRoleAssignmentRules },
      }));
      setHasUnsavedChanges(false);
      
      showToast('域名规则保存成功！');
    } catch (error) {
      console.error('Failed to save domain rules:', error);
      showToast('保存失败，请重试', 'error');
    }
  };

  const addDomainRule = () => {
    if (newDomain && localRoleAssignmentRules && !localRoleAssignmentRules.auto_assign_by_email_domain[newDomain]) {
      setLocalRoleAssignmentRules(prev => prev ? {
        ...prev,
        auto_assign_by_email_domain: {
          ...prev.auto_assign_by_email_domain,
          [newDomain]: selectedDomainRole
        }
      } : prev);
      setNewDomain('');
      setHasUnsavedChanges(true);
    }
  };

  const removeDomainRule = (domain: string) => {
    setLocalRoleAssignmentRules(prev => {
      if (!prev) return prev;
      const newRules = { ...prev.auto_assign_by_email_domain };
      delete newRules[domain];
      return {
        ...prev,
        auto_assign_by_email_domain: newRules
      };
    });
    setHasUnsavedChanges(true);
  };

  // UX改进：内联编辑功能
  const startEditingDomain = (domain: string, currentRole: string) => {
    setEditingDomain(domain);
    setEditingRole(currentRole);
  };

  const saveEditingDomain = () => {
    if (editingDomain && editingRole && localRoleAssignmentRules) {
      setLocalRoleAssignmentRules(prev => prev ? {
        ...prev,
        auto_assign_by_email_domain: {
          ...prev.auto_assign_by_email_domain,
          [editingDomain]: editingRole
        }
      } : prev);
      setEditingDomain(null);
      setEditingRole('');
      setHasUnsavedChanges(true);
    }
  };

  const cancelEditingDomain = () => {
    setEditingDomain(null);
    setEditingRole('');
  };

  // UX改进：检测配置变更
  useEffect(() => {
    if (!originalConfigs.newUserRoleConfig) return;
    
    const hasChanges = 
      JSON.stringify(localNewUserConfig) !== JSON.stringify(originalConfigs.newUserRoleConfig) ||
      JSON.stringify(localRegistrationSettings) !== JSON.stringify(originalConfigs.registrationSettings) ||
      JSON.stringify(localRoleAssignmentRules) !== JSON.stringify(originalConfigs.roleAssignmentRules);
    
    setHasUnsavedChanges(hasChanges);
  }, [localNewUserConfig, localRegistrationSettings, localRoleAssignmentRules, originalConfigs]);

  // UX改进：批量保存所有配置
  const handleSaveAllConfigs = async () => {
    try {
      if (!localNewUserConfig || !localRegistrationSettings || !localRoleAssignmentRules) {
        showToast('配置未初始化完成，请稍后重试', 'error');
        return;
      }
      
      const errors = validateNewUserRoleConfig(localNewUserConfig);
      if (errors.length > 0) {
        showToast('配置存在问题，请检查后重试', 'error');
        return;
      }

      await Promise.all([
        updateNewUserRoleConfig(localNewUserConfig),
        updateUserRegistrationSettings(localRegistrationSettings),
        updateRoleAssignmentRules(localRoleAssignmentRules)
      ]);
      
      // 更新原始配置
      setOriginalConfigs({
        newUserRoleConfig: { ...localNewUserConfig },
        registrationSettings: { ...localRegistrationSettings },
        roleAssignmentRules: { ...localRoleAssignmentRules },
      });
      setHasUnsavedChanges(false);
      showToast('所有配置保存成功！');
    } catch (error) {
      console.error('Failed to save all configs:', error);
      showToast('批量保存失败，请重试', 'error');
    }
  };

  // UX改进：撤销所有更改
  const handleRevertAllChanges = () => {
    if (originalConfigs.newUserRoleConfig && originalConfigs.registrationSettings && originalConfigs.roleAssignmentRules) {
      setLocalNewUserConfig({ ...originalConfigs.newUserRoleConfig });
      setLocalRegistrationSettings({ ...originalConfigs.registrationSettings });
      setLocalRoleAssignmentRules({ ...originalConfigs.roleAssignmentRules });
      setHasUnsavedChanges(false);
      showToast('已撤销所有未保存的变更');
    }
  };

  // 键盘导航支持
  const handleTabKeyDown = (event: React.KeyboardEvent, tab: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setActiveTab(tab as 'user-roles' | 'registration' | 'domain-rules');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-base-content/70 text-lg">正在加载系统设置...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl">
        {/* 页面标题和全局操作 - UX改进 */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-base-content">
                系统设置
              </h1>
              <p className="text-base-content/70 text-sm sm:text-base lg:text-lg">
                管理新用户注册和角色分配的全局配置
              </p>
            </div>
            
            {/* UX改进：全局操作栏 */}
            {hasUnsavedChanges && (
              <div className="flex flex-col sm:flex-row gap-3 lg:shrink-0">
                <div className="alert alert-warning sm:max-w-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm">有未保存的更改</span>
                </div>
                <div className="flex gap-2 lg:gap-3">
                  <button 
                    className="btn btn-ghost btn-sm gap-2"
                    onClick={handleRevertAllChanges}
                    disabled={isUpdating}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    撤销更改
                  </button>
                  <button 
                    className={`btn btn-primary btn-sm gap-2 ${isUpdating ? 'loading' : ''}`}
                    onClick={handleSaveAllConfigs}
                    disabled={isUpdating || validationErrors.length > 0}
                  >
                    {!isUpdating && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    )}
                    {isUpdating ? '保存中...' : '保存所有'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Toast 通知系统 */}
        <div className="toast toast-top toast-end">
          {showSuccessToast && (
            <div className="alert alert-success animate-in slide-in-from-top-2 duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">保存成功！</span>
            </div>
          )}
          {errorMessage && (
            <div className="alert alert-error animate-in slide-in-from-top-2 duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* 标签页导航 - UX改进：移动端优化 */}
        <div 
          role="tablist" 
          className="tabs tabs-boxed mb-8 p-2 bg-base-200/50 backdrop-blur-sm overflow-x-auto scrollbar-hide"
          style={{'--tabs-count': '3'} as React.CSSProperties}
        >
          <button 
            role="tab"
            className={`tab transition-all duration-300 ${activeTab === 'user-roles' ? 'tab-active' : ''}`}
            aria-selected={activeTab === 'user-roles'}
            aria-controls="user-roles-panel"
            onClick={() => setActiveTab('user-roles')}
            onKeyDown={(e) => handleTabKeyDown(e, 'user-roles')}
            style={{width: 'calc(100% / 3)', minWidth: 'fit-content'}}
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span className="hidden sm:inline">新用户默认角色</span>
              <span className="sm:hidden">用户角色</span>
            </span>
          </button>
          <button 
            role="tab"
            className={`tab transition-all duration-300 ${activeTab === 'registration' ? 'tab-active' : ''}`}
            aria-selected={activeTab === 'registration'}
            aria-controls="registration-panel"
            onClick={() => setActiveTab('registration')}
            onKeyDown={(e) => handleTabKeyDown(e, 'registration')}
            style={{width: 'calc(100% / 3)'}}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="hidden sm:inline">注册设置</span>
              <span className="sm:hidden">注册</span>
            </span>
          </button>
          <button 
            role="tab"
            className={`tab transition-all duration-300 ${activeTab === 'domain-rules' ? 'tab-active' : ''}`}
            aria-selected={activeTab === 'domain-rules'}
            aria-controls="domain-rules-panel"
            onClick={() => setActiveTab('domain-rules')}
            onKeyDown={(e) => handleTabKeyDown(e, 'domain-rules')}
            style={{width: 'calc(100% / 3)'}}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="hidden sm:inline">域名角色规则</span>
              <span className="sm:hidden">域名规则</span>
            </span>
          </button>
        </div>

        {/* 新用户默认角色配置 */}
        {activeTab === 'user-roles' && (
          <section 
            role="tabpanel" 
            id="user-roles-panel" 
            aria-labelledby="user-roles-tab"
            className="animate-in fade-in-50 duration-500"
          >
            <div className="card bg-base-100 shadow-xl border border-base-300/20 hover:shadow-2xl transition-all duration-300">
              <div className="card-body p-6 lg:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="card-title text-xl lg:text-2xl font-bold text-base-content">
                      新用户默认角色配置
                    </h2>
                    <p className="text-base-content/70 mt-2 text-sm lg:text-base">
                      设置新注册用户的默认权限级别和审批流程
                    </p>
                  </div>
                  <div className="indicator">
                    <span className="indicator-item indicator-top indicator-end badge badge-primary badge-sm">
                      核心设置
                    </span>
                    <svg className="w-8 h-8 text-primary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>

                <div className="grid gap-6 lg:gap-8">
                  {/* 默认角色选择 */}
                  <div className="form-control">
                    <label className="label" htmlFor="default-role-select">
                      <span className="label-text font-medium text-base">默认角色</span>
                      <span className="label-text-alt text-base-content/60">必需</span>
                    </label>
                    <select 
                      id="default-role-select"
                      className="select select-bordered select-primary focus:select-primary transition-all duration-200"
                      value={localNewUserConfig?.role || ''}
                      onChange={(e) => {
                        setLocalNewUserConfig(prev => prev ? { ...prev, role: e.target.value } : prev);
                        setHasUnsavedChanges(true);
                      }}
                      aria-describedby="default-role-help"
                    >
                      {availableRoles.map(role => (
                        <option key={role.role_code} value={role.role_code}>
                          {role.role_name || role.role_code}
                        </option>
                      ))}
                    </select>
                    <div className="label">
                      <span id="default-role-help" className="label-text-alt text-base-content/60">
                        新用户注册后将自动获得此角色的权限
                      </span>
                    </div>
                  </div>

                  {/* 设置选项网格 */}
                  <div className="grid gap-4 lg:gap-6">
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-4 p-4 rounded-lg border border-base-300/30 hover:border-base-300/60 hover:bg-base-200/30 transition-all duration-200">
                        <input 
                          type="checkbox" 
                          className="toggle toggle-primary"
                          checked={localNewUserConfig?.auto_assign || false}
                          onChange={(e) => {
                            setLocalNewUserConfig(prev => prev ? { ...prev, auto_assign: e.target.checked } : prev);
                            setHasUnsavedChanges(true);
                          }}
                          aria-describedby="auto-assign-help"
                        />
                        <div className="flex-1">
                          <span className="label-text font-medium text-base">自动分配角色</span>
                          <p id="auto-assign-help" className="text-sm text-base-content/70 mt-1">
                            启用后，新用户注册时将自动获得默认角色权限
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-4 p-4 rounded-lg border border-base-300/30 hover:border-base-300/60 hover:bg-base-200/30 transition-all duration-200">
                        <input 
                          type="checkbox" 
                          className="toggle toggle-secondary"
                          checked={localNewUserConfig?.require_approval || false}
                          onChange={(e) => {
                            setLocalNewUserConfig(prev => prev ? { ...prev, require_approval: e.target.checked } : prev);
                            setHasUnsavedChanges(true);
                          }}
                          aria-describedby="require-approval-help"
                        />
                        <div className="flex-1">
                          <span className="label-text font-medium text-base">需要管理员审批</span>
                          <p id="require-approval-help" className="text-sm text-base-content/70 mt-1">
                            启用后，新用户注册需要管理员手动审批后才能生效
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-4 p-4 rounded-lg border border-base-300/30 hover:border-base-300/60 hover:bg-base-200/30 transition-all duration-200">
                        <input 
                          type="checkbox" 
                          className="toggle toggle-accent"
                          checked={localNewUserConfig?.notify_admins || false}
                          onChange={(e) => {
                            setLocalNewUserConfig(prev => prev ? { ...prev, notify_admins: e.target.checked } : prev);
                            setHasUnsavedChanges(true);
                          }}
                          aria-describedby="notify-admins-help"
                        />
                        <div className="flex-1">
                          <span className="label-text font-medium text-base">通知管理员</span>
                          <p id="notify-admins-help" className="text-sm text-base-content/70 mt-1">
                            新用户注册时向管理员发送通知邮件
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-4 p-4 rounded-lg border border-base-300/30 hover:border-base-300/60 hover:bg-base-200/30 transition-all duration-200">
                        <input 
                          type="checkbox" 
                          className="toggle toggle-success"
                          checked={localNewUserConfig?.registration_enabled || false}
                          onChange={(e) => {
                            setLocalNewUserConfig(prev => prev ? { ...prev, registration_enabled: e.target.checked } : prev);
                            setHasUnsavedChanges(true);
                          }}
                          aria-describedby="registration-enabled-help"
                        />
                        <div className="flex-1">
                          <span className="label-text font-medium text-base">启用用户注册</span>
                          <p id="registration-enabled-help" className="text-sm text-base-content/70 mt-1">
                            允许新用户通过注册页面创建账户
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* UX改进：实时配置预览 */}
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-base-content">配置预览</h3>
                      <button 
                        className="btn btn-ghost btn-sm gap-1"
                        onClick={() => setShowConfigPreview(!showConfigPreview)}
                        aria-expanded={showConfigPreview}
                      >
                        <svg className={`w-4 h-4 transition-transform duration-200 ${showConfigPreview ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                        {showConfigPreview ? '隐藏预览' : '显示预览'}
                      </button>
                    </div>
                    
                    {showConfigPreview && (
                      <div className="space-y-3">
                        {/* 配置效果预览 */}
                        <div className="alert alert-info">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <div className="flex-1">
                            <h4 className="font-medium">当前配置效果</h4>
                            <div className="text-sm mt-2 space-y-1">
                              {getConfigPreview() && (
                                <>
                                  <p>• 新用户将默认获得「<span className="font-semibold text-primary">{getConfigPreview()!.roleName}</span>」角色</p>
                                  {getConfigPreview()!.autoAssignEnabled && (
                                    <p>• <span className="badge badge-success badge-sm">自动分配</span> 注册后立即获得权限</p>
                                  )}
                                  {getConfigPreview()!.approvalRequired && (
                                    <p>• <span className="badge badge-warning badge-sm">需要审批</span> 管理员确认后生效</p>
                                  )}
                                  {getConfigPreview()!.domainRulesCount > 0 && (
                                    <p>• 已配置 <span className="font-semibold">{getConfigPreview()!.domainRulesCount}</span> 个域名规则，符合条件的用户将获得对应角色</p>
                                  )}
                                  {getConfigPreview()!.notifyAdmins && (
                                    <p>• <span className="badge badge-accent badge-sm">通知管理员</span> 新用户注册时发送邮件</p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 验证错误提示 */}
                        {validationErrors.length > 0 && (
                          <div className="alert alert-warning">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div className="flex-1">
                              <h4 className="font-medium">配置验证警告</h4>
                              <ul className="text-sm mt-1 space-y-1 list-disc list-inside">
                                {validationErrors.map((error, index) => (
                                  <li key={index}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-actions justify-between items-center mt-8 pt-6 border-t border-base-300/30">
                  <div className="text-sm text-base-content/60">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      配置将立即生效
                    </span>
                  </div>
                  <button 
                    className={`btn btn-primary gap-2 min-w-[120px] ${isUpdating ? 'loading' : ''}`}
                    onClick={handleSaveUserRoleConfig}
                    disabled={isUpdating}
                  >
                    {!isUpdating && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isUpdating ? '保存中...' : '保存配置'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 注册设置 */}
        {activeTab === 'registration' && (
          <section 
            role="tabpanel" 
            id="registration-panel" 
            aria-labelledby="registration-tab"
            className="animate-in fade-in-50 duration-500"
          >
            <div className="card bg-base-100 shadow-xl border border-base-300/20 hover:shadow-2xl transition-all duration-300">
              <div className="card-body p-6 lg:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="card-title text-xl lg:text-2xl font-bold text-base-content">
                      用户注册设置
                    </h2>
                    <p className="text-base-content/70 mt-2 text-sm lg:text-base">
                      控制用户注册流程和验证要求
                    </p>
                  </div>
                  <div className="indicator">
                    <span className="indicator-item indicator-top indicator-end badge badge-secondary badge-sm">
                      安全设置
                    </span>
                    <svg className="w-8 h-8 text-secondary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                </div>

                <div className="grid gap-4 lg:gap-6">
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4 p-4 rounded-lg border border-base-300/30 hover:border-base-300/60 hover:bg-base-200/30 transition-all duration-200">
                      <input 
                        type="checkbox" 
                        className="toggle toggle-success"
                        checked={localRegistrationSettings?.enabled || false}
                        onChange={(e) => {
                          setLocalRegistrationSettings(prev => prev ? { ...prev, enabled: e.target.checked } : prev);
                          setHasUnsavedChanges(true);
                        }}
                        aria-describedby="registration-enabled-help"
                      />
                      <div className="flex-1">
                        <span className="label-text font-medium text-base">启用用户注册</span>
                        <p id="registration-enabled-help" className="text-sm text-base-content/70 mt-1">
                          允许新用户通过注册页面创建账户
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4 p-4 rounded-lg border border-base-300/30 hover:border-base-300/60 hover:bg-base-200/30 transition-all duration-200">
                      <input 
                        type="checkbox" 
                        className="toggle toggle-warning"
                        checked={localRegistrationSettings?.require_email_verification || false}
                        onChange={(e) => {
                          setLocalRegistrationSettings(prev => prev ? { ...prev, require_email_verification: e.target.checked } : prev);
                          setHasUnsavedChanges(true);
                        }}
                        aria-describedby="email-verification-help"
                      />
                      <div className="flex-1">
                        <span className="label-text font-medium text-base">需要邮箱验证</span>
                        <p id="email-verification-help" className="text-sm text-base-content/70 mt-1">
                          用户必须验证邮箱后才能完成注册
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4 p-4 rounded-lg border border-base-300/30 hover:border-base-300/60 hover:bg-base-200/30 transition-all duration-200">
                      <input 
                        type="checkbox" 
                        className="toggle toggle-error"
                        checked={localRegistrationSettings?.allow_public_registration || false}
                        onChange={(e) => {
                          setLocalRegistrationSettings(prev => prev ? { ...prev, allow_public_registration: e.target.checked } : prev);
                          setHasUnsavedChanges(true);
                        }}
                        aria-describedby="public-registration-help"
                      />
                      <div className="flex-1">
                        <span className="label-text font-medium text-base">允许公开注册</span>
                        <p id="public-registration-help" className="text-sm text-base-content/70 mt-1">
                          <span className="text-warning font-medium">⚠️ 安全风险：</span>
                          允许任何人注册账户，建议仅在内部环境中启用
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="card-actions justify-between items-center mt-8 pt-6 border-t border-base-300/30">
                  <div className="text-sm text-base-content/60">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      影响注册页面行为
                    </span>
                  </div>
                  <button 
                    className={`btn btn-primary gap-2 min-w-[120px] ${isUpdating ? 'loading' : ''}`}
                    onClick={handleSaveRegistrationSettings}
                    disabled={isUpdating}
                  >
                    {!isUpdating && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isUpdating ? '保存中...' : '保存配置'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 域名角色规则 */}
        {activeTab === 'domain-rules' && (
          <section 
            role="tabpanel" 
            id="domain-rules-panel" 
            aria-labelledby="domain-rules-tab"
            className="animate-in fade-in-50 duration-500"
          >
            <div className="card bg-base-100 shadow-xl border border-base-300/20 hover:shadow-2xl transition-all duration-300">
              <div className="card-body p-6 lg:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="card-title text-xl lg:text-2xl font-bold text-base-content">
                      基于邮箱域名的角色分配规则
                    </h2>
                    <p className="text-base-content/70 mt-2 text-sm lg:text-base">
                      根据用户邮箱域名自动分配相应角色
                    </p>
                  </div>
                  <div className="indicator">
                    <span className="indicator-item indicator-top indicator-end badge badge-accent badge-sm">
                      智能分配
                    </span>
                    <svg className="w-8 h-8 text-accent/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-6 lg:space-y-8">
                  {/* 添加新规则 */}
                  <div className="form-control">
                    <label className="label" htmlFor="domain-input">
                      <span className="label-text font-medium text-base">添加域名规则</span>
                      <span className="label-text-alt text-base-content/60">格式：example.com</span>
                    </label>
                    {/* 修复组件位置关系问题 */}
                    <div className="space-y-4">
                      {/* 域名输入框 - 使用 DaisyUI 5 标准 join 组件确保 @ 符号和输入框在同一行 */}
                      <div className="form-control">
                        <div className="join w-full">
                          <span className="btn join-item btn-sm bg-base-200/50 text-base-content/70 font-medium cursor-default hover:bg-base-200/50 border-r-0">@</span>
                          <input 
                            id="domain-input"
                            type="text" 
                            placeholder="company.com"
                            className="input input-bordered join-item flex-1 focus:input-primary transition-colors duration-200"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value.toLowerCase().trim())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newDomain.trim()) {
                                addDomainRule();
                              }
                            }}
                            aria-describedby="domain-help"
                          />
                        </div>
                        <div className="label">
                          <span id="domain-help" className="label-text-alt text-base-content/60">
                            输入域名，不需要包含 @ 符号
                          </span>
                        </div>
                      </div>
                      
                      {/* 角色选择和添加按钮 - 水平布局，更好的对齐 */}
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                        <div className="form-control flex-1 sm:max-w-[200px]">
                          <label className="label pb-1">
                            <span className="label-text text-sm font-medium">分配角色</span>
                          </label>
                          <select 
                            className="select select-bordered select-accent focus:select-accent w-full transition-colors duration-200"
                            value={selectedDomainRole}
                            onChange={(e) => setSelectedDomainRole(e.target.value)}
                            aria-label="选择要分配的角色"
                          >
                            {availableRoles.map(role => (
                              <option key={role.role_code} value={role.role_code}>
                                {role.role_name || role.role_code}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button 
                          className="btn btn-primary gap-2 min-w-[120px] h-12"
                          onClick={addDomainRule}
                          disabled={!newDomain.trim() || Boolean(localRoleAssignmentRules?.auto_assign_by_email_domain[newDomain.trim()])}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="hidden sm:inline">添加规则</span>
                          <span className="sm:hidden">添加</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 现有规则列表 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium text-base">当前规则</span>
                      <span className="label-text-alt text-base-content/60">
                        {Object.keys(localRoleAssignmentRules?.auto_assign_by_email_domain || {}).length} 个规则
                      </span>
                    </label>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {Object.entries(localRoleAssignmentRules?.auto_assign_by_email_domain || {}).map(([domain, role]) => (
                        <div 
                          key={domain} 
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-base-200/50 to-base-200/30 rounded-lg border border-base-300/30 hover:shadow-md transition-all duration-200"
                        >
                          {editingDomain === domain ? (
                            /* UX改进：内联编辑模式 */
                            <>
                              <div className="flex items-center gap-3 flex-1 mr-4">
                                <div className="badge badge-ghost badge-lg font-mono">
                                  @{domain}
                                </div>
                                <svg className="w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                                <select 
                                  className="select select-primary select-sm max-w-[200px]"
                                  value={editingRole}
                                  onChange={(e) => setEditingRole(e.target.value)}
                                  autoFocus
                                >
                                  {availableRoles.map(r => (
                                    <option key={r.role_code} value={r.role_code}>
                                      {r.role_name || r.role_code}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  className="btn btn-success btn-sm gap-1"
                                  onClick={saveEditingDomain}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                  保存
                                </button>
                                <button 
                                  className="btn btn-ghost btn-sm gap-1"
                                  onClick={cancelEditingDomain}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  取消
                                </button>
                              </div>
                            </>
                          ) : (
                            /* UX改进：查看模式，支持点击编辑 */
                            <>
                              <div className="flex items-center gap-3">
                                <div className="badge badge-ghost badge-lg font-mono">
                                  @{domain}
                                </div>
                                <svg className="w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                                <div 
                                  className="badge badge-primary badge-lg cursor-pointer hover:badge-primary-focus transition-colors"
                                  onClick={() => startEditingDomain(domain, role)}
                                  title="点击编辑角色"
                                >
                                  {availableRoles.find(r => r.role_code === role)?.role_name || role}
                                  <svg className="w-3 h-3 ml-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  className="btn btn-ghost btn-sm gap-1 hover:bg-primary/10 hover:text-primary"
                                  onClick={() => startEditingDomain(domain, role)}
                                  title="编辑规则"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  编辑
                                </button>
                                <button 
                                  className="btn btn-ghost btn-sm text-error hover:bg-error/10 gap-1"
                                  onClick={() => removeDomainRule(domain)}
                                  aria-label={`删除域名规则 ${domain}`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  删除
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {Object.keys(localRoleAssignmentRules?.auto_assign_by_email_domain || {}).length === 0 && (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 mx-auto text-base-content/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <p className="text-base-content/50 text-lg font-medium">暂无域名规则</p>
                          <p className="text-base-content/40 text-sm mt-1">添加第一个规则以开始智能分配</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 全局设置 */}
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4 p-4 rounded-lg border border-base-300/30 hover:border-base-300/60 hover:bg-base-200/30 transition-all duration-200">
                      <input 
                        type="checkbox" 
                        className="toggle toggle-warning"
                        checked={localRoleAssignmentRules?.require_admin_approval || false}
                        onChange={(e) => {
                          setLocalRoleAssignmentRules(prev => prev ? { ...prev, require_admin_approval: e.target.checked } : prev);
                          setHasUnsavedChanges(true);
                        }}
                        aria-describedby="admin-approval-help"
                      />
                      <div className="flex-1">
                        <span className="label-text font-medium text-base">需要管理员审批角色分配</span>
                        <p id="admin-approval-help" className="text-sm text-base-content/70 mt-1">
                          启用后，即使匹配域名规则也需要管理员最终确认
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="card-actions justify-between items-center mt-8 pt-6 border-t border-base-300/30">
                  <div className="text-sm text-base-content/60">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      优先级高于默认角色
                    </span>
                  </div>
                  <button 
                    className={`btn btn-primary gap-2 min-w-[120px] ${isUpdating ? 'loading' : ''}`}
                    onClick={handleSaveDomainRules}
                    disabled={isUpdating}
                  >
                    {!isUpdating && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isUpdating ? '保存中...' : '保存配置'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}