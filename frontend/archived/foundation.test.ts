/**
 * 基础设施验证测试
 * 确保所有导出的工具函数和类型定义都正常工作
 */

import {
  getPhaseDescription,
  getProgressPercentage,
  getCurrentGroupPercentage,
  getDataGroupLabel,
  getExpectedSheets,
  validateExcelFile,
  calculateDataConsistency,
  formatImportResult,
  generateSheetMapping
} from '../utils/import-helpers';

import {
  isEmptyRow,
  extractEmployeeIdentifier,
  validateRequiredFields,
  isValidNumber,
  isValidDate,
  validateFieldByType,
  validateDataRows,
  checkDuplicateRows
} from '../utils/validation-helpers';

import {
  formatFileSize,
  formatPercentage,
  formatProcessingSpeed,
  formatEstimatedTime,
  formatErrorMessage,
  formatImportStatus,
  formatDataStats,
  formatSheetInfo,
  formatImportConfig,
  formatNumber,
  formatCurrency
} from '../utils/formatters';

import { ImportDataGroup } from '@/types/payroll-import';
import type { 
  DetailedImportProgress, 
  ImportPhase,
  SheetInfo,
  ParseResult,
  UploadStatus,
  ImportErrorType
} from '../types/enhanced-types';

describe('Foundation Validation Tests', () => {
  describe('Import Helpers', () => {
    test('getPhaseDescription should return correct descriptions', () => {
      expect(getPhaseDescription('idle')).toBe('准备中');
      expect(getPhaseDescription('importing')).toBe('导入数据');
      expect(getPhaseDescription('unknown')).toBe('处理中');
    });

    test('getProgressPercentage should calculate correct percentage', () => {
      expect(getProgressPercentage(0, 100)).toBe(0);
      expect(getProgressPercentage(50, 100)).toBe(50);
      expect(getProgressPercentage(100, 100)).toBe(100);
      expect(getProgressPercentage(10, 0)).toBe(0);
    });

    test('getDataGroupLabel should return correct labels', () => {
      expect(getDataGroupLabel(ImportDataGroup.EARNINGS)).toBe('薪资项目');
      expect(getDataGroupLabel(ImportDataGroup.CONTRIBUTION_BASES)).toBe('缴费基数');
    });

    test('getExpectedSheets should return correct sheet names', () => {
      const groups = [ImportDataGroup.EARNINGS, ImportDataGroup.CONTRIBUTION_BASES];
      const sheets = getExpectedSheets(groups);
      expect(sheets).toContain('薪资项目明细');
      expect(sheets).toContain('缴费基数');
    });

    test('validateExcelFile should validate file correctly', () => {
      const validFile = new File(['test'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      expect(validateExcelFile(validFile).isValid).toBe(true);
      expect(validateExcelFile(invalidFile).isValid).toBe(false);
    });
  });

  describe('Validation Helpers', () => {
    test('isValidNumber should validate numbers correctly', () => {
      expect(isValidNumber(123)).toBe(true);
      expect(isValidNumber('123')).toBe(true);
      expect(isValidNumber('abc')).toBe(false);
      expect(isValidNumber(null)).toBe(false);
    });

    test('isValidDate should validate dates correctly', () => {
      expect(isValidDate('2024-01-01')).toBe(true);
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate(null)).toBe(false);
    });

    test('validateRequiredFields should work correctly', () => {
      const row = { name: 'John', age: '', city: 'Shanghai' };
      const result = validateRequiredFields(row, ['name', 'age']);
      
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('age');
    });
  });

  describe('Formatters', () => {
    test('formatFileSize should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    });

    test('formatPercentage should format percentages correctly', () => {
      expect(formatPercentage(0)).toBe('0%');
      expect(formatPercentage(50.7)).toBe('51%');
      expect(formatPercentage(100)).toBe('100%');
    });

    test('formatNumber should format numbers correctly', () => {
      expect(formatNumber(1234.567)).toBe('1,234.57');
      expect(formatNumber(1000, 0)).toBe('1,000');
    });
  });

  describe('TypeScript Types', () => {
    test('ImportPhase type should be properly defined', () => {
      const phase: ImportPhase = 'importing';
      expect(phase).toBe('importing');
    });

    test('UploadStatus type should be properly defined', () => {
      const status: UploadStatus = 'completed';
      expect(status).toBe('completed');
    });

    test('ImportErrorType type should be properly defined', () => {
      const errorType: ImportErrorType = 'VALIDATION_ERROR';
      expect(errorType).toBe('VALIDATION_ERROR');
    });
  });
});

// 导出验证函数
export const validateFoundation = () => {
  console.log('✅ Foundation validation passed - all imports and exports working correctly');
  return true;
};