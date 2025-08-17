import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PayrollPeriodCompleteness, ElementCompleteness } from '@/types/payroll-completeness';
import { PayrollCompletenessCard } from './PayrollCompletenessCard';
import { 
  getMissingElements,
  canCalculatePayroll,
  transformToElementsArray 
} from '@/hooks/payroll/usePayrollPeriodCompleteness';
import { PAYROLL_ELEMENTS_CONFIG, PayrollElement } from '@/types/payroll-completeness';

interface PayrollCompletenessModalProps {
  isOpen: boolean;
  onClose: () => void;
  completeness: PayrollPeriodCompleteness | null;
  onImportData?: (element: PayrollElement) => void;
  onViewDetails?: (element: PayrollElement) => void;
}

/**
 * 薪资周期四要素完整度详情模态框
 * 显示详细的完整度信息并提供数据导入入口
 */
export function PayrollCompletenessModal({
  isOpen,
  onClose,
  completeness,
  onImportData,
  onViewDetails
}: PayrollCompletenessModalProps) {
  const [selectedElement, setSelectedElement] = useState<ElementCompleteness | null>(null);
  
  if (!completeness) return null;
  
  const elements = transformToElementsArray(completeness);
  const missingElements = getMissingElements(completeness);
  const { canCalculate, reason } = canCalculatePayroll(completeness);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={onClose}
          />
          
          {/* 模态框 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
          >
            <div className="bg-base-100 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* 标题栏 */}
              <div className="flex items-center justify-between p-6 border-b border-base-200">
                <div>
                  <h2 className="text-2xl font-bold">元数据完整度详情</h2>
                  <p className="text-sm text-base-content/60 mt-1">
                    {completeness.period_name} - {completeness.total_employees} 名员工
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="btn btn-ghost btn-circle"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* 内容区域 */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* 完整度卡片 */}
                <PayrollCompletenessCard
                  completeness={completeness}
                  showDetails={true}
                  onElementClick={(element) => setSelectedElement(element)}
                  className="mb-6"
                />
                
                {/* 缺失数据列表 */}
                {missingElements.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">缺失数据</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {missingElements.map((elementKey) => {
                        const element = elements.find(e => e.name === elementKey);
                        if (!element) return null;
                        
                        return (
                          <div
                            key={elementKey}
                            className="border border-error/30 bg-error/5 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">{element.icon}</span>
                                  <span className="font-medium">{element.displayName}</span>
                                </div>
                                <p className="text-sm text-base-content/60 mb-2">
                                  缺失 {element.total - element.count} 名员工的数据
                                </p>
                                <div className="text-xs text-base-content/50">
                                  {PAYROLL_ELEMENTS_CONFIG[elementKey].description}
                                </div>
                              </div>
                              <button
                                onClick={() => onImportData?.(elementKey)}
                                className="btn btn-sm btn-primary"
                              >
                                导入数据
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* 完整数据列表 */}
                {elements.filter(e => e.status === 'complete').length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">已完成数据</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {elements
                        .filter(e => e.status === 'complete')
                        .map((element) => (
                          <div
                            key={element.name}
                            className="border border-success/30 bg-success/5 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">{element.icon}</span>
                                  <span className="font-medium">{element.displayName}</span>
                                  <div className="badge badge-success badge-sm">完整</div>
                                </div>
                                <p className="text-sm text-base-content/60">
                                  所有 {element.total} 名员工数据已完整
                                </p>
                              </div>
                              <button
                                onClick={() => onViewDetails?.(element.name as PayrollElement)}
                                className="btn btn-sm btn-ghost"
                              >
                                查看详情
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 底部操作栏 */}
              <div className="flex items-center justify-between p-6 border-t border-base-200">
                <div className="flex items-center gap-2">
                  {canCalculate ? (
                    <div className="flex items-center gap-2 text-success">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">数据完整，可以计算薪资</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-warning">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm">{reason}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {!canCalculate && missingElements.length > 0 && (
                    <button
                      onClick={() => onImportData?.(missingElements[0])}
                      className="btn btn-primary"
                    >
                      导入缺失数据
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="btn btn-ghost"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}