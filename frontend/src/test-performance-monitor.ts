/**
 * Test script to verify the performance monitor fixes
 * This can be run in the browser console or as a development utility
 */

import { supabase } from '@/lib/supabase';
import { performanceMonitor } from '@/services/performance-monitor.service';

export async function testPerformanceMonitor() {
  console.log('🧪 Testing Performance Monitor fixes...');
  
  try {
    // Clear previous metrics
    performanceMonitor.clearMetrics();
    
    // Test 1: Single method chaining (.single())
    console.log('Test 1: Testing .single() method chaining...');
    try {
      await supabase
        .from('view_dashboard_stats')
        .select('*')
        .single();
      console.log('✅ Test 1 passed: .single() method chaining works');
    } catch (error) {
      console.error('❌ Test 1 failed:', error);
    }
    
    // Test 2: Multiple method chaining (.eq().limit())
    console.log('Test 2: Testing .eq().limit() method chaining...');
    try {
      await supabase
        .from('employees')
        .select('id, name, email')
        .eq('status', 'active')
        .limit(5);
      console.log('✅ Test 2 passed: .eq().limit() method chaining works');
    } catch (error) {
      console.error('❌ Test 2 failed:', error);
    }
    
    // Test 3: Complex chaining with order
    console.log('Test 3: Testing complex chaining...');
    try {
      await supabase
        .from('view_recent_activities')
        .select('*')
        .order('activity_date', { ascending: false })
        .limit(10);
      console.log('✅ Test 3 passed: Complex method chaining works');
    } catch (error) {
      console.error('❌ Test 3 failed:', error);
    }
    
    // Test 4: Check performance metrics
    console.log('Test 4: Checking performance metrics...');
    const summary = performanceMonitor.getPerformanceSummary();
    console.log('Performance Summary:', summary);
    
    if (summary.total_queries >= 2) { // At least 2 successful queries
      console.log('✅ Test 4 passed: Performance monitoring is working');
    } else {
      console.warn('⚠️ Test 4 warning: Expected at least 2 queries in metrics');
    }
    
    // Test 5: Check table name extraction
    console.log('Test 5: Checking table name extraction...');
    const recentMetrics = performanceMonitor.getPerformanceSummary().operations;
    const tablesWithNames = recentMetrics.filter(op => 
      op.operation.includes('_') && !op.operation.includes('undefined')
    );
    
    if (tablesWithNames.length > 0) {
      console.log('✅ Test 5 passed: Table names are being extracted properly');
      console.log('Operations with table names:', tablesWithNames);
    } else {
      console.warn('⚠️ Test 5 warning: Table name extraction might need improvement');
    }
    
    console.log('🎉 Performance Monitor testing completed!');
    return { success: true, summary };
    
  } catch (error) {
    console.error('💥 Performance Monitor testing failed:', error);
    return { success: false, error };
  }
}

// Auto-run in development mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Make test function available globally for manual testing
  (window as any).testPerformanceMonitor = testPerformanceMonitor;
  
  console.log('🔧 Performance Monitor test available: run testPerformanceMonitor() in console');
}