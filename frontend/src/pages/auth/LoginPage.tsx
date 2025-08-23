import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail, cn } from '@/lib/utils';
import { auth } from '@/lib/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithMagicLink } = useAuth();
  const { t } = useTranslation('auth');

  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'magiclink'>('password');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  
  // 重新验证相关状态
  const [reAuthMode, setReAuthMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string>('');
  const [sessionExpired, setSessionExpired] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';
  
  // 检查会话状态和重新验证需求
  useEffect(() => {
    const checkReAuthNeeds = async () => {
      // 检查URL参数，看是否需要重新验证
      const urlParams = new URLSearchParams(location.search);
      const needsReAuth = urlParams.get('reauth') === 'true';
      const sessionExpiredParam = urlParams.get('session_expired') === 'true';
      
      if (needsReAuth) {
        console.log('[LoginPage] Re-authentication required');
        setReAuthMode(true);
        setLastError(t('login.reAuthRequired') || '会话已过期，请重新登录');
      }
      
      if (sessionExpiredParam) {
        console.log('[LoginPage] Session expired, showing re-auth UI');
        setSessionExpired(true);
        setReAuthMode(true);
        setLastError(t('login.sessionExpired') || '会话已过期，请重新登录以继续');
      }
      
      // 检查当前会话是否有效
      try {
        const isValidSession = await auth.validateSession();
        if (!isValidSession && (needsReAuth || sessionExpiredParam)) {
          console.log('[LoginPage] Invalid session confirmed');
          setSessionExpired(true);
          setReAuthMode(true);
        }
      } catch (error) {
        console.warn('[LoginPage] Session validation failed:', error);
      }
    };
    
    checkReAuthNeeds();
  }, [location.search, t]);

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
    };

    if (!formData.email) {
      newErrors.email = t('validation.emailRequired');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('validation.emailInvalid');
    }

    if (loginMethod === 'password') {
      if (!formData.password) {
        newErrors.password = t('validation.passwordRequired');
      } else if (formData.password.length < 6) {
        newErrors.password = t('validation.passwordMinLength');
      }
    }

    setErrors(newErrors);
    return loginMethod === 'password' ? (!newErrors.email && !newErrors.password) : !newErrors.email;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (loginMethod === 'magiclink') {
      setIsMagicLinkLoading(true);
      try {
        await signInWithMagicLink(formData.email);
        setMagicLinkSent(true);
        setLastError(''); // 清除之前的错误
        setRetryCount(0); // 重置重试计数
      } catch (error: any) {
        console.error('Magic link failed:', error);
        const errorMessage = t('login.magicLinkFailed') || 'Failed to send magic link. Please try again.';
        setLastError(errorMessage);
        setRetryCount(prev => prev + 1);
      } finally {
        setIsMagicLinkLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        console.log('[LoginPage] Attempting to sign in with:', formData.email);
        const result = await signIn(formData.email, formData.password);
        console.log('[LoginPage] Sign in result:', result);
        console.log('[LoginPage] Sign in successful, navigating to:', from);
        
        // 清除重新验证状态
        setReAuthMode(false);
        setSessionExpired(false);
        setLastError('');
        setRetryCount(0);
        
        // Add a small delay to ensure state is updated
        setTimeout(() => {
          console.log('[LoginPage] Navigating now...');
          navigate(from, { replace: true });
        }, 100);
      } catch (error: any) {
        console.error('[LoginPage] Sign in failed:', error);
        setRetryCount(prev => prev + 1);
        
        let errorMessage = t('login.failed');
        
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = t('login.invalidCredentials');
          // 如果是凭据错误，建议重试
          if (retryCount < 2) {
            errorMessage += ` (尝试 ${retryCount + 1}/3)`;
          }
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = t('login.emailNotConfirmed');
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = t('login.tooManyRequests') || '请求过于频繁，请稍后再试';
        } else if (error.message?.includes('Network')) {
          errorMessage = t('login.networkError') || '网络连接失败，请检查网络后重试';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setLastError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 重新验证处理函数
  const handleReAuthenticate = () => {
    console.log('[LoginPage] Starting re-authentication process');
    setReAuthMode(true);
    setSessionExpired(false);
    setLastError('');
    setRetryCount(0);
    
    // 清空表单以确保用户重新输入
    setFormData({
      email: '',
      password: '',
      rememberMe: false,
    });
  };

  // 重试处理函数  
  const handleRetry = () => {
    console.log('[LoginPage] Retrying authentication');
    setLastError('');
    setErrors({ email: '', password: '' });
    
    // 如果是Magic Link，重新发送
    if (loginMethod === 'magiclink') {
      setMagicLinkSent(false);
    }
  };

  // 取消重新验证
  const handleCancelReAuth = () => {
    setReAuthMode(false);
    setSessionExpired(false);
    setLastError('');
    setRetryCount(0);
    
    // 导航回主页或仪表盘
    navigate('/', { replace: true });
  };

  if (magicLinkSent) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="text-center mb-6">
            <img
              src="/logos/gaoxiaocai.svg"
              alt="高新财 Logo"
              className="w-16 h-16 mx-auto mb-4"
            />
          </div>
          
          {/* 重新验证状态提示 */}
          {reAuthMode && (
            <div className="alert alert-warning mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.764 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{t('login.reAuthInProgress') || '正在重新验证您的身份'}</span>
            </div>
          )}
          
          <div className="text-center mb-6">
            <h2 className={cn("card-title justify-center mb-2", "text-base")}>
              {reAuthMode 
                ? (t('login.reAuthMagicLinkSent') || '重新验证链接已发送')
                : (t('login.magicLinkSent') || 'Check your email')}
            </h2>
            <p className={cn("text-base", "text-base-content/60")}>
              {reAuthMode 
                ? (t('login.reAuthMagicLinkDescription') || `我们已向 ${formData.email} 发送了重新验证链接，请点击邮件中的链接完成重新登录。`)
                : (t('login.magicLinkSentDescription') || `We've sent a magic link to ${formData.email}. Click the link in the email to sign in.`)}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className={cn("btn btn-outline flex-1", "text-base")}
              disabled={isMagicLinkLoading}
            >
              {isMagicLinkLoading && <span className="loading loading-spinner loading-sm"></span>}
              {t('login.resendMagicLink') || '重新发送链接'}
            </button>
            
            <button
              onClick={() => {
                setMagicLinkSent(false);
                setFormData({ ...formData, email: '' });
              }}
              className={cn("btn btn-outline flex-1", "text-base")}
            >
              {t('login.backToLogin') || 'Back to login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="text-center mb-6">
          <img
            src="/logos/gaoxiaocai.svg"
            alt="高新财 Logo"
            className="w-16 h-16 mx-auto mb-4"
          />
        </div>
        
        {/* 重新验证状态提示 */}
        {(reAuthMode || sessionExpired) && (
          <div className="alert alert-warning mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.764 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="font-bold">{t('login.reAuthRequired') || '需要重新验证'}</h4>
              <span className="text-sm">{sessionExpired ? (t('login.sessionExpired') || '会话已过期，请重新登录以继续') : (t('login.reAuthMessage') || '请重新输入您的凭据')}</span>
            </div>
          </div>
        )}
        
        {/* 错误信息显示 */}
        {lastError && (
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <span>{lastError}</span>
              {retryCount > 0 && (
                <div className="text-sm opacity-70 mt-1">
                  {t('login.retryCount', { count: retryCount, max: 3 }) || `尝试次数: ${retryCount}/3`}
                </div>
              )}
            </div>
            <div className="flex-none">
              <button 
                onClick={handleRetry}
                className="btn btn-sm btn-ghost"
              >
                {t('login.retry') || '重试'}
              </button>
            </div>
          </div>
        )}

        {/* Header centered */}
        <div className="text-center mb-6">
          <h2 className={cn("card-title justify-center mb-2", "text-base")}>
            {reAuthMode 
              ? (t('login.reAuthTitle') || '重新验证')
              : (t('login.title') || '登录')}
          </h2>
          <p className={cn("text-base", "text-base-content/60")}>
            {reAuthMode 
              ? (t('login.reAuthSubtitle') || '请重新输入您的凭据以继续')
              : (t('login.subtitle') || '请输入您的登录凭据')}
          </p>
        </div>

        {/* Login Method Tabs */}
        <div className="tabs tabs-boxed mb-4">
          <a 
            className={`tab ${loginMethod === 'password' ? 'tab-active' : ''}`}
            onClick={() => setLoginMethod('password')}
          >
            {t('login.withPassword') || 'Password'}
          </a>
          <a 
            className={`tab ${loginMethod === 'magiclink' ? 'tab-active' : ''}`}
            onClick={() => setLoginMethod('magiclink')}
          >
            {t('login.withMagicLink') || 'Magic Link'}
          </a>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className={cn("label-text", "text-base")}>{t('login.email')}</span>
            </label>
            <input
              type="email"
              className={`input input-bordered ${errors.email ? 'input-error' : ''}`}
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setErrors({ ...errors, email: '' });
              }}
              required
              autoComplete="email"
              placeholder="admin@example.com"
            />
            {errors.email && (
              <label className="label">
                <span className={cn("label-text-alt text-error", "text-base")}>{errors.email}</span>
              </label>
            )}
          </div>

          {loginMethod === 'password' && (
            <>
              <div className="form-control">
                <label className="label">
                  <span className={cn("label-text", "text-base")}>{t('login.password')}</span>
                </label>
                <input
                  type="password"
                  className={`input input-bordered ${errors.password ? 'input-error' : ''}`}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setErrors({ ...errors, password: '' });
                  }}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <label className="label">
                    <span className={cn("label-text-alt text-error", "text-base")}>{errors.password}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className={cn("label-text", "text-base")}>{t('login.rememberMe')}</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <Link
                  to="/auth/forgot-password"
                  className={cn("link link-primary", "text-base")}
                >
                  {t('login.forgotPassword')}
                </Link>
              </div>
            </>
          )}

          {loginMethod === 'magiclink' && (
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>{t('login.magicLinkInfo') || 'We will send you a secure link to sign in without a password.'}</span>
            </div>
          )}

          <div className="space-y-2">
            <button
              type="submit"
              className={cn("btn btn-primary w-full", "text-base")}
              disabled={isLoading || isMagicLinkLoading}
            >
              {(isLoading || isMagicLinkLoading) && <span className="loading loading-spinner"></span>}
              {reAuthMode 
                ? (loginMethod === 'magiclink' 
                   ? (t('login.resendAuthLink') || '重新发送验证链接')
                   : (t('login.reAuthenticate') || '重新验证'))
                : (loginMethod === 'magiclink' 
                   ? (t('login.sendMagicLink') || 'Send Magic Link')
                   : t('login.submit'))}
            </button>
            
            {reAuthMode && (
              <button
                type="button"
                onClick={handleCancelReAuth}
                className={cn("btn btn-outline w-full", "text-base")}
                disabled={isLoading || isMagicLinkLoading}
              >
                {t('login.cancelReAuth') || '取消重新验证'}
              </button>
            )}
          </div>
        </form>

        <div className="divider">OR</div>

        <p className={cn("text-center", "text-base")}>
          {t('login.noAccount')}{' '}
          <Link to="/auth/register" className="link link-primary">
            {t('login.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}