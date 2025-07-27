#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// 专门检测UI层的国际化完成度
const config = {
  // 只检查UI相关文件
  uiPatterns: [
    'src/pages/**/*.{js,jsx,ts,tsx}',
    'src/components/**/*.{js,jsx,ts,tsx}',
    'src/layouts/**/*.{js,jsx,ts,tsx}'
  ],
  // 排除模式
  excludePatterns: [
    '**/*.test.*', 
    '**/*.spec.*', 
    '**/node_modules/**',
    // 排除演示页面
    '**/ThemeShowcasePage.*',
    '**/DesignTokensPage.*', 
    '**/DesignSystemShowcase.*'
  ],
  localesDir: 'src/locales',
  // 中文字符检测正则
  hardcodedTextRegex: /(["'])([\u4e00-\u9fff][^"']*)\1/g,
  // t() 函数调用检测
  tFunctionRegex: /t\s*\(\s*['"`]([^'"`]+)['"`]/g
};

class UIi18nChecker {
  constructor() {
    this.hardcodedTexts = [];
    this.missingKeys = [];
    this.usedKeys = new Set();
    this.availableKeys = new Set();
  }

  // 读取翻译文件
  async loadTranslations() {
    const translationFiles = await glob(`${config.localesDir}/**/*.json`);
    
    for (const file of translationFiles) {
      try {
        const content = JSON.parse(fs.readFileSync(file, 'utf8'));
        this.collectKeys(content, '');
      } catch (error) {
        console.warn(`⚠️  无法解析翻译文件: ${file}`);
      }
    }
  }

  // 递归收集翻译键
  collectKeys(obj, prefix) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        this.collectKeys(value, fullKey);
      } else if (typeof value === 'string') {
        this.availableKeys.add(fullKey);
      }
    }
  }

  // 判断是否应该忽略某些文本
  shouldIgnore(text, content, index) {
    // 忽略console.log中的文本
    const beforeText = content.substring(Math.max(0, index - 100), index);
    if (/console\.(log|warn|error|info|debug)/.test(beforeText)) {
      return true;
    }
    
    // 忽略注释中的文本
    if (/\/\/.*$|\/\*[\s\S]*?\*\//m.test(beforeText)) {
      return true;
    }
    
    // 忽略很短的文本（单个字符）
    if (text.length < 2) {
      return true;
    }
    
    // 忽略某些特殊内容
    const ignoreList = [
      '宋体', // 字体名称
      '张三', '李四', '王五', '赵六', // 示例名称
      '技术部', '财务部', '人事部', '市场部', // 示例部门
    ];
    
    if (ignoreList.includes(text)) {
      return true;
    }
    
    return false;
  }

  // 检查单个文件
  async checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    // 检测硬编码中文文本
    const hardcodedMatches = [...content.matchAll(config.hardcodedTextRegex)];
    
    for (const match of hardcodedMatches) {
      const text = match[2];
      const line = content.substring(0, match.index).split('\n').length;
      
      if (this.shouldIgnore(text, content, match.index)) {
        continue;
      }
      
      this.hardcodedTexts.push({
        file: relativePath,
        line,
        text,
        suggestion: this.suggestTranslationKey(text)
      });
    }

    // 检测使用的翻译键
    const tMatches = [...content.matchAll(config.tFunctionRegex)];
    
    for (const match of tMatches) {
      const key = match[1];
      this.usedKeys.add(key);
      
      // 检查键是否存在
      if (!this.availableKeys.has(key)) {
        const line = content.substring(0, match.index).split('\n').length;
        this.missingKeys.push({
          file: relativePath,
          line,
          key
        });
      }
    }
  }

  // 建议翻译键名
  suggestTranslationKey(text) {
    // 根据文本内容建议合适的键名
    const keyMappings = {
      '员工总数': 'employee:statistics.totalEmployees',
      '部门分布': 'employee:statistics.departmentDistribution',
      '年龄结构': 'employee:statistics.ageStructure',
      '正编': 'employee:statistics.regularStaff',
      '聘用': 'employee:statistics.contractStaff',
      '男性': 'employee:statistics.male',
      '女性': 'employee:statistics.female',
      '保存': 'common:common.save',
      '取消': 'common:common.cancel',
      '删除': 'common:common.delete',
      '编辑': 'common:common.edit',
      '查看': 'common:common.view',
      '搜索': 'common:common.search',
      '导出': 'common:common.export',
      '加载中': 'common:common.loading',
      '确定': 'common:common.confirm',
      '关闭': 'common:common.close'
    };
    
    return keyMappings[text] || `suggested.${this.generateKeyFromText(text)}`;
  }

  // 从文本生成键名
  generateKeyFromText(text) {
    // 简单的键名生成逻辑
    const pinyin = {
      '保存': 'save',
      '删除': 'delete', 
      '编辑': 'edit',
      '查看': 'view',
      '搜索': 'search',
      '员工': 'employee',
      '部门': 'department',
      '姓名': 'name',
      '状态': 'status'
    };
    
    for (const [chinese, english] of Object.entries(pinyin)) {
      if (text.includes(chinese)) {
        return english;
      }
    }
    
    return text.slice(0, 10); // 后备方案
  }

  // 运行检查
  async run() {
    console.log('🔍 检查UI层国际化完成度...\n');
    
    // 加载翻译文件
    await this.loadTranslations();
    console.log(`✅ 已加载 ${this.availableKeys.size} 个翻译键`);
    
    // 检查UI文件
    const files = [];
    for (const pattern of config.uiPatterns) {
      const matchedFiles = await glob(pattern, {
        ignore: config.excludePatterns,
        absolute: true
      });
      files.push(...matchedFiles);
    }
    
    console.log(`🔍 检查 ${files.length} 个UI文件...\n`);
    
    for (const file of files) {
      await this.checkFile(file);
    }
    
    this.generateReport();
  }

  // 生成报告
  generateReport() {
    console.log('📊 UI国际化检查报告');
    console.log('='.repeat(50));
    
    // 硬编码文本报告
    if (this.hardcodedTexts.length > 0) {
      console.log(`\n❌ 发现 ${this.hardcodedTexts.length} 个UI硬编码文本:`);
      
      // 按文件分组显示
      const fileGroups = {};
      this.hardcodedTexts.forEach(item => {
        if (!fileGroups[item.file]) {
          fileGroups[item.file] = [];
        }
        fileGroups[item.file].push(item);
      });
      
      Object.entries(fileGroups).forEach(([file, items]) => {
        console.log(`\n📁 ${file}:`);
        items.forEach((item, index) => {
          console.log(`   ${index + 1}. 第${item.line}行: "${item.text}"`);
          console.log(`      建议: ${item.suggestion}`);
        });
      });
    } else {
      console.log('\n✅ 未发现UI硬编码文本');
    }
    
    // 缺失键报告
    if (this.missingKeys.length > 0) {
      console.log(`\n❌ 发现 ${this.missingKeys.length} 个缺失的翻译键:`);
      
      this.missingKeys.slice(0, 20).forEach((item, index) => {
        console.log(`${index + 1}. ${item.file}:${item.line} - "${item.key}"`);
      });
      
      if (this.missingKeys.length > 20) {
        console.log(`   ... 还有 ${this.missingKeys.length - 20} 个缺失的键`);
      }
    } else {
      console.log('\n✅ 所有使用的翻译键都存在');
    }
    
    // 总结
    console.log('\n📈 总结:');
    console.log(`   UI硬编码文本: ${this.hardcodedTexts.length}`);
    console.log(`   缺失翻译键: ${this.missingKeys.length}`);
    console.log(`   使用的翻译键: ${this.usedKeys.size}`);
    
    // 完成度评分
    let score = 100;
    score -= this.hardcodedTexts.length * 15; // 每个硬编码文本扣15分
    score -= this.missingKeys.length * 10;    // 每个缺失键扣10分
    score = Math.max(0, score);
    
    console.log(`\n🏆 UI国际化完成度: ${score}/100`);
    
    if (score >= 95) {
      console.log('🎉 优秀！UI国际化非常完整');
    } else if (score >= 80) {
      console.log('👍 良好！UI大部分已国际化');
    } else if (score >= 60) {
      console.log('⚠️  一般！需要继续改进UI国际化');
    } else {
      console.log('🚨 需要大量工作！UI国际化严重不足');
    }

    // 提供修复建议
    if (this.hardcodedTexts.length > 0) {
      console.log('\n💡 修复建议:');
      console.log('1. 将硬编码文本替换为 t() 函数调用');
      console.log('2. 在相应的翻译文件中添加翻译键');
      console.log('3. 使用上面建议的键名结构');
      console.log('4. 运行 npm run i18n:check 再次检查');
    }
  }
}

// 运行检查
const checker = new UIi18nChecker();
checker.run().catch(console.error);