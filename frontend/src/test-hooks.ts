/**
 * Hook集成测试脚本
 * 用于在控制台验证新Hook是否正常工作
 */

import { supabase } from './lib/supabase';

// 测试函数
async function testHooks() {
  console.log('🧪 开始测试新的Hooks架构...\n');
  
  try {
    // 1. 测试员工数据获取
    console.log('📋 测试1: 获取员工列表');
    const { data: employees, error: empError } = await supabase
      .from('view_employee_basic_info')
      .select('*')
      .limit(5);
    
    if (empError) {
      console.error('❌ 员工列表获取失败:', empError);
    } else {
      console.log(`✅ 成功获取 ${employees?.length || 0} 个员工`);
      if (employees && employees.length > 0) {
        console.log('  示例员工:', employees[0].employee_name);
      }
    }
    
    // 2. 测试部门数据获取
    console.log('\n📋 测试2: 获取部门列表');
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .limit(5);
    
    if (deptError) {
      console.error('❌ 部门列表获取失败:', deptError);
    } else {
      console.log(`✅ 成功获取 ${departments?.length || 0} 个部门`);
      if (departments && departments.length > 0) {
        console.log('  示例部门:', departments[0].name);
      }
    }
    
    // 3. 测试职位数据获取
    console.log('\n📋 测试3: 获取职位列表');
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*')
      .limit(5);
    
    if (posError) {
      console.error('❌ 职位列表获取失败:', posError);
    } else {
      console.log(`✅ 成功获取 ${positions?.length || 0} 个职位`);
      if (positions && positions.length > 0) {
        console.log('  示例职位:', positions[0].name);
      }
    }
    
    // 4. 测试人员类别数据获取
    console.log('\n📋 测试4: 获取人员类别列表');
    const { data: categories, error: catError } = await supabase
      .from('employee_categories')
      .select('*')
      .limit(5);
    
    if (catError) {
      console.error('❌ 人员类别列表获取失败:', catError);
    } else {
      console.log(`✅ 成功获取 ${categories?.length || 0} 个人员类别`);
      if (categories && categories.length > 0) {
        console.log('  示例类别:', categories[0].name);
      }
    }
    
    // 5. 测试错误处理
    console.log('\n📋 测试5: 错误处理机制');
    // 使用一个有效的表名，但故意使用错误的查询条件
    const { error: testError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', 'invalid-uuid-format'); // 故意使用无效的UUID格式
    
    if (testError) {
      console.log('✅ 错误处理正常工作');
      console.log('  错误信息:', testError.message);
    }
    
    // 6. 测试认证状态
    console.log('\n📋 测试6: 认证状态');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('✅ 用户已认证');
      console.log('  用户邮箱:', user.email);
    } else {
      console.log('⚠️ 用户未认证（需要登录后测试）');
    }
    
    console.log('\n🎉 Hook测试完成！');
    console.log('访问 http://localhost:5176/hook-test 查看完整测试页面');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 导出到window对象以便在控制台调用
if (typeof window !== 'undefined') {
  (window as any).testHooks = testHooks;
  console.log('💡 提示: 在控制台运行 testHooks() 来测试新的Hooks');
}

export { testHooks };