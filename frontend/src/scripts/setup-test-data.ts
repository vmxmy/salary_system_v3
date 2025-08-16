/**
 * Setup test data for development
 * 
 * Run this script in the browser console to create test users and roles
 * 
 * Test accounts:
 * - admin@example.com / admin123 (super_admin)
 * - hr@example.com / hr123456 (hr_manager)
 * - finance@example.com / finance123 (finance_admin)
 * - manager@example.com / manager123 (manager)
 * - employee@example.com / employee123 (employee)
 */

import { supabase } from '@/lib/supabase';

// Define roles locally since permission.service has been removed
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  HR_MANAGER: 'hr_manager',
  FINANCE_ADMIN: 'finance_admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const;

export async function setupTestData() {
  console.log('Setting up test data...');

  const testUsers = [
    {
      email: 'admin@example.com',
      password: 'admin123',
      role: ROLES.SUPER_ADMIN,
      metadata: {
        full_name: 'System Admin',
      },
    },
    {
      email: 'hr@example.com',
      password: 'hr123456',
      role: ROLES.HR_MANAGER,
      metadata: {
        full_name: 'HR Manager',
      },
    },
    {
      email: 'finance@example.com',
      password: 'finance123',
      role: ROLES.FINANCE_ADMIN,
      metadata: {
        full_name: 'Finance Admin',
      },
    },
    {
      email: 'manager@example.com',
      password: 'manager123',
      role: ROLES.MANAGER,
      metadata: {
        full_name: 'Department Manager',
      },
    },
    {
      email: 'employee@example.com',
      password: 'employee123',
      role: ROLES.EMPLOYEE,
      metadata: {
        full_name: 'Regular Employee',
      },
    },
  ];

  for (const user of testUsers) {
    try {
      // Create user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: user.metadata,
        },
      });

      if (authError) {
        console.error(`Error creating user ${user.email}:`, authError);
        continue;
      }

      if (authData.user) {
        // Create user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: user.role,
          });

        if (roleError) {
          console.error(`Error assigning role to ${user.email}:`, roleError);
        } else {
          console.log(`✅ Created user: ${user.email} with role: ${user.role}`);
        }
      }
    } catch (error) {
      console.error(`Unexpected error for ${user.email}:`, error);
    }
  }

  console.log('Test data setup complete!');
  console.log('You can now login with any of the test accounts listed above.');
}

// Make it available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).setupTestData = setupTestData;
}