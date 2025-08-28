/**
 * Excel Lazy Loader - 按需动态加载Excel库
 * 优化后分别加载减少初始包体积：
 * - excel-core chunk: ~400KB (xlsx)
 * - excel-advanced chunk: ~800KB (exceljs)
 */

// 轻量级 Excel 库 - 用于简单读写操作
export const loadXLSX = async () => {
  const XLSX = await import('xlsx');
  return XLSX;
};

// 高级 Excel 库 - 用于复杂格式和样式操作
export const loadExcelJS = async () => {
  const ExcelJS = await import('exceljs');
  return ExcelJS;
};

// 选择性加载 - 根据需求加载对应库
export const loadExcelLibrary = async (type: 'simple' | 'advanced' | 'both' = 'simple') => {
  try {
    if (type === 'simple') {
      const xlsx = await loadXLSX();
      return {
        XLSX: xlsx,
        ExcelJS: null,
        available: true,
        loadedLibraries: ['xlsx']
      };
    }
    
    if (type === 'advanced') {
      const exceljs = await loadExcelJS();
      return {
        ExcelJS: exceljs,
        XLSX: null,
        available: true,
        loadedLibraries: ['exceljs']
      };
    }
    
    // 同时加载两个库（向后兼容）
    const [exceljs, xlsx] = await Promise.all([
      loadExcelJS(),
      loadXLSX()
    ]);
    
    return {
      ExcelJS: exceljs,
      XLSX: xlsx,
      available: true,
      loadedLibraries: ['xlsx', 'exceljs']
    };
  } catch (error) {
    console.error(`Failed to load Excel libraries (${type}):`, error);
    return {
      ExcelJS: null,
      XLSX: null,
      available: false,
      loadedLibraries: [],
      error
    };
  }
};

// 向后兼容的组合加载器
export const loadExcelLibraries = async () => {
  return loadExcelLibrary('both');
};

// Loading state utilities
export const createExcelLoadingState = () => {
  let loading = false;
  let loaded = false;
  let libraries: any = null;

  return {
    isLoading: () => loading,
    isLoaded: () => loaded,
    getLibraries: () => libraries,
    
    async load() {
      if (loaded) return libraries;
      if (loading) {
        // Wait for existing load to complete
        while (loading) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return libraries;
      }

      loading = true;
      try {
        libraries = await loadExcelLibraries();
        loaded = true;
        return libraries;
      } finally {
        loading = false;
      }
    }
  };
};

// Global instance for shared loading state
export const excelLoader = createExcelLoadingState();