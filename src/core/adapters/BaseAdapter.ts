/**
 * 适配器基类
 * 
 * 提供所有适配器的通用功能和接口规范
 */

import { SupabaseClient } from '@supabase/supabase-js';

export abstract class BaseAdapter {
    protected supabase: SupabaseClient;

    constructor(supabaseClient: SupabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * 检查数据库连接状态
     */
    async checkConnection(): Promise<boolean> {
        try {
            const { data, error } = await this.supabase
                .from('employees')
                .select('id')
                .limit(1);

            return !error;
        } catch {
            return false;
        }
    }

    /**
     * 执行健康检查
     */
    async healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        details?: any;
    }> {
        const isConnected = await this.checkConnection();
        
        return {
            status: isConnected ? 'healthy' : 'unhealthy',
            details: {
                database_connection: isConnected,
                timestamp: new Date().toISOString()
            }
        };
    }
}