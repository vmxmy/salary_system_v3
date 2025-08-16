import { supabase } from '@/lib/supabase';

export async function testSupabaseConnection() {
  console.log('[TestSupabase] Testing connection...');
  
  try {
    // Test 1: Check if we can get session
    console.log('[TestSupabase] Test 1: Getting session...');
    const sessionStart = Date.now();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('[TestSupabase] Session test completed in', Date.now() - sessionStart, 'ms');
    console.log('[TestSupabase] Session result:', { hasSession: !!sessionData?.session, error: sessionError });
    
    // Test 2: Check if we can query a table
    console.log('[TestSupabase] Test 2: Querying database...');
    const queryStart = Date.now();
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .limit(1);
    console.log('[TestSupabase] Query test completed in', Date.now() - queryStart, 'ms');
    console.log('[TestSupabase] Query result:', { hasData: !!data, error });
    
    // Test 3: Check auth health
    console.log('[TestSupabase] Test 3: Checking auth health...');
    const healthStart = Date.now();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[TestSupabase] Auth health test completed in', Date.now() - healthStart, 'ms');
    console.log('[TestSupabase] Auth health result:', { hasUser: !!user, error: userError });
    
    console.log('[TestSupabase] All tests completed');
    return true;
  } catch (err) {
    console.error('[TestSupabase] Test failed:', err);
    return false;
  }
}

// Make it available globally for testing
(window as any).testSupabaseConnection = testSupabaseConnection;