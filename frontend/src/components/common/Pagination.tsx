import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
  showPageSizeSelect?: boolean;
  showItemsInfo?: boolean;
  pageSizeOptions?: number[];
  maxVisiblePages?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className = '',
  showPageSizeSelect = true,
  showItemsInfo = true,
  pageSizeOptions = [10, 20, 50, 100],
  maxVisiblePages = 7
}: PaginationProps) {
  
  // 计算显示的页码范围
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxVisiblePages) {
      // 总页数少于最大显示数，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总页数多于最大显示数，需要省略
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // 调整开始页码，确保显示足够的页码
      const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1);
      
      // 添加第一页
      if (adjustedStartPage > 1) {
        pages.push(1);
        if (adjustedStartPage > 2) {
          pages.push('...');
        }
      }
      
      // 添加中间页码
      for (let i = adjustedStartPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // 添加最后一页
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* 左侧：页面大小选择 */}
      {showPageSizeSelect && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/70">每页显示</span>
          <select
            className="select select-bordered select-sm"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-sm text-base-content/70">条</span>
        </div>
      )}

      {/* 中间：页码信息 */}
      {showItemsInfo && (
        <div className="text-sm text-base-content/70 order-first sm:order-none">
          {totalItems > 0 ? (
            <>
              显示第 <span className="font-medium">{startItem}</span> 到{' '}
              <span className="font-medium">{endItem}</span> 条，
              共 <span className="font-medium">{totalItems}</span> 条记录
            </>
          ) : (
            '暂无记录'
          )}
        </div>
      )}

      {/* 右侧：页码控件 */}
      <div className="join">
        {/* 首页 */}
        <button
          className="join-item btn btn-sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="首页"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        {/* 上一页 */}
        <button
          className="join-item btn btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="上一页"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 页码按钮 */}
        {visiblePages.map((page, index) => (
          <button
            key={index}
            className={`
              join-item btn btn-sm
              ${page === currentPage ? 'btn-active btn-primary' : ''}
              ${page === '...' ? 'btn-disabled' : ''}
            `}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...' || page === currentPage}
          >
            {page}
          </button>
        ))}

        {/* 下一页 */}
        <button
          className="join-item btn btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="下一页"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* 尾页 */}
        <button
          className="join-item btn btn-sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="尾页"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// 简化版分页组件
interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}: SimplePaginationProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <button
        className="btn btn-sm btn-outline"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        上一页
      </button>
      
      <span className="px-4 py-2 text-sm">
        第 {currentPage} 页，共 {totalPages} 页
      </span>
      
      <button
        className="btn btn-sm btn-outline"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        下一页
      </button>
    </div>
  );
}

// 页码跳转组件
interface PageJumperProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PageJumper({
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}: PageJumperProps) {
  const [inputValue, setInputValue] = React.useState(currentPage.toString());

  React.useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(inputValue);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setInputValue(currentPage.toString());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm">跳转到</span>
      <input
        type="number"
        min={1}
        max={totalPages}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="input input-bordered input-sm w-16 text-center"
      />
      <span className="text-sm">页</span>
      <button type="submit" className="btn btn-sm btn-primary">
        跳转
      </button>
    </form>
  );
}