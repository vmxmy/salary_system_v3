import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  usePayrolls, 
  usePayrollDetails, 
  useUpdatePayrollStatus,
  PayrollStatus,
  type PayrollStatusType 
} from '@/hooks/payroll';
import { PayrollDetailView } from '@/components/payroll';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { cn } from '@/lib/utils';
import { buttonEffects } from '@/styles/design-effects';
import { useToast } from '@/contexts/ToastContext';
import { useState } from 'react';

export default function PayrollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['payroll', 'common']);
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const { showSuccess, showError } = useToast();

  // 获取薪资记录
  const { data: payrollData, isLoading: payrollLoading } = usePayrolls({
    page: 1,
    pageSize: 1
  });

  // 获取薪资明细
  const { data: details, isLoading: detailsLoading } = usePayrollDetails(id || '');

  // 更新状态 mutation
  const updateStatus = useUpdatePayrollStatus();

  // 从列表中找到当前记录
  const payroll = payrollData?.data.find(p => p.id === id);

  if (payrollLoading || !payroll) {
    return <LoadingScreen />;
  }

  // 处理状态更新
  const handleStatusUpdate = async (newStatus: PayrollStatusType) => {
    if (!id) return;

    setIsUpdating(true);
    try {
      await updateStatus.mutateAsync({
        payrollId: id,
        status: newStatus
      });
      showSuccess(t('payroll:statusUpdateSuccess'));
    } catch (error) {
      showError(t('payroll:statusUpdateError'));
    } finally {
      setIsUpdating(false);
    }
  };

  // 获取可用的操作按钮
  const getAvailableActions = () => {
    const actions = [];

    switch (payroll.status) {
      case PayrollStatus.DRAFT:
        actions.push({
          label: t('payroll:calculate'),
          onClick: () => handleStatusUpdate(PayrollStatus.CALCULATING),
          variant: 'primary' as const,
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )
        });
        break;

      case PayrollStatus.CALCULATED:
        actions.push({
          label: t('payroll:approve'),
          onClick: () => handleStatusUpdate(PayrollStatus.APPROVED),
          variant: 'success' as const,
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        });
        actions.push({
          label: t('payroll:recalculate'),
          onClick: () => handleStatusUpdate(PayrollStatus.CALCULATING),
          variant: 'secondary' as const,
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )
        });
        break;

      case PayrollStatus.APPROVED:
        actions.push({
          label: t('payroll:markPaid'),
          onClick: () => handleStatusUpdate(PayrollStatus.PAID),
          variant: 'primary' as const,
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        });
        break;
    }

    // 取消操作（除了已支付和已取消状态）
    if (![PayrollStatus.PAID, PayrollStatus.CANCELLED].includes(payroll.status)) {
      actions.push({
        label: t('common:cancel'),
        onClick: () => handleStatusUpdate(PayrollStatus.CANCELLED),
        variant: 'error' as const,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        )
      });
    }

    return actions;
  };

  const actions = getAvailableActions();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 页面标题和操作 */}
      <PageHeader
        title={t('payroll:payrollDetails')}
        description={`${payroll.employee?.employee_name} - ${payroll.employee?.id_number || '未知'}`}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/payroll')}
              className={cn(buttonEffects.ghost, 'btn btn-sm gap-2')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('common:back')}
            </button>

            {/* 打印按钮 */}
            <button
              onClick={() => window.print()}
              className={cn(buttonEffects.secondary, 'btn btn-sm gap-2')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {t('common:print')}
            </button>

            {/* 状态操作按钮 */}
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={isUpdating}
                className={cn(
                  action.variant === 'primary' ? buttonEffects.primary :
                  action.variant === 'success' ? buttonEffects.secondary + ' text-success border-success/20' :
                  action.variant === 'error' ? buttonEffects.ghost + ' text-error' :
                  buttonEffects.secondary,
                  'btn btn-sm gap-2'
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        }
      />

      {/* 薪资详情 */}
      <PayrollDetailView
        payroll={payroll}
        details={details}
        loading={detailsLoading}
      />
    </div>
  );
}