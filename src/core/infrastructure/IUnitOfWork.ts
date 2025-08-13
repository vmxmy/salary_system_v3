/**
 * 工作单元接口
 * 
 * 实现事务管理和跨仓储的协调
 * 确保业务操作的原子性
 */

/**
 * 事务接口
 */
export interface ITransaction {
    /**
     * 事务ID
     */
    readonly id: string;
    
    /**
     * 事务状态
     */
    readonly status: 'pending' | 'committed' | 'rolled_back';
    
    /**
     * 提交事务
     */
    commit(): Promise<void>;
    
    /**
     * 回滚事务
     */
    rollback(): Promise<void>;
    
    /**
     * 添加提交后的回调
     */
    afterCommit(callback: () => Promise<void>): void;
    
    /**
     * 添加回滚后的回调
     */
    afterRollback(callback: () => Promise<void>): void;
}

/**
 * 工作单元接口
 */
export interface IUnitOfWork {
    /**
     * 开始新事务
     */
    begin(): Promise<ITransaction>;
    
    /**
     * 获取当前事务
     */
    getCurrentTransaction(): ITransaction | null;
    
    /**
     * 执行工作单元
     * 自动管理事务的生命周期
     */
    execute<T>(work: (transaction: ITransaction) => Promise<T>): Promise<T>;
    
    /**
     * 注册实体变更
     */
    registerNew(entity: any): void;
    
    /**
     * 注册实体更新
     */
    registerDirty(entity: any): void;
    
    /**
     * 注册实体删除
     */
    registerDeleted(entity: any): void;
    
    /**
     * 获取已注册的新实体
     */
    getNewEntities(): any[];
    
    /**
     * 获取已注册的脏实体
     */
    getDirtyEntities(): any[];
    
    /**
     * 获取已注册的删除实体
     */
    getDeletedEntities(): any[];
    
    /**
     * 清理工作单元
     */
    clear(): void;
}

/**
 * 工作单元管理器
 */
export class UnitOfWorkManager {
    private static instance: UnitOfWorkManager;
    private unitOfWorks: Map<string, IUnitOfWork> = new Map();
    
    private constructor() {}
    
    static getInstance(): UnitOfWorkManager {
        if (!this.instance) {
            this.instance = new UnitOfWorkManager();
        }
        return this.instance;
    }
    
    /**
     * 创建新的工作单元
     */
    create(id?: string): IUnitOfWork {
        const unitOfWork = new UnitOfWork(id);
        this.unitOfWorks.set(unitOfWork.id, unitOfWork);
        return unitOfWork;
    }
    
    /**
     * 获取工作单元
     */
    get(id: string): IUnitOfWork | undefined {
        return this.unitOfWorks.get(id);
    }
    
    /**
     * 移除工作单元
     */
    remove(id: string): void {
        this.unitOfWorks.delete(id);
    }
}

/**
 * 工作单元实现
 */
class UnitOfWork implements IUnitOfWork {
    readonly id: string;
    private currentTransaction: ITransaction | null = null;
    private newEntities: Set<any> = new Set();
    private dirtyEntities: Set<any> = new Set();
    private deletedEntities: Set<any> = new Set();
    
    constructor(id?: string) {
        this.id = id || this.generateId();
    }
    
    async begin(): Promise<ITransaction> {
        if (this.currentTransaction && this.currentTransaction.status === 'pending') {
            throw new Error('Transaction already in progress');
        }
        
        this.currentTransaction = new Transaction(this.generateId());
        return this.currentTransaction;
    }
    
    getCurrentTransaction(): ITransaction | null {
        return this.currentTransaction;
    }
    
    async execute<T>(work: (transaction: ITransaction) => Promise<T>): Promise<T> {
        const transaction = await this.begin();
        
        try {
            const result = await work(transaction);
            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        } finally {
            this.clear();
        }
    }
    
    registerNew(entity: any): void {
        this.newEntities.add(entity);
    }
    
    registerDirty(entity: any): void {
        if (!this.newEntities.has(entity)) {
            this.dirtyEntities.add(entity);
        }
    }
    
    registerDeleted(entity: any): void {
        if (this.newEntities.has(entity)) {
            this.newEntities.delete(entity);
        } else {
            this.dirtyEntities.delete(entity);
            this.deletedEntities.add(entity);
        }
    }
    
    getNewEntities(): any[] {
        return Array.from(this.newEntities);
    }
    
    getDirtyEntities(): any[] {
        return Array.from(this.dirtyEntities);
    }
    
    getDeletedEntities(): any[] {
        return Array.from(this.deletedEntities);
    }
    
    clear(): void {
        this.newEntities.clear();
        this.dirtyEntities.clear();
        this.deletedEntities.clear();
        this.currentTransaction = null;
    }
    
    private generateId(): string {
        return `uow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * 事务实现
 */
class Transaction implements ITransaction {
    readonly id: string;
    private _status: 'pending' | 'committed' | 'rolled_back' = 'pending';
    private afterCommitCallbacks: Array<() => Promise<void>> = [];
    private afterRollbackCallbacks: Array<() => Promise<void>> = [];
    
    constructor(id: string) {
        this.id = id;
    }
    
    get status() {
        return this._status;
    }
    
    async commit(): Promise<void> {
        if (this._status !== 'pending') {
            throw new Error(`Cannot commit transaction in ${this._status} state`);
        }
        
        // 实际的提交逻辑（例如调用Supabase的事务API）
        // await supabase.rpc('commit_transaction', { id: this.id });
        
        this._status = 'committed';
        
        // 执行提交后的回调
        for (const callback of this.afterCommitCallbacks) {
            await callback();
        }
    }
    
    async rollback(): Promise<void> {
        if (this._status !== 'pending') {
            throw new Error(`Cannot rollback transaction in ${this._status} state`);
        }
        
        // 实际的回滚逻辑
        // await supabase.rpc('rollback_transaction', { id: this.id });
        
        this._status = 'rolled_back';
        
        // 执行回滚后的回调
        for (const callback of this.afterRollbackCallbacks) {
            await callback();
        }
    }
    
    afterCommit(callback: () => Promise<void>): void {
        this.afterCommitCallbacks.push(callback);
    }
    
    afterRollback(callback: () => Promise<void>): void {
        this.afterRollbackCallbacks.push(callback);
    }
}