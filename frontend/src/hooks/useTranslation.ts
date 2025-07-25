import { useTranslation as useI18nTranslation } from 'react-i18next';

// Custom hook that wraps react-i18next's useTranslation
// This allows us to add custom logic or default namespaces if needed
export function useTranslation(namespace?: string | string[]) {
  const { t, i18n, ready } = useI18nTranslation(namespace);

  // Helper function to format currency based on locale
  const formatCurrency = (amount: number): string => {
    const locale = i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';
    const currency = i18n.language === 'zh-CN' ? 'CNY' : 'USD';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Helper function to format date based on locale
  const formatDate = (date: Date | string): string => {
    const locale = i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat(locale).format(dateObj);
  };

  // Helper function to format date and time based on locale
  const formatDateTime = (date: Date | string): string => {
    const locale = i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };

  return {
    t,
    i18n,
    ready,
    formatCurrency,
    formatDate,
    formatDateTime,
  };
}

export default useTranslation;