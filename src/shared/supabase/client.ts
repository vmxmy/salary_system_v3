/**
 * Supabase客户端配置
 * 
 * 提供统一的Supabase客户端实例
 * 支持服务端和客户端环境
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';

// 环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

/**
 * 浏览器客户端（使用anon key）
 */
export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        },
        db: {
            schema: 'public'
        },
        global: {
            headers: {
                'x-application-name': 'salary-system-v3'
            }
        }
    }
);

/**
 * 服务端客户端（使用service role key）
 * 注意：仅在服务端使用，具有完全权限
 */
export const createServiceClient = (): SupabaseClient<Database> => {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseServiceKey) {
        throw new Error('Missing Supabase service role key');
    }
    
    return createClient<Database>(
        supabaseUrl,
        supabaseServiceKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            },
            db: {
                schema: 'public'
            }
        }
    );
};

/**
 * 创建带用户会话的客户端
 * 用于服务端渲染时传递用户会话
 */
export const createSessionClient = (
    accessToken: string
): SupabaseClient<Database> => {
    return createClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        }
    );
};

/**
 * Supabase错误处理工具
 */
export class SupabaseError extends Error {
    constructor(
        message: string,
        public code?: string,
        public details?: any
    ) {
        super(message);
        this.name = 'SupabaseError';
    }
}

/**
 * 处理Supabase响应
 */
export async function handleSupabaseResponse<T>(
    promise: Promise<{ data: T | null; error: any }>
): Promise<T> {
    const { data, error } = await promise;
    
    if (error) {
        throw new SupabaseError(
            error.message || 'Supabase operation failed',
            error.code,
            error.details
        );
    }
    
    if (!data) {
        throw new SupabaseError('No data returned from Supabase');
    }
    
    return data;
}

/**
 * 批量操作助手
 */
export async function batchInsert<T extends Record<string, any>>(
    table: string,
    records: T[],
    batchSize: number = 100
): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase
            .from(table)
            .insert(batch)
            .select();
        
        if (error) {
            throw new SupabaseError(
                `Batch insert failed at index ${i}`,
                error.code,
                { error, batch }
            );
        }
        
        if (data) {
            results.push(...data);
        }
    }
    
    return results;
}

/**
 * 事务助手（使用RPC）
 */
export async function executeTransaction<T>(
    functionName: string,
    params: Record<string, any>
): Promise<T> {
    return handleSupabaseResponse(
        supabase.rpc(functionName, params)
    );
}

/**
 * 实时订阅助手
 */
export function subscribeToTable(
    table: string,
    callback: (payload: any) => void,
    filter?: string
) {
    const channel = supabase
        .channel(`${table}_changes`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table,
                filter
            },
            callback
        )
        .subscribe();
    
    return channel;
}

/**
 * 获取当前用户
 */
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
        throw new SupabaseError('Failed to get current user', error.code);
    }
    
    return user;
}

/**
 * 获取用户会话
 */
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        throw new SupabaseError('Failed to get session', error.code);
    }
    
    return session;
}