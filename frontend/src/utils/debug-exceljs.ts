/**
 * ExcelJS导入调试工具
 * 用于诊断ExcelJS构造函数问题
 */

export async function debugExcelJSImport(): Promise<void> {
  console.log('=== ExcelJS调试开始 ===');
  
  try {
    // 尝试动态导入
    console.log('1. 尝试动态导入ExcelJS...');
    const ExcelJS = await import('exceljs');
    
    console.log('2. ExcelJS导入结果:', ExcelJS);
    console.log('3. ExcelJS类型:', typeof ExcelJS);
    console.log('4. ExcelJS.default:', ExcelJS.default);
    console.log('5. ExcelJS.Workbook:', (ExcelJS as any).Workbook);
    console.log('6. ExcelJS.default.Workbook:', ExcelJS.default && (ExcelJS.default as any).Workbook);
    
    // 新增：检测是否为浏览器环境下的UMD模块
    console.log('7. 检查UMD全局变量...');
    if (typeof window !== 'undefined') {
      console.log('   window.ExcelJS:', (window as any).ExcelJS);
      if ((window as any).ExcelJS) {
        console.log('   window.ExcelJS.Workbook:', (window as any).ExcelJS.Workbook);
        console.log('   window.ExcelJS类型:', typeof (window as any).ExcelJS);
      }
    }
    
    // 尝试不同的构造方法
    console.log('8. 尝试构造工作簿...');
    
    let workbook: any = null;
    let constructorMethod = '';
    
    // 方法0: 使用全局变量 (UMD模式)
    if (!workbook && typeof window !== 'undefined' && (window as any).ExcelJS) {
      try {
        if ((window as any).ExcelJS.Workbook) {
          workbook = new (window as any).ExcelJS.Workbook();
          constructorMethod = 'new window.ExcelJS.Workbook()';
          console.log('✓ 方法0成功: new window.ExcelJS.Workbook()');
        } else if (typeof (window as any).ExcelJS === 'function') {
          workbook = new (window as any).ExcelJS();
          constructorMethod = 'new window.ExcelJS()';
          console.log('✓ 方法0成功: new window.ExcelJS()');
        }
      } catch (error) {
        console.log('✗ 方法0失败: window.ExcelJS', error);
      }
    }
    
    // 方法1: 直接使用ExcelJS.Workbook
    if (!workbook) {
      try {
        if ((ExcelJS as any).Workbook) {
          workbook = new (ExcelJS as any).Workbook();
          constructorMethod = 'new ExcelJS.Workbook()';
          console.log('✓ 方法1成功: new ExcelJS.Workbook()');
        }
      } catch (error) {
        console.log('✗ 方法1失败: new ExcelJS.Workbook()', error);
      }
    }
    
    // 方法2: 使用ExcelJS.default.Workbook
    if (!workbook) {
      try {
        if (ExcelJS.default && (ExcelJS.default as any).Workbook) {
          workbook = new (ExcelJS.default as any).Workbook();
          constructorMethod = 'new ExcelJS.default.Workbook()';
          console.log('✓ 方法2成功: new ExcelJS.default.Workbook()');
        }
      } catch (error) {
        console.log('✗ 方法2失败: new ExcelJS.default.Workbook()', error);
      }
    }
    
    // 方法3: 使用ExcelJS.default()
    if (!workbook) {
      try {
        if (typeof ExcelJS.default === 'function') {
          workbook = new (ExcelJS.default as any)();
          constructorMethod = 'new ExcelJS.default()';
          console.log('✓ 方法3成功: new ExcelJS.default()');
        }
      } catch (error) {
        console.log('✗ 方法3失败: new ExcelJS.default()', error);
      }
    }
    
    // 方法4: 工厂模式
    if (!workbook) {
      try {
        if (ExcelJS.default && typeof (ExcelJS.default as any).createWorkbook === 'function') {
          workbook = (ExcelJS.default as any).createWorkbook();
          constructorMethod = 'ExcelJS.default.createWorkbook()';
          console.log('✓ 方法4成功: ExcelJS.default.createWorkbook()');
        }
      } catch (error) {
        console.log('✗ 方法4失败: ExcelJS.default.createWorkbook()', error);
      }
    }
    
    if (workbook) {
      console.log('9. ✓ 工作簿创建成功!');
      console.log('   使用方法:', constructorMethod);
      console.log('   工作簿对象:', workbook);
      console.log('   工作簿类型:', typeof workbook);
      console.log('   addWorksheet方法存在:', typeof workbook.addWorksheet);
      
      // 测试基本操作
      try {
        const worksheet = workbook.addWorksheet('测试表');
        console.log('10. ✓ 工作表创建成功:', worksheet);
        
        worksheet.getCell('A1').value = '测试值';
        console.log('11. ✓ 单元格设置成功');
        
        const buffer = await workbook.xlsx.writeBuffer();
        console.log('12. ✓ 缓冲区生成成功, 大小:', buffer.byteLength);
        
        console.log('=== ExcelJS调试完成 - 所有功能正常 ===');
        return;
        
      } catch (error) {
        console.log('10-12. ✗ 工作簿操作失败:', error);
      }
    } else {
      console.log('9. ✗ 所有构造方法均失败');
    }
    
    // 显示所有可用的属性和方法
    console.log('13. ExcelJS导入对象的所有键:');
    console.log('    ExcelJS keys:', Object.keys(ExcelJS));
    if (ExcelJS.default) {
      console.log('    ExcelJS.default keys:', Object.keys(ExcelJS.default));
      console.log('    ExcelJS.default type:', typeof ExcelJS.default);
    }
    
    // 检查prototype和constructor
    console.log('14. 检查ExcelJS原型:');
    if (ExcelJS.default) {
      console.log('    ExcelJS.default.prototype:', (ExcelJS.default as any).prototype);
      console.log('    ExcelJS.default.constructor:', (ExcelJS.default as any).constructor);
    }
    
  } catch (error) {
    console.log('=== ExcelJS导入失败 ===');
    console.error('导入错误:', error);
  }
  
  console.log('=== ExcelJS调试结束 ===');
}

/**
 * 获取正确的ExcelJS工作簿构造方法
 */
export async function getExcelJSWorkbook(): Promise<{ workbook: any; method: string } | null> {
  try {
    const ExcelJS = await import('exceljs');
    
    // 尝试不同的构造方法
    const methods = [
      {
        name: 'new ExcelJS.Workbook()',
        fn: () => new (ExcelJS as any).Workbook(),
        check: () => (ExcelJS as any).Workbook
      },
      {
        name: 'new ExcelJS.default.Workbook()',
        fn: () => new (ExcelJS.default as any).Workbook(),
        check: () => ExcelJS.default && (ExcelJS.default as any).Workbook
      },
      {
        name: 'new ExcelJS.default()',
        fn: () => new (ExcelJS.default as any)(),
        check: () => typeof ExcelJS.default === 'function'
      }
    ];
    
    for (const method of methods) {
      if (method.check()) {
        try {
          const workbook = method.fn();
          if (workbook && typeof workbook.addWorksheet === 'function') {
            return { workbook, method: method.name };
          }
        } catch (error) {
          console.log(`方法 ${method.name} 失败:`, error);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('获取ExcelJS工作簿失败:', error);
    return null;
  }
}