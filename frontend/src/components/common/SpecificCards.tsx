import React from 'react';
import { FinancialCard, type FinancialCardProps } from './FinancialCard';

// Specific card variants that extend the base FinancialCard
export const ProfitCard: React.FC<Omit<FinancialCardProps, 'variant'> & { variant?: 'success' | 'primary' }> = ({ 
  variant = 'success', 
  icon = '📈', 
  ...props 
}) => {
  return <FinancialCard {...props} variant={variant} icon={icon} />;
};

export const LossCard: React.FC<Omit<FinancialCardProps, 'variant'> & { variant?: 'error' | 'warning' }> = ({ 
  variant = 'error', 
  icon = '📉', 
  ...props 
}) => {
  return <FinancialCard {...props} variant={variant} icon={icon} />;
};

export const WarningCard: React.FC<Omit<FinancialCardProps, 'variant'> & { variant?: 'warning' }> = ({ 
  variant = 'warning', 
  icon = '⚠️', 
  ...props 
}) => {
  return <FinancialCard {...props} variant={variant} icon={icon} />;
};

export const InfoCard: React.FC<Omit<FinancialCardProps, 'variant'> & { variant?: 'info' | 'primary' }> = ({ 
  variant = 'info', 
  icon = 'ℹ️', 
  ...props 
}) => {
  return <FinancialCard {...props} variant={variant} icon={icon} />;
};