/**
 * 通用CRUD服务基类
 * 
 * 提供标准的CRUD操作，减少重复代码
 * 遵循务实DDD原则，简单操作直接处理
 */

import { supabase } from '../supabase/client';
import { authService } from '../auth/auth.service';
import { simpleMapper, batchMapper, MapperConfig } from '../../core/utils/mapper';
import { NotFoundError, ValidationError } from '../../core/errors';

/**
 * 分页参数
 */
export interface PaginationParams {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/**
 * CRUD服务配置
 */
export interface CrudServiceConfig {
    tableName: string;
    viewName?: string;
    primaryKey?: string;
    mapperConfig?: MapperConfig;
    defaultSort?: string;
    defaultPageSize?: number;
    requiredRole?: string;
}

/**
 * 通用CRUD服务基类
 */
export class BaseCrudService<T extends Record<string, any>> {
    protected tableName: string;
    protected viewName?: string;
    protected primaryKey: string;
    protected mapperConfig?: MapperConfig;
    protected defaultSort: string;
    protected defaultPageSize: number;
    protected requiredRole?: string;
    
    constructor(config: CrudServiceConfig) {
        this.tableName = config.tableName;
        this.viewName = config.viewName;
        this.primaryKey = config.primaryKey || 'id';
        this.mapperConfig = config.mapperConfig;
        this.defaultSort = config.defaultSort || 'created_at';
        this.defaultPageSize = config.defaultPageSize || 20;
        this.requiredRole = config.requiredRole;
    }
    
    /**
     * 获取列表（分页）
     */
    async list(
        filters?: Record<string, any>,
        pagination?: PaginationParams
    ): Promise<PaginatedResult<T>> {
        // 权限检查
        if (this.requiredRole) {
            await authService.checkPermission(this.requiredRole as any);
        }
        
        // 使用视图或表
        const source = this.viewName || this.tableName;
        let query = supabase.from(source).select('*', { count: 'exact' });
        
        // 应用过滤条件
        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        query = query.in(key, value);
                    } else if (typeof value === 'string' && value.includes('%')) {
                        query = query.ilike(key, value);
                    } else {
                        query = query.eq(key, value);
                    }
                }
            }
        }
        
        // 排序
        const sortBy = pagination?.sortBy || this.defaultSort;
        const sortOrder = pagination?.sortOrder || 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        
        // 分页
        const page = pagination?.page || 1;
        const pageSize = pagination?.pageSize || this.defaultPageSize;
        const offset = (page - 1) * pageSize;
        query = query.range(offset, offset + pageSize - 1);
        
        // 执行查询
        const { data, count, error } = await query;
        
        if (error) throw error;
        
        // 映射结果
        const mappedData = this.mapperConfig 
            ? batchMapper<T>(data || [], this.mapperConfig)
            : (data as T[]);
        
        return {
            data: mappedData,
            total: count || 0,
            page,
            pageSize,
            totalPages: Math.ceil((count || 0) / pageSize)
        };
    }
    
    /**
     * 根据ID获取单条记录
     */
    async getById(id: string): Promise<T> {
        // 权限检查
        if (this.requiredRole) {
            await authService.checkPermission(this.requiredRole as any);
        }
        
        const source = this.viewName || this.tableName;
        const { data, error } = await supabase
            .from(source)
            .select('*')
            .eq(this.primaryKey, id)
            .single();
        
        if (error || !data) {
            throw new NotFoundError(`Record not found: ${id}`);
        }
        
        // 映射结果
        return this.mapperConfig 
            ? simpleMapper<T>(data, this.mapperConfig)
            : data as T;
    }
    
    /**
     * 创建记录
     */
    async create(data: Partial<T>): Promise<T> {
        // 权限检查
        if (this.requiredRole) {
            await authService.checkPermission(this.requiredRole as any);
        }
        
        const user = await authService.getCurrentUserInfo();
        
        // 添加审计字段
        const recordData = {
            ...data,
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data: result, error } = await supabase
            .from(this.tableName)
            .insert(recordData)
            .select()
            .single();
        
        if (error) {
            throw new ValidationError(`Failed to create record: ${error.message}`);
        }
        
        // 映射结果
        return this.mapperConfig 
            ? simpleMapper<T>(result, this.mapperConfig)
            : result as T;
    }
    
    /**
     * 更新记录
     */
    async update(id: string, data: Partial<T>): Promise<T> {
        // 权限检查
        if (this.requiredRole) {
            await authService.checkPermission(this.requiredRole as any);
        }
        
        const user = await authService.getCurrentUserInfo();
        
        // 添加审计字段
        const updateData = {
            ...data,
            updated_by: user.id,
            updated_at: new Date().toISOString()
        };
        
        // 移除不应更新的字段
        delete updateData[this.primaryKey];
        delete updateData.created_at;
        delete updateData.created_by;
        
        const { data: result, error } = await supabase
            .from(this.tableName)
            .update(updateData)
            .eq(this.primaryKey, id)
            .select()
            .single();
        
        if (error) {
            throw new ValidationError(`Failed to update record: ${error.message}`);
        }
        
        if (!result) {
            throw new NotFoundError(`Record not found: ${id}`);
        }
        
        // 映射结果
        return this.mapperConfig 
            ? simpleMapper<T>(result, this.mapperConfig)
            : result as T;
    }
    
    /**
     * 删除记录（软删除）
     */
    async delete(id: string): Promise<void> {
        // 权限检查
        if (this.requiredRole) {
            await authService.checkPermission(this.requiredRole as any);
        }
        
        const user = await authService.getCurrentUserInfo();
        
        // 软删除
        const { error } = await supabase
            .from(this.tableName)
            .update({
                deleted_at: new Date().toISOString(),
                deleted_by: user.id
            })
            .eq(this.primaryKey, id);
        
        if (error) {
            throw new ValidationError(`Failed to delete record: ${error.message}`);
        }
    }
    
    /**
     * 批量创建
     */
    async bulkCreate(records: Partial<T>[]): Promise<T[]> {
        // 权限检查
        if (this.requiredRole) {
            await authService.checkPermission(this.requiredRole as any);
        }
        
        const user = await authService.getCurrentUserInfo();
        
        // 添加审计字段
        const recordsData = records.map(record => ({
            ...record,
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));
        
        // 分批插入
        const batchSize = 100;
        const results: T[] = [];
        
        for (let i = 0; i < recordsData.length; i += batchSize) {
            const batch = recordsData.slice(i, i + batchSize);
            
            const { data, error } = await supabase
                .from(this.tableName)
                .insert(batch)
                .select();
            
            if (error) {
                throw new ValidationError(
                    `Failed to bulk create at batch ${i / batchSize}: ${error.message}`
                );
            }
            
            if (data) {
                const mapped = this.mapperConfig 
                    ? batchMapper<T>(data, this.mapperConfig)
                    : data as T[];
                results.push(...mapped);
            }
        }
        
        return results;
    }
    
    /**
     * 批量更新
     */
    async bulkUpdate(
        ids: string[],
        data: Partial<T>
    ): Promise<number> {
        // 权限检查
        if (this.requiredRole) {
            await authService.checkPermission(this.requiredRole as any);
        }
        
        const user = await authService.getCurrentUserInfo();
        
        // 添加审计字段
        const updateData = {
            ...data,
            updated_by: user.id,
            updated_at: new Date().toISOString()
        };
        
        const { data: results, error } = await supabase
            .from(this.tableName)
            .update(updateData)
            .in(this.primaryKey, ids)
            .select();
        
        if (error) {
            throw new ValidationError(`Failed to bulk update: ${error.message}`);
        }
        
        return results?.length || 0;
    }
    
    /**
     * 批量删除（软删除）
     */
    async bulkDelete(ids: string[]): Promise<number> {
        // 权限检查
        if (this.requiredRole) {
            await authService.checkPermission(this.requiredRole as any);
        }
        
        const user = await authService.getCurrentUserInfo();
        
        const { data: results, error } = await supabase
            .from(this.tableName)
            .update({
                deleted_at: new Date().toISOString(),
                deleted_by: user.id
            })
            .in(this.primaryKey, ids)
            .select();
        
        if (error) {
            throw new ValidationError(`Failed to bulk delete: ${error.message}`);
        }
        
        return results?.length || 0;
    }
    
    /**
     * 检查记录是否存在
     */
    async exists(id: string): Promise<boolean> {
        const { count, error } = await supabase
            .from(this.tableName)
            .select('*', { count: 'exact', head: true })
            .eq(this.primaryKey, id);
        
        if (error) throw error;
        
        return (count || 0) > 0;
    }
    
    /**
     * 获取总数
     */
    async count(filters?: Record<string, any>): Promise<number> {
        let query = supabase
            .from(this.tableName)
            .select('*', { count: 'exact', head: true });
        
        // 应用过滤条件
        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined && value !== null) {
                    query = query.eq(key, value);
                }
            }
        }
        
        const { count, error } = await query;
        
        if (error) throw error;
        
        return count || 0;
    }
    
    /**
     * 搜索（全文搜索）
     */
    async search(
        searchTerm: string,
        searchFields: string[],
        pagination?: PaginationParams
    ): Promise<PaginatedResult<T>> {
        // 权限检查
        if (this.requiredRole) {
            await authService.checkPermission(this.requiredRole as any);
        }
        
        const source = this.viewName || this.tableName;
        let query = supabase.from(source).select('*', { count: 'exact' });
        
        // 构建搜索条件
        const searchConditions = searchFields
            .map(field => `${field}.ilike.%${searchTerm}%`)
            .join(',');
        
        query = query.or(searchConditions);
        
        // 排序
        const sortBy = pagination?.sortBy || this.defaultSort;
        const sortOrder = pagination?.sortOrder || 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        
        // 分页
        const page = pagination?.page || 1;
        const pageSize = pagination?.pageSize || this.defaultPageSize;
        const offset = (page - 1) * pageSize;
        query = query.range(offset, offset + pageSize - 1);
        
        const { data, count, error } = await query;
        
        if (error) throw error;
        
        // 映射结果
        const mappedData = this.mapperConfig 
            ? batchMapper<T>(data || [], this.mapperConfig)
            : (data as T[]);
        
        return {
            data: mappedData,
            total: count || 0,
            page,
            pageSize,
            totalPages: Math.ceil((count || 0) / pageSize)
        };
    }
}