import { useState, useCallback } from 'react';

// 报表生成配置接口
export interface ReportGenerationConfig {
  templateId: string;
  format: 'xlsx' | 'pdf' | 'csv';
  periodId?: string;
  periodName?: string;
  filters?: {
    statusFilter?: string;
    searchQuery?: string;
  };
}

// 生成状态接口
export interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  error?: string;
}

// Mock 报表生成器钩子
export const useReportGenerator = () => {
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    currentStep: '',
    error: undefined,
  });

  const updateProgress = useCallback((step: string, progress: number) => {
    setGenerationState(prev => ({
      ...prev,
      currentStep: step,
      progress: Math.min(100, Math.max(0, progress)),
    }));
  }, []);

  const generateReport = useCallback(async (config: ReportGenerationConfig): Promise<Blob> => {
    setGenerationState({
      isGenerating: true,
      progress: 0,
      currentStep: '准备生成报表...',
      error: undefined,
    });

    try {
      // 模拟报表生成过程
      await new Promise(resolve => setTimeout(resolve, 500));
      updateProgress('获取数据...', 20);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      updateProgress('处理数据...', 50);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      updateProgress('格式化输出...', 80);
      
      await new Promise(resolve => setTimeout(resolve, 400));
      updateProgress('完成', 100);

      // 创建一个模拟的Excel文件
      let mockData: string;
      let mimeType: string;

      switch (config.format) {
        case 'xlsx':
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          mockData = `Mock Excel Data for template ${config.templateId}`;
          break;
        case 'csv':
          mimeType = 'text/csv';
          mockData = `员工姓名,部门,应发合计,实发合计\n张三,技术部,10000,8500\n李四,人事部,8000,6800`;
          break;
        case 'pdf':
          mimeType = 'application/pdf';
          mockData = `Mock PDF Data for template ${config.templateId}`;
          break;
        default:
          throw new Error(`不支持的格式: ${config.format}`);
      }

      // 创建Blob对象
      const blob = new Blob([mockData], { type: mimeType });

      setGenerationState({
        isGenerating: false,
        progress: 100,
        currentStep: '生成完成',
        error: undefined,
      });

      return blob;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成报表失败';
      
      setGenerationState({
        isGenerating: false,
        progress: 0,
        currentStep: '',
        error: errorMessage,
      });

      throw error;
    }
  }, [updateProgress]);

  return {
    generateReport,
    generationState,
    updateProgress,
  };
};