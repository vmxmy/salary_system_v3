import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface PayrollAmountDisplayProps {
  label: string;
  amount: number;
  type?: 'earning' | 'deduction' | 'net';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function PayrollAmountDisplay({
  label,
  amount,
  type = 'earning',
  size = 'md',
  showIcon = true,
  className
}: PayrollAmountDisplayProps) {
  const typeConfig = {
    earning: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 4v16m8-8H4" />
        </svg>
      ),
      textColor: 'text-success',
      bgColor: 'bg-success/10'
    },
    deduction: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M20 12H4" />
        </svg>
      ),
      textColor: 'text-error',
      bgColor: 'bg-error/10'
    },
    net: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      textColor: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  };

  const config = typeConfig[type];
  
  const sizeClasses = {
    sm: 'text-sm p-2',
    md: 'text-base p-3',
    lg: 'text-lg p-4'
  };

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border',
      config.bgColor,
      'border-base-200',
      sizeClasses[size],
      className
    )}>
      {showIcon && (
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full',
          config.textColor,
          'bg-base-100'
        )}>
          {config.icon}
        </div>
      )}
      
      <div className="flex-1">
        <div className="text-sm text-base-content/70">{label}</div>
        <div className={cn(
          'font-semibold',
          config.textColor,
          size === 'lg' ? 'text-xl' : size === 'md' ? 'text-lg' : 'text-base'
        )}>
          {formatCurrency(amount)}
        </div>
      </div>
    </div>
  );
}