// Simple test script to verify department service fixes
// This can be run in browser console after importing the necessary modules

// Test the department tree API call
async function testDepartmentTree() {
  console.log('Testing department tree...');
  
  try {
    // Simulate the corrected API call
    const response = await fetch('https://rjlymghylrshudywrzec.supabase.co/rest/v1/departments?select=*&order=name.asc', {
      headers: {
        'apikey': 'your-anon-key', // Replace with actual key
        'Authorization': 'Bearer your-anon-key', // Replace with actual key
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const departments = await response.json();
      console.log('✅ Departments query successful:', departments.length, 'departments found');
      
      // Test employee count query separately
      const employeeResponse = await fetch('https://rjlymghylrshudywrzec.supabase.co/rest/v1/view_employee_basic_info?select=department_id', {
        headers: {
          'apikey': 'your-anon-key', // Replace with actual key
          'Authorization': 'Bearer your-anon-key', // Replace with actual key
          'Content-Type': 'application/json'
        }
      });
      
      if (employeeResponse.ok) {
        const employees = await employeeResponse.json();
        console.log('✅ Employee count query successful:', employees.length, 'employees found');
        
        // Count by department
        const countMap = new Map();
        employees.forEach(emp => {
          if (emp.department_id) {
            countMap.set(emp.department_id, (countMap.get(emp.department_id) || 0) + 1);
          }
        });
        
        console.log('📊 Employee count by department:', Object.fromEntries(countMap));
        
      } else {
        console.error('❌ Employee count query failed:', employeeResponse.status);
      }
      
    } else {
      console.error('❌ Department query failed:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Instructions for running the test
console.log(`
To test the department service fix:

1. Open browser dev tools on your app
2. Update the API keys in this script with your actual Supabase keys
3. Run: testDepartmentTree()

This will test if the corrected queries work without the 400 error.
`);

// Export the test function
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testDepartmentTree };
}