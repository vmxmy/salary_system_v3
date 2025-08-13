/**
 * 实时事件发布器
 * 
 * 专门用于Supabase Realtime集成的事件发布器
 * 支持实时通知、房间管理、用户订阅等功能
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AllDomainEvents, EventMetadata } from './DomainEvents';
import { EventPublisher, PublishContext } from './EventPublisher';
import { Logger } from '../infrastructure/Logger';

// 实时通道配置
export interface RealtimeChannelConfig {
    channelName: string;
    isPrivate: boolean;
    requireAuth: boolean;
    allowedRoles?: string[];
    eventTypes?: string[]; // 允许的事件类型
    userFilter?: (userId: string, event: AllDomainEvents) => boolean;
}

// 实时订阅者信息
export interface RealtimeSubscriber {
    id: string;
    userId?: string;
    sessionId?: string;
    roles: string[];
    channelName: string;
    eventTypes: string[];
    subscribedAt: Date;
    lastActivity: Date;
    metadata?: Record<string, any>;
}

// 实时广播选项
export interface RealtimeBroadcastOptions {
    channelName?: string;
    targetUsers?: string[];
    targetRoles?: string[];
    excludeUsers?: string[];
    includeMetadata?: boolean;
    enablePersistence?: boolean;
}

// 实时通知结果
export interface RealtimeNotificationResult {
    channelName: string;
    subscriberCount: number;
    deliveredCount: number;
    failedCount: number;
    broadcastId: string;
    sentAt: Date;
}

/**
 * 实时事件发布器实现
 */
export class RealtimeEventPublisher extends EventPublisher {
    private channels = new Map<string, RealtimeChannel>();
    private subscribers = new Map<string, RealtimeSubscriber>();
    private channelConfigs = new Map<string, RealtimeChannelConfig>();
    private broadcastHistory: Array<{
        id: string;
        event: AllDomainEvents;
        result: RealtimeNotificationResult;
        broadcastedAt: Date;
    }> = [];

    private readonly DEFAULT_CHANNELS: RealtimeChannelConfig[] = [
        {
            channelName: 'system-notifications',
            isPrivate: false,
            requireAuth: true,
            eventTypes: ['SystemConfigChanged', 'DataImport']
        },
        {
            channelName: 'payroll-events',
            isPrivate: true,
            requireAuth: true,
            allowedRoles: ['admin', 'hr_manager', 'manager'],
            eventTypes: [
                'PayrollPeriodCreated',
                'PayrollPeriodStatusChanged',
                'PayrollCalculationCompleted',
                'PayrollApproval',
                'PayrollDisbursement'
            ]
        },
        {
            channelName: 'employee-events',
            isPrivate: true,
            requireAuth: true,
            allowedRoles: ['admin', 'hr_manager'],
            eventTypes: [
                'EmployeeCreated',
                'EmployeeUpdated',
                'EmployeeTerminated',
                'EmployeeDepartmentChanged',
                'EmployeePositionChanged'
            ]
        },
        {
            channelName: 'user-personal',
            isPrivate: true,
            requireAuth: true,
            eventTypes: [
                'EmployeePayrollCalculated',
                'PersonalIncomeTaxCalculated',
                'SocialInsuranceCalculated'
            ],
            userFilter: (userId: string, event: AllDomainEvents) => {
                // 只向事件相关的员工发送个人事件
                return (event as any).employeeId === userId;
            }
        }
    ];

    constructor(
        eventBus: any,
        eventStore: any,
        private supabase: SupabaseClient
    ) {
        super(eventBus, eventStore, supabase);
        this.logger = Logger.getInstance();
        this.initializeDefaultChannels();
    }

    /**
     * 发布事件到实时通道
     */
    async publishToRealtime<T extends AllDomainEvents>(
        event: T,
        options?: RealtimeBroadcastOptions,
        context?: PublishContext,
        metadata?: Partial<EventMetadata>
    ): Promise<RealtimeNotificationResult[]> {
        try {
            // 首先通过常规发布器发布
            const publishResult = await this.publish(event, context, metadata);
            
            if (!publishResult.success) {
                throw new Error('常规事件发布失败');
            }

            // 确定要广播的通道
            const targetChannels = this.determineTargetChannels(event, options);
            const results: RealtimeNotificationResult[] = [];

            // 向每个通道广播
            for (const channelName of targetChannels) {
                const result = await this.broadcastToChannel(
                    channelName,
                    event,
                    options,
                    context,
                    metadata
                );
                results.push(result);
            }

            // 记录广播历史
            const broadcastId = this.generateBroadcastId();
            this.broadcastHistory.push({
                id: broadcastId,
                event,
                result: results[0] || {
                    channelName: 'none',
                    subscriberCount: 0,
                    deliveredCount: 0,
                    failedCount: 0,
                    broadcastId,
                    sentAt: new Date()
                },
                broadcastedAt: new Date()
            });

            // 保持历史记录在合理范围内
            if (this.broadcastHistory.length > 1000) {
                this.broadcastHistory = this.broadcastHistory.slice(-500);
            }

            this.logger.info('实时事件广播完成', {
                eventType: event.eventType,
                channelCount: results.length,
                totalSubscribers: results.reduce((sum, r) => sum + r.subscriberCount, 0),
                broadcastId
            });

            return results;

        } catch (error) {
            this.logger.error('实时事件发布失败', {
                eventType: event.eventType,
                error: error.message,
                options
            });
            throw error;
        }
    }

    /**
     * 向特定用户发送通知
     */
    async notifyUser<T extends AllDomainEvents>(
        userId: string,
        event: T,
        context?: PublishContext,
        metadata?: Partial<EventMetadata>
    ): Promise<boolean> {
        try {
            const userChannelName = `user-${userId}`;
            
            // 创建用户专用通道（如果不存在）
            if (!this.channels.has(userChannelName)) {
                await this.createUserChannel(userId);
            }

            const result = await this.broadcastToChannel(
                userChannelName,
                event,
                { targetUsers: [userId] },
                context,
                metadata
            );

            return result.deliveredCount > 0;

        } catch (error) {
            this.logger.error('用户通知失败', {
                userId,
                eventType: event.eventType,
                error: error.message
            });
            return false;
        }
    }

    /**
     * 向角色组发送通知
     */
    async notifyRole<T extends AllDomainEvents>(
        role: string,
        event: T,
        context?: PublishContext,
        metadata?: Partial<EventMetadata>
    ): Promise<RealtimeNotificationResult> {
        return this.publishToRealtime(event, {
            targetRoles: [role]
        }, context, metadata).then(results => results[0]);
    }

    /**
     * 创建自定义通道
     */
    async createChannel(config: RealtimeChannelConfig): Promise<boolean> {
        try {
            if (this.channels.has(config.channelName)) {
                this.logger.warn('通道已存在', { channelName: config.channelName });
                return false;
            }

            const channel = this.supabase.channel(config.channelName);

            // 设置通道事件处理器
            channel.on('broadcast', { event: '*' }, (payload) => {
                this.handleChannelMessage(config.channelName, payload);
            });

            // 订阅通道
            const status = await new Promise<string>((resolve) => {
                channel.subscribe((status) => {
                    resolve(status);
                });
            });

            if (status === 'SUBSCRIBED') {
                this.channels.set(config.channelName, channel);
                this.channelConfigs.set(config.channelName, config);
                
                this.logger.info('实时通道创建成功', {
                    channelName: config.channelName,
                    isPrivate: config.isPrivate,
                    requireAuth: config.requireAuth
                });
                
                return true;
            } else {
                throw new Error(`通道订阅失败: ${status}`);
            }

        } catch (error) {
            this.logger.error('创建实时通道失败', {
                channelName: config.channelName,
                error: error.message
            });
            return false;
        }
    }

    /**
     * 删除通道
     */
    async removeChannel(channelName: string): Promise<boolean> {
        try {
            const channel = this.channels.get(channelName);
            if (!channel) {
                return false;
            }

            await channel.unsubscribe();
            this.channels.delete(channelName);
            this.channelConfigs.delete(channelName);

            // 清理相关订阅者
            for (const [subscriberId, subscriber] of this.subscribers.entries()) {
                if (subscriber.channelName === channelName) {
                    this.subscribers.delete(subscriberId);
                }
            }

            this.logger.info('实时通道已删除', { channelName });
            return true;

        } catch (error) {
            this.logger.error('删除实时通道失败', {
                channelName,
                error: error.message
            });
            return false;
        }
    }

    /**
     * 获取通道统计信息
     */
    getChannelStats(): Array<{
        channelName: string;
        subscriberCount: number;
        config: RealtimeChannelConfig;
        isActive: boolean;
        lastActivity?: Date;
    }> {
        return Array.from(this.channelConfigs.entries()).map(([channelName, config]) => {
            const subscriberCount = Array.from(this.subscribers.values())
                .filter(sub => sub.channelName === channelName).length;
            
            const lastActivity = Math.max(
                ...Array.from(this.subscribers.values())
                    .filter(sub => sub.channelName === channelName)
                    .map(sub => sub.lastActivity.getTime())
            );

            return {
                channelName,
                subscriberCount,
                config,
                isActive: this.channels.has(channelName),
                lastActivity: lastActivity > 0 ? new Date(lastActivity) : undefined
            };
        });
    }

    /**
     * 获取广播历史
     */
    getBroadcastHistory(limit: number = 50): Array<{
        id: string;
        eventType: string;
        channelName: string;
        subscriberCount: number;
        broadcastedAt: Date;
    }> {
        return this.broadcastHistory
            .slice(-limit)
            .map(item => ({
                id: item.id,
                eventType: item.event.eventType,
                channelName: item.result.channelName,
                subscriberCount: item.result.subscriberCount,
                broadcastedAt: item.broadcastedAt
            }));
    }

    // 私有方法

    /**
     * 初始化默认通道
     */
    private async initializeDefaultChannels(): Promise<void> {
        this.logger.info('初始化默认实时通道', {
            channelCount: this.DEFAULT_CHANNELS.length
        });

        for (const config of this.DEFAULT_CHANNELS) {
            await this.createChannel(config);
        }
    }

    /**
     * 确定目标通道
     */
    private determineTargetChannels(
        event: AllDomainEvents,
        options?: RealtimeBroadcastOptions
    ): string[] {
        if (options?.channelName) {
            return [options.channelName];
        }

        const targetChannels = [];

        // 根据事件类型确定通道
        for (const [channelName, config] of this.channelConfigs.entries()) {
            if (!config.eventTypes || config.eventTypes.length === 0) {
                continue;
            }

            if (config.eventTypes.includes(event.eventType)) {
                targetChannels.push(channelName);
            }
        }

        return targetChannels;
    }

    /**
     * 向通道广播
     */
    private async broadcastToChannel(
        channelName: string,
        event: AllDomainEvents,
        options?: RealtimeBroadcastOptions,
        context?: PublishContext,
        metadata?: Partial<EventMetadata>
    ): Promise<RealtimeNotificationResult> {
        const channel = this.channels.get(channelName);
        if (!channel) {
            throw new Error(`通道不存在: ${channelName}`);
        }

        const config = this.channelConfigs.get(channelName);
        const broadcastId = this.generateBroadcastId();
        
        // 获取通道订阅者
        const channelSubscribers = Array.from(this.subscribers.values())
            .filter(sub => sub.channelName === channelName);

        // 应用过滤器
        const filteredSubscribers = this.applySubscriberFilters(
            channelSubscribers,
            event,
            config,
            options
        );

        try {
            const payload = {
                eventId: broadcastId,
                eventType: event.eventType,
                eventData: event,
                context,
                metadata: options?.includeMetadata ? metadata : undefined,
                timestamp: new Date().toISOString()
            };

            // 广播到通道
            await channel.send({
                type: 'broadcast',
                event: event.eventType,
                payload
            });

            // 更新订阅者活动时间
            for (const subscriber of filteredSubscribers) {
                subscriber.lastActivity = new Date();
            }

            const result: RealtimeNotificationResult = {
                channelName,
                subscriberCount: channelSubscribers.length,
                deliveredCount: filteredSubscribers.length,
                failedCount: 0, // Supabase不提供详细的失败信息
                broadcastId,
                sentAt: new Date()
            };

            this.logger.info('通道广播成功', {
                channelName,
                eventType: event.eventType,
                subscriberCount: result.subscriberCount,
                deliveredCount: result.deliveredCount,
                broadcastId
            });

            return result;

        } catch (error) {
            this.logger.error('通道广播失败', {
                channelName,
                eventType: event.eventType,
                error: error.message,
                broadcastId
            });

            return {
                channelName,
                subscriberCount: channelSubscribers.length,
                deliveredCount: 0,
                failedCount: channelSubscribers.length,
                broadcastId,
                sentAt: new Date()
            };
        }
    }

    /**
     * 应用订阅者过滤器
     */
    private applySubscriberFilters(
        subscribers: RealtimeSubscriber[],
        event: AllDomainEvents,
        config?: RealtimeChannelConfig,
        options?: RealtimeBroadcastOptions
    ): RealtimeSubscriber[] {
        let filtered = [...subscribers];

        // 用户过滤
        if (options?.targetUsers && options.targetUsers.length > 0) {
            filtered = filtered.filter(sub => 
                sub.userId && options.targetUsers!.includes(sub.userId)
            );
        }

        if (options?.excludeUsers && options.excludeUsers.length > 0) {
            filtered = filtered.filter(sub => 
                !sub.userId || !options.excludeUsers!.includes(sub.userId)
            );
        }

        // 角色过滤
        if (options?.targetRoles && options.targetRoles.length > 0) {
            filtered = filtered.filter(sub =>
                sub.roles.some(role => options.targetRoles!.includes(role))
            );
        }

        // 通道配置过滤
        if (config?.allowedRoles && config.allowedRoles.length > 0) {
            filtered = filtered.filter(sub =>
                sub.roles.some(role => config.allowedRoles!.includes(role))
            );
        }

        // 用户自定义过滤器
        if (config?.userFilter) {
            filtered = filtered.filter(sub =>
                sub.userId ? config.userFilter!(sub.userId, event) : false
            );
        }

        return filtered;
    }

    /**
     * 创建用户专用通道
     */
    private async createUserChannel(userId: string): Promise<void> {
        const channelName = `user-${userId}`;
        const config: RealtimeChannelConfig = {
            channelName,
            isPrivate: true,
            requireAuth: true,
            allowedRoles: ['admin'],
            userFilter: (filterUserId) => filterUserId === userId
        };

        await this.createChannel(config);
    }

    /**
     * 处理通道消息
     */
    private handleChannelMessage(channelName: string, payload: any): void {
        this.logger.debug('收到通道消息', {
            channelName,
            eventType: payload.event,
            payloadKeys: Object.keys(payload.payload || {})
        });

        // 这里可以添加通道消息的处理逻辑
        // 比如统计、监控、日志记录等
    }

    /**
     * 生成广播ID
     */
    private generateBroadcastId(): string {
        return `bc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}