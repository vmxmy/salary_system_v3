import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { useModal } from '@/components/common/Modal';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updatePassword } = useUnifiedAuth();
  const { t } = useTranslation('auth');
  const modal = useModal();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isResetSuccessful, setIsResetSuccessful] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Check if we have the necessary tokens/session for password reset
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      // Redirect to forgot password if no tokens present
      navigate('/auth/forgot-password');
    }
  }, [searchParams, navigate]);

  const validateForm = () => {
    const newErrors = {
      newPassword: '',
      confirmPassword: '',
    };

    if (!formData.newPassword) {
      newErrors.newPassword = t('validation.passwordRequired') || 'Password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = t('validation.passwordMinLength') || 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.confirmPasswordRequired') || 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordsDoNotMatch') || 'Passwords do not match';
    }

    setErrors(newErrors);
    return !newErrors.newPassword && !newErrors.confirmPassword;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await updatePassword(formData.newPassword);
      setIsResetSuccessful(true);
    } catch (error: any) {
      console.error('Password reset failed:', error);
      modal.showError(t('resetPassword.failed') || 'Failed to reset password. Please try again or request a new reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isResetSuccessful) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className={cn("card-title mb-2", "text-base")}>
            {t('resetPassword.success') || 'Password Reset Successful'}
          </h2>
          <p className={cn("text-base", "text-base-content/60 mb-6")}>
            {t('resetPassword.successDescription') || 
             'Your password has been successfully reset. You can now sign in with your new password.'}
          </p>
          <Link
            to="/auth/login"
            className={cn("btn btn-primary w-full", "text-base")}
          >
            {t('resetPassword.signIn') || 'Sign In'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className={cn("card-title mb-2", "text-base")}>
          {t('resetPassword.title') || 'Reset Password'}
        </h2>
        <p className={cn("text-base", "text-base-content/60 mb-6")}>
          {t('resetPassword.subtitle') || 'Please enter your new password below.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label htmlFor="reset-new-password" className="label">
              <span className={cn("label-text", "text-base")}>
                {t('resetPassword.newPassword') || 'New Password'}
              </span>
            </label>
            <input
              id="reset-new-password"
              name="newPassword"
              type="password"
              className={`input input-bordered ${errors.newPassword ? 'input-error' : ''}`}
              value={formData.newPassword}
              onChange={(e) => {
                setFormData({ ...formData, newPassword: e.target.value });
                setErrors({ ...errors, newPassword: '' });
              }}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              aria-describedby={errors.newPassword ? "reset-new-password-error" : undefined}
            />
            {errors.newPassword && (
              <label className="label">
                <span id="reset-new-password-error" className={cn("label-text-alt text-error", "text-base")}>{errors.newPassword}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label htmlFor="reset-confirm-password" className="label">
              <span className={cn("label-text", "text-base")}>
                {t('resetPassword.confirmPassword') || 'Confirm New Password'}
              </span>
            </label>
            <input
              id="reset-confirm-password"
              name="confirmPassword"
              type="password"
              className={`input input-bordered ${errors.confirmPassword ? 'input-error' : ''}`}
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData({ ...formData, confirmPassword: e.target.value });
                setErrors({ ...errors, confirmPassword: '' });
              }}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              aria-describedby={errors.confirmPassword ? "reset-confirm-password-error" : undefined}
            />
            {errors.confirmPassword && (
              <label className="label">
                <span id="reset-confirm-password-error" className={cn("label-text-alt text-error", "text-base")}>{errors.confirmPassword}</span>
              </label>
            )}
          </div>

          <button
            type="submit"
            className={cn("btn btn-primary w-full", "text-base")}
            disabled={isLoading}
          >
            {isLoading && <span className="loading loading-spinner"></span>}
            {t('resetPassword.submit') || 'Reset Password'}
          </button>
        </form>

        <div className="divider">OR</div>

        <Link
          to="/auth/login"
          className={cn("btn btn-outline w-full", "text-base")}
        >
          {t('resetPassword.backToLogin') || 'Back to login'}
        </Link>
      </div>
      
      {/* Modal组件 */}
      {modal.AlertModal}
      {modal.ConfirmModal}
    </div>
  );
}