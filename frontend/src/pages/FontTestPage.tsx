import React from 'react';

/**
 * 字体测试页面 - 用于调试字体配置
 */
export default function FontTestPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">字体配置测试页面</h1>
      
      {/* 默认字体测试 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">默认字体 (font-sans)</h2>
          <p className="text-lg">
            这是默认字体：中文字符测试 Chinese Text 1234567890
          </p>
          <p className="text-sm opacity-60">
            应该显示为：Inter + Noto Sans SC
          </p>
        </div>
      </div>

      {/* 中文字体测试 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title font-chinese">中文字体 (font-chinese)</h2>
          <p className="text-lg font-chinese">
            这是中文字体：员工管理系统薪资计算模块
          </p>
          <p className="text-sm opacity-60">
            应该显示为：Noto Sans SC 或系统中文字体
          </p>
        </div>
      </div>

      {/* 衬线字体测试 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title font-chinese-serif">衬线字体 (font-chinese-serif)</h2>
          <p className="text-lg font-chinese-serif">
            这是衬线字体：重要通知和正式文档标题
          </p>
          <p className="text-sm opacity-60">
            应该显示为：Songti SC 或系统宋体
          </p>
        </div>
      </div>

      {/* 直接测试系统衬线字体 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title test-serif">直接系统衬线字体 (.test-serif)</h2>
          <p className="text-lg test-serif">
            这是直接使用 Songti SC 系统字体：员工管理系统薪资管理模块重要通知
          </p>
          <p className="text-sm opacity-60">
            强制使用：Songti SC, SimSun, Times New Roman, serif
          </p>
          <div className="mt-4 space-y-2">
            <p className="test-serif text-2xl font-bold">大标题测试 - 24px Bold</p>
            <p className="test-serif text-xl font-semibold">中标题测试 - 20px SemiBold</p>
            <p className="test-serif text-lg">正文测试 - 18px Regular</p>
            <p className="test-serif text-base">默认文字 - 16px Regular</p>
            <p className="test-serif text-sm">小字体 - 14px Regular</p>
          </div>
        </div>
      </div>

      {/* 英文字体测试 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title font-english">English Font (font-english)</h2>
          <p className="text-lg font-english">
            This is English font: Employee Management System
          </p>
          <p className="text-sm opacity-60">
            应该显示为：Inter 或系统英文字体
          </p>
        </div>
      </div>

      {/* DaisyUI 组件字体测试 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">DaisyUI 组件字体测试</h2>
          <div className="space-y-4">
            <button className="btn btn-primary">主要按钮</button>
            <button className="btn btn-secondary">次要按钮</button>
            <div className="badge badge-info">信息徽章</div>
            <div className="alert alert-success">
              <span>成功提示信息</span>
            </div>
          </div>
          <p className="text-sm opacity-60">
            DaisyUI 组件应该继承默认字体配置
          </p>
        </div>
      </div>

      {/* 调试信息 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">调试信息</h2>
          <div className="space-y-2 text-sm font-mono">
            <p>打开浏览器开发者工具，检查以下信息：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Network 标签：确认字体文件是否加载成功</li>
              <li>Elements 标签：检查 computed styles 中的 font-family</li>
              <li>Console：查看是否有字体相关错误</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}