import { useTranslation as useI18nTranslation } from 'react-i18next';

// Custom hook that wraps react-i18next's useTranslation
// This allows us to add custom logic or default namespaces if needed
export function useTranslation(namespace?: string | string[]) {
  const { t: originalT, i18n, ready } = useI18nTranslation(namespace);
  
  // Enhanced translation function with better error handling
  const t = (key: string, options?: any): string => {
    try {
      const result = originalT(key, options);
      
      // Minimal debug logging for translation resolution (reduced to prevent console overload)
      if (process.env.NODE_ENV === 'development' && result === key) {
        console.warn(`[Translation] Missing key: "${key}"`);
      }
      
      // If result is the same as key and contains namespace separator, it might be missing
      if (result === key && key.includes(':')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Missing translation for key: ${key}`);
        }
        // Return just the key part after the namespace
        return key.split(':').pop() || key;
      }
      
      // If result is the same as key (no translation found)
      if (result === key) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Translation not found for key: ${key}, returning key as fallback`);
        }
      }
      
      // Ensure we always return a string
      return String(result);
    } catch (error) {
      console.error(`Translation error for key ${key}:`, error);
      return key;
    }
  };

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

  // Helper function to safely translate status values
  const translateStatus = (status: string | null | undefined, namespace: string = 'common'): string => {
    if (!status || typeof status !== 'string') {
      return t('unknown');
    }
    
    // Clean the status value - remove any unwanted characters
    const cleanStatus = status.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    
    if (!cleanStatus) {
      return t('unknown');
    }
    
    // Try to translate, return original if translation fails
    const translationKey = `${namespace}:status.${cleanStatus}`;
    const translated = t(translationKey);
    
    // If translation failed (returned the key), return a cleaned version
    if (translated === translationKey) {
      return cleanStatus;
    }
    
    return translated;
  };

  return {
    t,
    i18n,
    ready,
    formatCurrency,
    formatDate,
    formatDateTime,
    translateStatus,
  };
}

export default useTranslation;