import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail, cn } from '@/lib/utils';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { t } = useTranslation('auth');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!email) {
      setError(t('validation.emailRequired') || 'Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError(t('validation.emailInvalid') || 'Please enter a valid email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await resetPassword(email);
      setIsEmailSent(true);
    } catch (error: any) {
      console.error('Password reset failed:', error);
      setError(t('forgotPassword.failed') || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className={cn("card-title mb-2", "text-base")}>
            {t('forgotPassword.emailSent') || 'Check your email'}
          </h2>
          <p className={cn("text-base", "text-base-content/60 mb-6")}>
            {t('forgotPassword.emailSentDescription') || 
             `We've sent a password reset link to ${email}. Please check your email and follow the instructions.`}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                setIsEmailSent(false);
                setEmail('');
              }}
              className={cn("btn btn-outline w-full", "text-base")}
            >
              {t('forgotPassword.sendAnother') || 'Send another email'}
            </button>
            <Link
              to="/auth/login"
              className={cn("btn btn-primary w-full", "text-base")}
            >
              {t('forgotPassword.backToLogin') || 'Back to login'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className={cn("card-title mb-2", "text-base")}>
          {t('forgotPassword.title') || 'Forgot Password'}
        </h2>
        <p className={cn("text-base", "text-base-content/60 mb-6")}>
          {t('forgotPassword.subtitle') || 
           'Enter your email address and we\'ll send you a link to reset your password.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className={cn("label-text", "text-base")}>
                {t('forgotPassword.email') || 'Email Address'}
              </span>
            </label>
            <input
              type="email"
              className={`input input-bordered ${error ? 'input-error' : ''}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              required
              autoComplete="email"
              placeholder="admin@example.com"
            />
            {error && (
              <label className="label">
                <span className={cn("label-text-alt text-error", "text-base")}>{error}</span>
              </label>
            )}
          </div>

          <button
            type="submit"
            className={cn("btn btn-primary w-full", "text-base")}
            disabled={isLoading}
          >
            {isLoading && <span className="loading loading-spinner"></span>}
            {t('forgotPassword.submit') || 'Send Reset Link'}
          </button>
        </form>

        <div className="divider">OR</div>

        <Link
          to="/auth/login"
          className={cn("btn btn-outline w-full", "text-base")}
        >
          {t('forgotPassword.backToLogin') || 'Back to login'}
        </Link>
      </div>
    </div>
  );
}