/**
 * 事件存储系统
 * 
 * 负责事件的持久化、查询和管理
 * 支持事件溯源和审计追踪
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { DomainEvent } from '../domain/DomainEvent';
import { AllDomainEvents, EventMetadata, EventPriority, EventCategory } from './DomainEvents';
import { Logger } from '../infrastructure/Logger';

// 事件存储记录接口
export interface EventStoreRecord {
    id: string;
    event_type: string;
    aggregate_id?: string;
    aggregate_type?: string;
    event_data: any;
    metadata: EventMetadata;
    occurred_at: string;
    created_at: string;
    version: number;
    correlation_id?: string;
    caused_by?: string;
    user_id?: string;
    session_id?: string;
}

// 事件查询条件
export interface EventQuery {
    eventTypes?: string[];
    aggregateIds?: string[];
    aggregateType?: string;
    fromDate?: Date;
    toDate?: Date;
    userId?: string;
    correlationId?: string;
    priority?: EventPriority;
    category?: EventCategory;
    limit?: number;
    offset?: number;
    orderBy?: 'occurred_at' | 'created_at';
    orderDirection?: 'asc' | 'desc';
}

// 事件统计结果
export interface EventStats {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByCategory: Record<string, number>;
    eventsByDate: Array<{
        date: string;
        count: number;
    }>;
    topUsers: Array<{
        userId: string;
        count: number;
    }>;
}

// 事件流接口
export interface EventStream {
    subscribe(eventTypes: string[], handler: (event: AllDomainEvents) => Promise<void>): string;
    unsubscribe(subscriptionId: string): void;
    pause(subscriptionId: string): void;
    resume(subscriptionId: string): void;
}

/**
 * 事件存储实现
 */
export class EventStore {
    private logger: Logger;
    private readonly tableName = 'domain_events';

    constructor(private supabase: SupabaseClient) {
        this.logger = Logger.getInstance();
    }

    /**
     * 保存单个事件
     * 
     * @param event 领域事件
     * @param metadata 事件元数据
     * @param aggregateId 聚合根ID
     * @param aggregateType 聚合根类型
     * @param userId 用户ID
     * @param sessionId 会话ID
     */
    async saveEvent(
        event: AllDomainEvents,
        metadata: EventMetadata,
        aggregateId?: string,
        aggregateType?: string,
        userId?: string,
        sessionId?: string
    ): Promise<string> {
        try {
            const record: Omit<EventStoreRecord, 'id' | 'created_at' | 'version'> = {
                event_type: event.eventType,
                aggregate_id: aggregateId,
                aggregate_type: aggregateType,
                event_data: event.payload || event,
                metadata,
                occurred_at: event.occurredAt.toISOString(),
                correlation_id: metadata.correlationId,
                caused_by: metadata.causedBy,
                user_id: userId,
                session_id: sessionId
            };

            const { data, error } = await this.supabase
                .from(this.tableName)
                .insert(record)
                .select('id')
                .single();

            if (error) {
                throw new Error(`保存事件失败: ${error.message}`);
            }

            this.logger.info('事件已保存到存储', {
                eventId: data.id,
                eventType: event.eventType,
                aggregateId,
                userId
            });

            return data.id;

        } catch (error) {
            this.logger.error('保存事件失败', {
                eventType: event.eventType,
                error: error.message,
                aggregateId,
                userId
            });
            throw error;
        }
    }

    /**
     * 批量保存事件
     * 
     * @param events 事件列表
     * @param userId 用户ID
     * @param sessionId 会话ID
     */
    async saveEvents(
        events: Array<{
            event: AllDomainEvents;
            metadata: EventMetadata;
            aggregateId?: string;
            aggregateType?: string;
        }>,
        userId?: string,
        sessionId?: string
    ): Promise<string[]> {
        try {
            const records = events.map(({ event, metadata, aggregateId, aggregateType }) => ({
                event_type: event.eventType,
                aggregate_id: aggregateId,
                aggregate_type: aggregateType,
                event_data: event.payload || event,
                metadata,
                occurred_at: event.occurredAt.toISOString(),
                correlation_id: metadata.correlationId,
                caused_by: metadata.causedBy,
                user_id: userId,
                session_id: sessionId
            }));

            const { data, error } = await this.supabase
                .from(this.tableName)
                .insert(records)
                .select('id');

            if (error) {
                throw new Error(`批量保存事件失败: ${error.message}`);
            }

            const eventIds = data.map(record => record.id);

            this.logger.info('事件批量保存完成', {
                eventCount: events.length,
                eventIds,
                userId
            });

            return eventIds;

        } catch (error) {
            this.logger.error('批量保存事件失败', {
                eventCount: events.length,
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * 查询事件
     * 
     * @param query 查询条件
     */
    async queryEvents(query: EventQuery): Promise<{
        events: EventStoreRecord[];
        totalCount: number;
    }> {
        try {
            let queryBuilder = this.supabase
                .from(this.tableName)
                .select('*', { count: 'exact' });

            // 应用查询条件
            if (query.eventTypes && query.eventTypes.length > 0) {
                queryBuilder = queryBuilder.in('event_type', query.eventTypes);
            }

            if (query.aggregateIds && query.aggregateIds.length > 0) {
                queryBuilder = queryBuilder.in('aggregate_id', query.aggregateIds);
            }

            if (query.aggregateType) {
                queryBuilder = queryBuilder.eq('aggregate_type', query.aggregateType);
            }

            if (query.fromDate) {
                queryBuilder = queryBuilder.gte('occurred_at', query.fromDate.toISOString());
            }

            if (query.toDate) {
                queryBuilder = queryBuilder.lte('occurred_at', query.toDate.toISOString());
            }

            if (query.userId) {
                queryBuilder = queryBuilder.eq('user_id', query.userId);
            }

            if (query.correlationId) {
                queryBuilder = queryBuilder.eq('correlation_id', query.correlationId);
            }

            if (query.priority) {
                queryBuilder = queryBuilder.eq('metadata->>priority', query.priority.toString());
            }

            if (query.category) {
                queryBuilder = queryBuilder.eq('metadata->>category', query.category);
            }

            // 排序
            const orderBy = query.orderBy || 'occurred_at';
            const orderDirection = query.orderDirection || 'desc';
            queryBuilder = queryBuilder.order(orderBy, { ascending: orderDirection === 'asc' });

            // 分页
            if (query.offset) {
                queryBuilder = queryBuilder.range(
                    query.offset,
                    query.offset + (query.limit || 50) - 1
                );
            } else if (query.limit) {
                queryBuilder = queryBuilder.limit(query.limit);
            }

            const { data, error, count } = await queryBuilder;

            if (error) {
                throw new Error(`查询事件失败: ${error.message}`);
            }

            this.logger.info('事件查询完成', {
                resultCount: data?.length || 0,
                totalCount: count,
                query
            });

            return {
                events: data || [],
                totalCount: count || 0
            };

        } catch (error) {
            this.logger.error('查询事件失败', {
                error: error.message,
                query
            });
            throw error;
        }
    }

    /**
     * 根据ID获取事件
     * 
     * @param eventId 事件ID
     */
    async getEventById(eventId: string): Promise<EventStoreRecord | null> {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*')
                .eq('id', eventId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 是未找到记录的错误
                throw new Error(`获取事件失败: ${error.message}`);
            }

            return data || null;

        } catch (error) {
            this.logger.error('获取事件失败', {
                eventId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取聚合根的事件流
     * 
     * @param aggregateId 聚合根ID
     * @param aggregateType 聚合根类型
     * @param fromVersion 起始版本（可选）
     */
    async getAggregateEvents(
        aggregateId: string,
        aggregateType?: string,
        fromVersion?: number
    ): Promise<EventStoreRecord[]> {
        try {
            let queryBuilder = this.supabase
                .from(this.tableName)
                .select('*')
                .eq('aggregate_id', aggregateId)
                .order('version', { ascending: true });

            if (aggregateType) {
                queryBuilder = queryBuilder.eq('aggregate_type', aggregateType);
            }

            if (fromVersion !== undefined) {
                queryBuilder = queryBuilder.gte('version', fromVersion);
            }

            const { data, error } = await queryBuilder;

            if (error) {
                throw new Error(`获取聚合事件流失败: ${error.message}`);
            }

            this.logger.info('获取聚合事件流成功', {
                aggregateId,
                aggregateType,
                eventCount: data?.length || 0,
                fromVersion
            });

            return data || [];

        } catch (error) {
            this.logger.error('获取聚合事件流失败', {
                aggregateId,
                aggregateType,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取事件统计信息
     * 
     * @param fromDate 开始日期
     * @param toDate 结束日期
     */
    async getEventStats(fromDate?: Date, toDate?: Date): Promise<EventStats> {
        try {
            let query = this.supabase
                .from(this.tableName)
                .select(`
                    event_type,
                    metadata,
                    user_id,
                    occurred_at
                `);

            if (fromDate) {
                query = query.gte('occurred_at', fromDate.toISOString());
            }

            if (toDate) {
                query = query.lte('occurred_at', toDate.toISOString());
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`获取事件统计失败: ${error.message}`);
            }

            const events = data || [];
            
            // 统计事件类型
            const eventsByType = events.reduce((acc, event) => {
                acc[event.event_type] = (acc[event.event_type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // 统计事件分类
            const eventsByCategory = events.reduce((acc, event) => {
                const category = event.metadata?.category || 'unknown';
                acc[category] = (acc[category] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // 按日期统计
            const eventsByDate = events.reduce((acc, event) => {
                const date = event.occurred_at.split('T')[0];
                const existing = acc.find(item => item.date === date);
                if (existing) {
                    existing.count++;
                } else {
                    acc.push({ date, count: 1 });
                }
                return acc;
            }, [] as Array<{ date: string; count: number }>);

            // 用户活跃度统计
            const userCounts = events.reduce((acc, event) => {
                if (event.user_id) {
                    acc[event.user_id] = (acc[event.user_id] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

            const topUsers = Object.entries(userCounts)
                .map(([userId, count]) => ({ userId, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            const stats: EventStats = {
                totalEvents: events.length,
                eventsByType,
                eventsByCategory,
                eventsByDate: eventsByDate.sort((a, b) => a.date.localeCompare(b.date)),
                topUsers
            };

            this.logger.info('事件统计完成', {
                totalEvents: stats.totalEvents,
                typeCount: Object.keys(eventsByType).length,
                dateRange: fromDate && toDate 
                    ? `${fromDate.toISOString().split('T')[0]} - ${toDate.toISOString().split('T')[0]}`
                    : '全部'
            });

            return stats;

        } catch (error) {
            this.logger.error('获取事件统计失败', {
                error: error.message,
                fromDate: fromDate?.toISOString(),
                toDate: toDate?.toISOString()
            });
            throw error;
        }
    }

    /**
     * 删除过期事件
     * 
     * @param olderThanDays 删除多少天前的事件
     */
    async cleanupExpiredEvents(olderThanDays: number): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

            const { data, error } = await this.supabase
                .from(this.tableName)
                .delete()
                .lt('occurred_at', cutoffDate.toISOString())
                .select('id');

            if (error) {
                throw new Error(`清理过期事件失败: ${error.message}`);
            }

            const deletedCount = data?.length || 0;

            this.logger.info('过期事件清理完成', {
                deletedCount,
                cutoffDate: cutoffDate.toISOString(),
                olderThanDays
            });

            return deletedCount;

        } catch (error) {
            this.logger.error('清理过期事件失败', {
                error: error.message,
                olderThanDays
            });
            throw error;
        }
    }

    /**
     * 检查事件存储健康状态
     */
    async healthCheck(): Promise<{
        healthy: boolean;
        totalEvents: number;
        lastEventTime?: string;
        storageSize?: number;
    }> {
        try {
            // 获取总事件数
            const { count: totalEvents, error: countError } = await this.supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true });

            if (countError) {
                throw new Error(`获取事件计数失败: ${countError.message}`);
            }

            // 获取最新事件时间
            const { data: latestEvent, error: latestError } = await this.supabase
                .from(this.tableName)
                .select('occurred_at')
                .order('occurred_at', { ascending: false })
                .limit(1)
                .single();

            if (latestError && latestError.code !== 'PGRST116') {
                throw new Error(`获取最新事件失败: ${latestError.message}`);
            }

            return {
                healthy: true,
                totalEvents: totalEvents || 0,
                lastEventTime: latestEvent?.occurred_at
            };

        } catch (error) {
            this.logger.error('事件存储健康检查失败', {
                error: error.message
            });

            return {
                healthy: false,
                totalEvents: 0
            };
        }
    }
}