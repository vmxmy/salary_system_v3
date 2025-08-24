// Debug script for OnboardingButton issue on insurance config page
console.log('=== OnboardingButton Debug Script ===');

// Simulate the path matching logic from onboardingPageUtils.ts
const PAGE_FLOW_MAPPING = {
  // 仪表板页面 - 系统入门指导
  '/dashboard': ['gettingStarted'],
  '/': ['gettingStarted'],
  
  // 员工管理相关页面
  '/employees': ['employeeWorkflow'],
  '/employees/list': ['employeeWorkflow'],
  '/employees/create': ['employeeWorkflow'],
  '/employees/import': ['employeeWorkflow'],
  
  // 薪资管理页面
  '/payroll/list': ['payrollWorkflow'],
  '/payroll/approval': ['payrollApproval'],
  '/payroll/insurance-config': ['insuranceConfig'],
  
  // 统计报表页面
  '/statistics': ['reporting'],
  '/reports': ['reporting'],
  
  // 组织管理页面
  '/organization': ['organizationManagement'],
  '/departments': ['organizationManagement'],
  '/positions': ['organizationManagement'],
  
  // 系统设置页面
  '/settings': ['systemConfiguration'],
  '/config': ['systemConfiguration']
};

// Test path matching
function findBestMatchingPath(pathname) {
  const paths = Object.keys(PAGE_FLOW_MAPPING);
  
  // 按路径长度降序排列，确保最具体的路径优先匹配
  const sortedPaths = paths.sort((a, b) => b.length - a.length);
  
  for (const path of sortedPaths) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return path;
    }
  }
  
  return null;
}

// Test the insurance config path
const testPath = '/payroll/insurance-config';
const matchedPath = findBestMatchingPath(testPath);
console.log('Test path:', testPath);
console.log('Matched path:', matchedPath);
console.log('Flow IDs for matched path:', matchedPath ? PAGE_FLOW_MAPPING[matchedPath] : 'No match');

// Test some permissions
const testPermissions = ['payroll.view', 'hr.manage'];
console.log('Required permissions for insuranceConfig:', testPermissions);

// Check if path matching works correctly
console.log('\n=== Path Matching Tests ===');
const testPaths = [
  '/payroll/insurance-config',
  '/payroll/list',
  '/employees/list',
  '/dashboard'
];

testPaths.forEach(path => {
  const match = findBestMatchingPath(path);
  console.log(`${path} -> ${match} -> [${match ? PAGE_FLOW_MAPPING[match].join(', ') : 'none'}]`);
});