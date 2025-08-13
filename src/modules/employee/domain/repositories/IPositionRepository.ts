/**
 * 职位仓储接口
 * 
 * 定义职位聚合的持久化操作
 */

import { Position } from '../entities/Position';
import { PositionId } from '../value-objects';

/**
 * 职位搜索条件
 */
export interface PositionSearchCriteria {
    keyword?: string;
    name?: string;
    code?: string;
    level?: number;
    levelMin?: number;
    levelMax?: number;
    category?: string;
    departmentId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
    sortBy?: 'code' | 'name' | 'level' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

/**
 * 职位仓储接口
 */
export interface IPositionRepository {
    /**
     * 根据ID查找职位
     */
    findById(id: string): Promise<Position | null>;
    
    /**
     * 根据职位编码查找
     */
    findByCode(code: string): Promise<Position | null>;
    
    /**
     * 根据职位名称查找
     */
    findByName(name: string): Promise<Position[]>;
    
    /**
     * 根据职级查找职位
     */
    findByLevel(level: number): Promise<Position[]>;
    
    /**
     * 根据职位类别查找
     */
    findByCategory(category: string): Promise<Position[]>;
    
    /**
     * 根据部门查找可用职位
     */
    findByDepartment(departmentId: string): Promise<Position[]>;
    
    /**
     * 搜索职位
     */
    search(criteria: PositionSearchCriteria): Promise<Position[]>;
    
    /**
     * 获取职位总数
     */
    count(criteria?: PositionSearchCriteria): Promise<number>;
    
    /**
     * 保存职位
     */
    save(position: Position): Promise<Position>;
    
    /**
     * 批量保存职位
     */
    saveMany(positions: Position[]): Promise<Position[]>;
    
    /**
     * 删除职位（需要检查是否有员工）
     */
    delete(id: string): Promise<void>;
    
    /**
     * 检查职位编码是否存在
     */
    existsByCode(code: string, excludeId?: string): Promise<boolean>;
    
    /**
     * 获取职位的员工数量
     */
    getEmployeeCount(positionId: string): Promise<number>;
    
    /**
     * 获取活跃职位列表
     */
    findActivePositions(): Promise<Position[]>;
    
    /**
     * 获取职位层级结构
     */
    getHierarchy(): Promise<PositionHierarchy[]>;
    
    /**
     * 获取下一个可用的职位编码
     */
    getNextPositionCode(prefix?: string): Promise<string>;
    
    /**
     * 获取职位类别列表
     */
    getCategories(): Promise<string[]>;
    
    /**
     * 获取职级范围
     */
    getLevelRange(): Promise<{ min: number; max: number }>;
    
    /**
     * 检查职位是否可以删除
     */
    canDelete(positionId: string): Promise<{ canDelete: boolean; reason?: string }>;
    
    /**
     * 获取相似职位（用于推荐）
     */
    findSimilarPositions(positionId: string, limit?: number): Promise<Position[]>;
}

/**
 * 职位层级结构
 */
export interface PositionHierarchy {
    level: number;
    positions: Array<{
        id: string;
        code: string;
        name: string;
        category: string;
        employeeCount: number;
        isActive: boolean;
    }>;
}