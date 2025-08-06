import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

export type Tables = Database['public']['Tables'];
export type TableName = keyof Tables;

export interface QueryOptions {
  select?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean }[];
  filters?: Record<string, any>;
}

export class BaseService<T extends TableName> {
  protected tableName: T;
  
  constructor(tableName: T) {
    this.tableName = tableName;
  }

  /**
   * Get all records with optional query options
   */
  async getAll(options: QueryOptions = {}) {
    let query = supabase.from(this.tableName).select(options.select || '*');

    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply ordering
    if (options.orderBy) {
      options.orderBy.forEach(({ column, ascending = true }) => {
        query = query.order(column, { ascending });
      });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Get a single record by ID
   */
  async getById(id: string | number, select?: string) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(select || '*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Create a new record
   */
  async create(data: Tables[T]['Insert']) {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  /**
   * Update a record
   */
  async update(id: string | number, data: Tables[T]['Update']) {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  /**
   * Delete a record
   */
  async delete(id: string | number) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  /**
   * Get count of records
   */
  async count(filters?: Record<string, any>) {
    let query = supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  /**
   * Subscribe to real-time changes
   */
  subscribeToChanges(
    callback: (payload: any) => void,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
  ) {
    return supabase
      .channel(`${this.tableName}_changes`)
      .on(
        'postgres_changes',
        { 
          event,
          schema: 'public',
          table: this.tableName as string
        } as any,
        callback
      )
      .subscribe();
  }
}