#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// 配置
const config = {
  srcDir: 'src',
  localesDir: 'src/locales',
  filePatterns: ['**/*.{js,jsx,ts,tsx}'],
  excludePatterns: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
  // 中文字符检测正则
  chineseRegex: /[\u4e00-\u9fff]+/g,
  // 已知的硬编码文本模式 (排除console.log等)
  hardcodedTextRegex: /(["'])([\u4e00-\u9fff][^"']*)\1/g,
  // t() 函数调用检测
  tFunctionRegex: /t\s*\(\s*['"`]([^'"`]+)['"`]/g
};

class I18nChecker {
  constructor() {
    this.hardcodedTexts = [];
    this.missingKeys = [];
    this.unusedKeys = [];
    this.usedKeys = new Set();
    this.availableKeys = new Set();
  }

  // 读取所有翻译文件
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

  // 检查单个文件
  async checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    // 检测硬编码中文文本
    const hardcodedMatches = [...content.matchAll(config.hardcodedTextRegex)];
    
    for (const match of hardcodedMatches) {
      const text = match[2];
      const line = content.substring(0, match.index).split('\n').length;
      
      // 排除一些常见的非i18n文本
      if (this.shouldIgnore(text, content, match.index)) {
        continue;
      }
      
      this.hardcodedTexts.push({
        file: relativePath,
        line,
        text,
        context: this.getContext(content, match.index)
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
          key,
          context: this.getContext(content, match.index)
        });
      }
    }
  }

  // 判断是否应该忽略某些文本
  shouldIgnore(text, content, index) {
    // 忽略console.log中的文本
    const beforeText = content.substring(Math.max(0, index - 50), index);
    if (/console\.(log|warn|error|info)/.test(beforeText)) {
      return true;
    }
    
    // 忽略注释中的文本
    if (/\/\/.*$|\/\*[\s\S]*?\*\//m.test(beforeText)) {
      return true;
    }
    
    // 忽略很短的文本
    if (text.length < 2) {
      return true;
    }
    
    return false;
  }

  // 获取上下文
  getContext(content, index) {
    const lines = content.split('\n');
    const currentLine = content.substring(0, index).split('\n').length - 1;
    const start = Math.max(0, currentLine - 1);
    const end = Math.min(lines.length, currentLine + 2);
    
    return lines.slice(start, end).join('\n');
  }

  // 查找未使用的翻译键
  findUnusedKeys() {
    for (const key of this.availableKeys) {
      if (!this.usedKeys.has(key)) {
        this.unusedKeys.push(key);
      }
    }
  }

  // 运行完整检查
  async run() {
    console.log('🔍 开始检查i18n国际化完成度...\n');
    
    // 加载翻译文件
    await this.loadTranslations();
    console.log(`✅ 已加载 ${this.availableKeys.size} 个翻译键`);
    
    // 检查源代码文件
    const files = await glob(config.filePatterns, {
      cwd: config.srcDir,
      ignore: config.excludePatterns,
      absolute: true
    });
    
    console.log(`🔍 检查 ${files.length} 个源代码文件...\n`);
    
    for (const file of files) {
      await this.checkFile(file);
    }
    
    // 查找未使用的键
    this.findUnusedKeys();
    
    // 输出报告
    this.generateReport();
  }

  // 生成报告
  generateReport() {
    console.log('📊 国际化检查报告');
    console.log('='.repeat(50));
    
    // 硬编码文本报告
    if (this.hardcodedTexts.length > 0) {
      console.log(`\n❌ 发现 ${this.hardcodedTexts.length} 个硬编码文本:`);
      
      this.hardcodedTexts.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.file}:${item.line}`);
        console.log(`   文本: "${item.text}"`);
        console.log(`   建议: 使用 t('key_name') 替换`);
      });
    } else {
      console.log('\n✅ 未发现硬编码文本');
    }
    
    // 缺失键报告
    if (this.missingKeys.length > 0) {
      console.log(`\n❌ 发现 ${this.missingKeys.length} 个缺失的翻译键:`);
      
      this.missingKeys.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.file}:${item.line}`);
        console.log(`   缺失键: "${item.key}"`);
        console.log(`   建议: 在翻译文件中添加此键`);
      });
    } else {
      console.log('\n✅ 所有使用的翻译键都存在');
    }
    
    // 未使用键报告
    if (this.unusedKeys.length > 0) {
      console.log(`\n⚠️  发现 ${this.unusedKeys.length} 个未使用的翻译键:`);
      
      this.unusedKeys.slice(0, 10).forEach((key, index) => {
        console.log(`${index + 1}. ${key}`);
      });
      
      if (this.unusedKeys.length > 10) {
        console.log(`   ... 还有 ${this.unusedKeys.length - 10} 个未使用的键`);
      }
    } else {
      console.log('\n✅ 所有翻译键都在使用中');
    }
    
    // 总结
    console.log('\n📈 总结:');
    console.log(`   硬编码文本: ${this.hardcodedTexts.length}`);
    console.log(`   缺失翻译键: ${this.missingKeys.length}`);
    console.log(`   未使用键: ${this.unusedKeys.length}`);
    
    const coverage = this.usedKeys.size / this.availableKeys.size * 100;
    console.log(`   翻译键使用率: ${coverage.toFixed(1)}%`);
    
    // 国际化完成度评分
    let score = 100;
    score -= this.hardcodedTexts.length * 10; // 每个硬编码文本扣10分
    score -= this.missingKeys.length * 5;     // 每个缺失键扣5分
    score = Math.max(0, score);
    
    console.log(`\n🏆 国际化完成度: ${score}/100`);
    
    if (score >= 90) {
      console.log('🎉 优秀！国际化实现非常完整');
    } else if (score >= 70) {
      console.log('👍 良好！还有一些改进空间');
    } else {
      console.log('⚠️  需要改进！请修复发现的问题');
    }
  }
}

// 运行检查
const checker = new I18nChecker();
checker.run().catch(console.error);