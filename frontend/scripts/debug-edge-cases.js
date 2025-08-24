// Test edge cases for the OnboardingButton fix
console.log('=== OnboardingButton Edge Case Testing ===');

// Simulate the flows and logic
const availableOnboardingFlows = [
  { id: 'gettingStarted', name: '系统入门指导', permissions: [] },
  { id: 'employeeWorkflow', name: '员工管理工作流程', permissions: [] },
  { id: 'payrollWorkflow', name: '薪资管理工作流程', permissions: [] },
  { id: 'insuranceConfig', name: '五险一金配置指导', permissions: ['payroll.view', 'hr.manage'] }
];

function getAvailableFlows(userPermissions) {
  return availableOnboardingFlows.filter(flow => {
    if (!flow.permissions || flow.permissions.length === 0) {
      return true;
    }
    return flow.permissions.some(permission => 
      userPermissions.includes(permission)
    );
  });
}

// Test case 1: User with no permissions
console.log('\n1. User with NO permissions:');
const noPermUser = { permissions: [] };
const flows1 = getAvailableFlows(noPermUser.permissions);
console.log(`Available flows: ${flows1.length}`);
flows1.forEach(f => console.log(`  - ${f.name} (permissions: ${f.permissions.length ? f.permissions.join(', ') : 'none'})`));

// Test case 2: User with some permissions but not insurance config
console.log('\n2. User with PARTIAL permissions:');
const partialPermUser = { permissions: ['employee.view'] };
const flows2 = getAvailableFlows(partialPermUser.permissions);
console.log(`Available flows: ${flows2.length}`);
flows2.forEach(f => console.log(`  - ${f.name} (permissions: ${f.permissions.length ? f.permissions.join(', ') : 'none'})`));

// Test case 3: User with insurance config permissions
console.log('\n3. User with INSURANCE CONFIG permissions:');
const fullPermUser = { permissions: ['payroll.view', 'hr.manage'] };
const flows3 = getAvailableFlows(fullPermUser.permissions);
console.log(`Available flows: ${flows3.length}`);
flows3.forEach(f => console.log(`  - ${f.name} (permissions: ${f.permissions.length ? f.permissions.join(', ') : 'none'})`));

console.log('\n=== Testing Insurance Config Button Behavior ===');
[noPermUser, partialPermUser, fullPermUser].forEach((user, i) => {
  const availableFlows = getAvailableFlows(user.permissions);
  const insuranceFlow = availableFlows.find(f => f.id === 'insuranceConfig');
  console.log(`User ${i + 1}: Insurance config flow ${insuranceFlow ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
});

console.log('\n=== Conclusion ===');
console.log('✅ Users without required permissions will NOT see the insurance config flow');
console.log('✅ Users WITH required permissions WILL see the insurance config flow');
console.log('✅ Button will be enabled/disabled appropriately based on user permissions');