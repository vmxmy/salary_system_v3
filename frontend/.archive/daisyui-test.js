// DaisyUI 主题变量测试脚本
// 在浏览器控制台中执行这个脚本来验证DaisyUI主题是否正确加载

console.log('🎨 DaisyUI 主题变量测试');
console.log('='.repeat(50));

// 获取计算样式
const rootStyle = getComputedStyle(document.documentElement);

// 测试主要的DaisyUI颜色变量
const daisyUIVars = [
  '--p',      // primary
  '--pc',     // primary-content
  '--s',      // secondary
  '--sc',     // secondary-content
  '--a',      // accent
  '--ac',     // accent-content
  '--n',      // neutral
  '--nc',     // neutral-content
  '--b1',     // base-100
  '--b2',     // base-200
  '--b3',     // base-300
  '--bc',     // base-content
  '--su',     // success
  '--suc',    // success-content
  '--wa',     // warning
  '--wac',    // warning-content
  '--er',     // error
  '--erc',    // error-content
  '--in',     // info
  '--inc'     // info-content
];

console.log('🔍 检查DaisyUI CSS变量:');
daisyUIVars.forEach(varName => {
  const value = rootStyle.getPropertyValue(varName).trim();
  const status = value ? '✅' : '❌';
  console.log(`${status} ${varName}: ${value || '未定义'}`);
});

console.log('\n🎨 当前主题测试:');
const currentTheme = document.documentElement.getAttribute('data-theme') || '默认';
console.log(`📌 当前主题: ${currentTheme}`);

// 测试主题切换
console.log('\n🔄 主题切换测试:');
const testThemes = ['light', 'dark', 'cupcake', 'corporate'];
testThemes.forEach(theme => {
  console.log(`🧪 测试主题: ${theme}`);
  document.documentElement.setAttribute('data-theme', theme);
  
  // 检查primary颜色是否变化
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--p').trim();
  console.log(`  Primary Color (--p): ${primaryColor}`);
});

// 恢复原始主题
document.documentElement.setAttribute('data-theme', currentTheme);
console.log(`\n🔙 恢复原始主题: ${currentTheme}`);