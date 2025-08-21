/**
 * 布局诊断页面 - 分析PayrollListPage和PayrollApprovalPage的布局差异
 */
import React, { useEffect, useState } from 'react';

interface LayoutMetrics {
  pageContainer: {
    width: string;
    padding: string;
    margin: string;
    boxSizing: string;
  };
  searchBox: {
    width: string;
    padding: string;
    margin: string;
    boxSizing: string;
  };
  tableContainer: {
    width: string;
    padding: string;
    margin: string;
    overflow: string;
  };
}

export default function LayoutDiagnostic() {
  const [currentPageMetrics, setCurrentPageMetrics] = useState<LayoutMetrics | null>(null);

  useEffect(() => {
    // 检测当前页面的布局指标
    const detectLayoutMetrics = () => {
      const pageContainer = document.querySelector('.page-compact');
      const searchBox = document.querySelector('.card.bg-base-100:has(.input)');
      const tableContainer = document.querySelector('.overflow-x-auto');

      if (pageContainer && searchBox && tableContainer) {
        const pageStyles = window.getComputedStyle(pageContainer);
        const searchStyles = window.getComputedStyle(searchBox);
        const tableStyles = window.getComputedStyle(tableContainer);

        setCurrentPageMetrics({
          pageContainer: {
            width: pageStyles.width,
            padding: pageStyles.padding,
            margin: pageStyles.margin,
            boxSizing: pageStyles.boxSizing,
          },
          searchBox: {
            width: searchStyles.width,
            padding: searchStyles.padding,
            margin: searchStyles.margin,
            boxSizing: searchStyles.boxSizing,
          },
          tableContainer: {
            width: tableStyles.width,
            padding: tableStyles.padding,
            margin: tableStyles.margin,
            overflow: tableStyles.overflow,
          }
        });
      }
    };

    // 延迟检测确保DOM完全渲染
    const timer = setTimeout(detectLayoutMetrics, 1000);
    return () => clearTimeout(timer);
  }, []);

  const analyzeLayout = () => {
    const issues: string[] = [];
    
    if (currentPageMetrics) {
      // 检查容器宽度是否为100%
      if (currentPageMetrics.pageContainer.width !== '100%' && !currentPageMetrics.pageContainer.width.includes('calc')) {
        issues.push(`页面容器宽度不是100%: ${currentPageMetrics.pageContainer.width}`);
      }
      
      // 检查搜索框是否有固定宽度限制
      if (currentPageMetrics.searchBox.width !== 'auto' && !currentPageMetrics.searchBox.width.includes('%')) {
        issues.push(`搜索框可能有固定宽度限制: ${currentPageMetrics.searchBox.width}`);
      }
      
      // 检查表格容器的overflow设置
      if (currentPageMetrics.tableContainer.overflow === 'hidden') {
        issues.push(`表格容器overflow为hidden，可能影响全屏显示`);
      }
    }
    
    return issues;
  };

  const issues = analyzeLayout();

  return (
    <div className="page-compact">
      <div className="card bg-base-100 shadow-lg border border-base-300">
        <div className="card-body">
          <h1 className="card-title text-2xl font-bold text-primary">
            布局诊断工具
          </h1>
          <p className="text-base-content/70 mb-6">
            分析PayrollListPage和PayrollApprovalPage的布局差异
          </p>

          {currentPageMetrics && (
            <div className="space-y-6">
              {/* 布局指标 */}
              <div>
                <h2 className="text-xl font-semibold mb-4">当前页面布局指标</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* 页面容器 */}
                  <div className="card bg-base-200/50">
                    <div className="card-body p-4">
                      <h3 className="font-medium text-sm text-primary">页面容器 (.page-compact)</h3>
                      <div className="text-xs space-y-1 mt-2">
                        <div><span className="font-medium">宽度:</span> {currentPageMetrics.pageContainer.width}</div>
                        <div><span className="font-medium">内边距:</span> {currentPageMetrics.pageContainer.padding}</div>
                        <div><span className="font-medium">外边距:</span> {currentPageMetrics.pageContainer.margin}</div>
                        <div><span className="font-medium">盒模型:</span> {currentPageMetrics.pageContainer.boxSizing}</div>
                      </div>
                    </div>
                  </div>

                  {/* 搜索框 */}
                  <div className="card bg-base-200/50">
                    <div className="card-body p-4">
                      <h3 className="font-medium text-sm text-primary">搜索框容器</h3>
                      <div className="text-xs space-y-1 mt-2">
                        <div><span className="font-medium">宽度:</span> {currentPageMetrics.searchBox.width}</div>
                        <div><span className="font-medium">内边距:</span> {currentPageMetrics.searchBox.padding}</div>
                        <div><span className="font-medium">外边距:</span> {currentPageMetrics.searchBox.margin}</div>
                        <div><span className="font-medium">盒模型:</span> {currentPageMetrics.searchBox.boxSizing}</div>
                      </div>
                    </div>
                  </div>

                  {/* 表格容器 */}
                  <div className="card bg-base-200/50">
                    <div className="card-body p-4">
                      <h3 className="font-medium text-sm text-primary">表格容器 (.overflow-x-auto)</h3>
                      <div className="text-xs space-y-1 mt-2">
                        <div><span className="font-medium">宽度:</span> {currentPageMetrics.tableContainer.width}</div>
                        <div><span className="font-medium">内边距:</span> {currentPageMetrics.tableContainer.padding}</div>
                        <div><span className="font-medium">外边距:</span> {currentPageMetrics.tableContainer.margin}</div>
                        <div><span className="font-medium">溢出:</span> {currentPageMetrics.tableContainer.overflow}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 问题诊断 */}
              <div>
                <h2 className="text-xl font-semibold mb-4">问题诊断</h2>
                {issues.length > 0 ? (
                  <div className="alert alert-warning">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h3 className="font-bold">发现潜在布局问题:</h3>
                      <ul className="list-disc list-inside text-sm mt-2">
                        {issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-success">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>未发现明显的布局问题</div>
                  </div>
                )}
              </div>

              {/* 建议修复方案 */}
              <div>
                <h2 className="text-xl font-semibold mb-4">建议修复方案</h2>
                <div className="card bg-base-200/30">
                  <div className="card-body p-4">
                    <div className="space-y-3 text-sm">
                      <div>
                        <h4 className="font-medium text-primary">1. 检查SimpleSearchBox的card包装</h4>
                        <p className="text-base-content/70">确保搜索框的卡片容器使用 <code className="bg-base-300 px-1 rounded">w-full</code> 类</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-primary">2. 检查ManagementPageLayout的渲染差异</h4>
                        <p className="text-base-content/70">对比两个页面传递给ManagementPageLayout的props是否一致</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-primary">3. 检查customContent vs statCardsExtra</h4>
                        <p className="text-base-content/70">PayrollListPage使用了customContent，而PayrollApprovalPage只使用statCardsExtra</p>
                      </div>

                      <div>
                        <h4 className="font-medium text-primary">4. 使用浏览器开发者工具</h4>
                        <p className="text-base-content/70">在两个页面上同时打开开发者工具，对比DOM结构和计算样式</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!currentPageMetrics && (
            <div className="flex items-center justify-center py-8">
              <div className="loading loading-spinner loading-lg text-primary"></div>
              <span className="ml-3">正在检测页面布局...</span>
            </div>
          )}

          {/* 实时宽度检测 */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">实时宽度检测</h2>
            <div className="bg-primary/10 p-4 rounded-lg border-2 border-dashed border-primary">
              <div className="text-sm">
                <div>视口宽度: <span className="font-mono">{window.innerWidth}px</span></div>
                <div>页面容器实际宽度: <span className="font-mono" id="page-width">检测中...</span></div>
                <div>搜索框实际宽度: <span className="font-mono" id="search-width">检测中...</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}