import { useState, useCallback } from 'react';

export default function SimpleReportPage() {
  const [message, setMessage] = useState('报表管理页面正在初始化...');
  
  const handleTestClick = useCallback(() => {
    setMessage('按钮点击成功！页面渲染正常。');
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">报表管理</h1>
          <p className="text-base-content/60">管理报表模板和生成报表</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleTestClick}
        >
          测试按钮
        </button>
      </div>

      {/* 状态信息卡片 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">系统状态</h2>
          <div className="space-y-2">
            <p><strong>渲染状态:</strong> ✅ 组件已成功渲染</p>
            <p><strong>当前时间:</strong> {new Date().toLocaleString()}</p>
            <p><strong>消息:</strong> {message}</p>
          </div>
        </div>
      </div>

      {/* 功能区域占位 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-primary text-primary-content">
          <div className="card-body">
            <h3 className="card-title">报表模板</h3>
            <p>管理报表模板配置</p>
            <div className="stat-value">5</div>
          </div>
        </div>
        
        <div className="card bg-secondary text-secondary-content">
          <div className="card-body">
            <h3 className="card-title">生成任务</h3>
            <p>查看报表生成进度</p>
            <div className="stat-value">2</div>
          </div>
        </div>
        
        <div className="card bg-accent text-accent-content">
          <div className="card-body">
            <h3 className="card-title">历史记录</h3>
            <p>浏览已生成的报表</p>
            <div className="stat-value">12</div>
          </div>
        </div>
      </div>

      {/* 模拟加载测试 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title">模拟数据加载测试</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">成功状态</h4>
              <div className="alert alert-success">
                <span>数据加载完成</span>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">加载状态</h4>
              <div className="flex items-center space-x-2">
                <span className="loading loading-spinner loading-sm"></span>
                <span>正在加载...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}