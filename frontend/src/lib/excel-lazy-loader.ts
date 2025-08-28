/**
 * Excel Lazy Loader - Dynamically imports Excel libraries only when needed
 * Reduces initial bundle size by ~1.3MB
 */

// Lazy load Excel.js for advanced Excel operations
export const loadExcelJS = async () => {
  const ExcelJS = await import('exceljs');
  return ExcelJS;
};

// Lazy load XLSX for simple Excel operations  
export const loadXLSX = async () => {
  const XLSX = await import('xlsx');
  return XLSX;
};

// Combined loader with error handling
export const loadExcelLibraries = async () => {
  try {
    const [exceljs, xlsx] = await Promise.all([
      loadExcelJS(),
      loadXLSX()
    ]);
    
    return {
      ExcelJS: exceljs,
      XLSX: xlsx,
      available: true
    };
  } catch (error) {
    console.error('Failed to load Excel libraries:', error);
    return {
      ExcelJS: null,
      XLSX: null,
      available: false,
      error
    };
  }
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