import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail, cn } from '@/lib/utils';

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

  const from = location.state?.from?.pathname || '/dashboard';

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
      } catch (error: any) {
        console.error('Magic link failed:', error);
        alert(t('login.magicLinkFailed') || 'Failed to send magic link. Please try again.');
      } finally {
        setIsMagicLinkLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        console.log('Attempting to sign in with:', formData.email);
        await signIn(formData.email, formData.password);
        console.log('Sign in successful, navigating to:', from);
        navigate(from, { replace: true });
      } catch (error: any) {
        console.error('Sign in failed:', error);
        let errorMessage = t('login.failed');
        
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = t('login.invalidCredentials');
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = t('login.emailNotConfirmed');
        }
        
        // For now, use alert - can be replaced with a proper toast system later
        alert(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (magicLinkSent) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className={cn("card-title mb-2", "text-base")}>
            {t('login.magicLinkSent') || 'Check your email'}
          </h2>
          <p className={cn("text-base", "text-base-content/60 mb-6")}>
            {t('login.magicLinkSentDescription') || `We've sent a magic link to ${formData.email}. Click the link in the email to sign in.`}
          </p>
          <button
            onClick={() => {
              setMagicLinkSent(false);
              setFormData({ ...formData, email: '' });
            }}
            className={cn("btn btn-outline", "text-base")}
          >
            {t('login.backToLogin') || 'Back to login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className={cn("card-title mb-2", "text-base")}>
          {t('login.title')}
        </h2>
        <p className={cn("text-base", "text-base-content/60 mb-6")}>
          {t('login.subtitle')}
        </p>

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

          <button
            type="submit"
            className={cn("btn btn-primary w-full", "text-base")}
            disabled={isLoading || isMagicLinkLoading}
          >
            {(isLoading || isMagicLinkLoading) && <span className="loading loading-spinner"></span>}
            {loginMethod === 'magiclink' 
              ? (t('login.sendMagicLink') || 'Send Magic Link')
              : t('login.submit')}
          </button>
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