import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import zhCNCommon from './zh-CN/common.json';
import zhCNAuth from './zh-CN/auth.json';
import zhCNEmployee from './zh-CN/employee.json';
import zhCNPayroll from './zh-CN/payroll.json';
import zhCNAdmin from './zh-CN/admin.json';
import zhCNDashboard from './zh-CN/dashboard.json';

import enUSCommon from './en-US/common.json';
import enUSAuth from './en-US/auth.json';
import enUSEmployee from './en-US/employee.json';
import enUSPayroll from './en-US/payroll.json';
import enUSAdmin from './en-US/admin.json';
import enUSDashboard from './en-US/dashboard.json';

export const defaultNS = 'common';
export const resources = {
  'zh-CN': {
    common: zhCNCommon,
    auth: zhCNAuth,
    employee: zhCNEmployee,
    payroll: zhCNPayroll,
    admin: zhCNAdmin,
    dashboard: zhCNDashboard,
  },
  'en-US': {
    common: enUSCommon,
    auth: enUSAuth,
    employee: enUSEmployee,
    payroll: enUSPayroll,
    admin: enUSAdmin,
    dashboard: enUSDashboard,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh-CN', // Default language
    fallbackLng: 'zh-CN',
    defaultNS,
    ns: ['common', 'auth', 'employee', 'payroll', 'admin', 'dashboard'],
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    react: {
      useSuspense: false, // Set to false for better error handling
    },
  });

export default i18n;