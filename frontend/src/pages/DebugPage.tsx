import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth.service';

export function DebugPage() {
  const [debug, setDebug] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        // 1. Check Supabase connection
        const { data: session, error: sessionError } = await supabase.auth.getSession();
        
        // 2. Check current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        // 3. Check tables exist
        const { data: tables, error: tablesError } = await supabase
          .from('user_roles')
          .select('*')
          .limit(1);
        
        // 4. Try auth service
        let authUser = null;
        let authError = null;
        try {
          authUser = await authService.getCurrentUser();
        } catch (e) {
          authError = e;
        }
        
        setDebug({
          session,
          sessionError,
          user,
          userError,
          tables,
          tablesError,
          authUser,
          authError: authError?.toString(),
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          supabaseKeyExists: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        });
      } catch (error) {
        setDebug({ error: error?.toString() });
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Page</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(debug, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default DebugPage;