/**
 * 文档标题管理 Hook
 * 用于动态设置页面标题
 */

import { useEffect } from 'react';

export function useDocumentTitle(title: string, prefix = '高新区工资管理系统') {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} - ${prefix}` : prefix;

    return () => {
      document.title = prevTitle;
    };
  }, [title, prefix]);
}