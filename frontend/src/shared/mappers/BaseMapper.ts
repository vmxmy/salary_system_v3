/**
 * 基础映射器接口
 * 
 * 定义领域实体与DTO之间转换的通用接口
 */

/**
 * 双向映射器接口
 */
export interface IBidirectionalMapper<TDomain, TDto> {
  /** 从领域实体转换为DTO */
  toDto(domain: TDomain): TDto;
  /** 从DTO转换为领域实体 */
  toDomain(dto: TDto): TDomain;
  /** 批量转换为DTO */
  toDtoList(domains: TDomain[]): TDto[];
  /** 批量转换为领域实体 */
  toDomainList(dtos: TDto[]): TDomain[];
}

/**
 * 单向映射器接口（仅支持领域实体到DTO）
 */
export interface IMapper<TDomain, TDto> {
  /** 从领域实体转换为DTO */
  toDto(domain: TDomain): TDto;
  /** 批量转换为DTO */
  toDtoList(domains: TDomain[]): TDto[];
}

/**
 * 基础映射器抽象类
 */
export abstract class BaseMapper<TDomain, TDto> implements IBidirectionalMapper<TDomain, TDto> {
  
  /**
   * 从领域实体转换为DTO
   */
  abstract toDto(domain: TDomain): TDto;

  /**
   * 从DTO转换为领域实体
   */
  abstract toDomain(dto: TDto): TDomain;

  /**
   * 批量转换为DTO
   */
  toDtoList(domains: TDomain[]): TDto[] {
    if (!domains || domains.length === 0) {
      return [];
    }
    return domains.map(domain => this.toDto(domain));
  }

  /**
   * 批量转换为领域实体
   */
  toDomainList(dtos: TDto[]): TDomain[] {
    if (!dtos || dtos.length === 0) {
      return [];
    }
    return dtos.map(dto => this.toDomain(dto));
  }

  /**
   * 安全转换（处理null/undefined）
   */
  protected safeToDto(domain: TDomain | null | undefined): TDto | null {
    return domain ? this.toDto(domain) : null;
  }

  /**
   * 安全转换（处理null/undefined）
   */
  protected safeToDomain(dto: TDto | null | undefined): TDomain | null {
    return dto ? this.toDomain(dto) : null;
  }

  /**
   * 转换日期为ISO字符串
   */
  protected dateToString(date: Date | null | undefined): string | undefined {
    return date ? date.toISOString() : undefined;
  }

  /**
   * 转换ISO字符串为日期
   */
  protected stringToDate(dateString: string | null | undefined): Date | undefined {
    return dateString ? new Date(dateString) : undefined;
  }

  /**
   * 映射审计信息
   */
  protected mapAuditInfo(domain: any): any {
    return {
      createdBy: domain.createdBy,
      createdByName: domain.createdByName,
      createdAt: this.dateToString(domain.createdAt),
      lastModifiedBy: domain.lastModifiedBy,
      lastModifiedByName: domain.lastModifiedByName,
      lastModifiedAt: this.dateToString(domain.lastModifiedAt),
      version: domain.version
    };
  }

  /**
   * 映射基础DTO属性
   */
  protected mapBaseDtoProperties(domain: any): any {
    return {
      id: domain.id,
      createdAt: this.dateToString(domain.createdAt),
      updatedAt: this.dateToString(domain.updatedAt)
    };
  }
}

/**
 * 映射器工厂接口
 */
export interface IMapperFactory {
  /** 获取指定类型的映射器 */
  getMapper<TDomain, TDto>(mapperType: string): IBidirectionalMapper<TDomain, TDto>;
}

/**
 * 映射器注册表
 */
export class MapperRegistry implements IMapperFactory {
  private static _instance: MapperRegistry;
  private _mappers = new Map<string, IBidirectionalMapper<any, any>>();

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): MapperRegistry {
    if (!MapperRegistry._instance) {
      MapperRegistry._instance = new MapperRegistry();
    }
    return MapperRegistry._instance;
  }

  /**
   * 注册映射器
   */
  register<TDomain, TDto>(
    mapperType: string, 
    mapper: IBidirectionalMapper<TDomain, TDto>
  ): void {
    this._mappers.set(mapperType, mapper);
  }

  /**
   * 获取映射器
   */
  getMapper<TDomain, TDto>(mapperType: string): IBidirectionalMapper<TDomain, TDto> {
    const mapper = this._mappers.get(mapperType);
    if (!mapper) {
      throw new Error(`映射器 ${mapperType} 未注册`);
    }
    return mapper;
  }

  /**
   * 检查映射器是否已注册
   */
  hasMapper(mapperType: string): boolean {
    return this._mappers.has(mapperType);
  }

  /**
   * 获取所有已注册的映射器类型
   */
  getRegisteredMappers(): string[] {
    return Array.from(this._mappers.keys());
  }
}

/**
 * 映射器装饰器
 */
export function Mapper(mapperType: string) {
  return function <T extends new (...args: any[]) => IBidirectionalMapper<any, any>>(constructor: T) {
    // 在模块加载时自动注册映射器
    const mapperInstance = new constructor();
    MapperRegistry.getInstance().register(mapperType, mapperInstance);
    
    return constructor;
  };
}

/**
 * 映射辅助工具类
 */
export class MapperUtils {
  /**
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (obj instanceof Array) {
      return obj.map(item => MapperUtils.deepClone(item)) as unknown as T;
    }
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = MapperUtils.deepClone(obj[key]);
      }
    }
    
    return cloned;
  }

  /**
   * 安全获取嵌套属性
   */
  static safeGet<T>(obj: any, path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue as T;
      }
      result = result[key];
    }
    
    return result !== undefined ? result : defaultValue as T;
  }

  /**
   * 合并对象属性
   */
  static merge<T>(target: T, ...sources: Partial<T>[]): T {
    if (!target) {
      return target;
    }
    
    for (const source of sources) {
      if (source) {
        Object.assign(target, source);
      }
    }
    
    return target;
  }

  /**
   * 过滤undefined属性
   */
  static filterUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
    const filtered: Partial<T> = {};
    
    for (const key in obj) {
      if (obj[key] !== undefined) {
        filtered[key] = obj[key];
      }
    }
    
    return filtered;
  }

  /**
   * 映射枚举值
   */
  static mapEnum<TSource, TTarget>(
    value: TSource,
    enumMapping: Record<string, TTarget>,
    defaultValue?: TTarget
  ): TTarget {
    const mappedValue = enumMapping[value as string];
    if (mappedValue !== undefined) {
      return mappedValue;
    }
    
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    throw new Error(`无法映射枚举值: ${value}`);
  }

  /**
   * 数组去重
   */
  static unique<T>(array: T[], keySelector?: (item: T) => any): T[] {
    if (!keySelector) {
      return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
      const key = keySelector(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

/**
 * 映射器验证辅助类
 */
export class MapperValidator {
  /**
   * 验证必填字段
   */
  static validateRequired<T>(
    obj: T, 
    requiredFields: (keyof T)[], 
    objectName: string = 'object'
  ): void {
    for (const field of requiredFields) {
      if (obj[field] === null || obj[field] === undefined) {
        throw new Error(`${objectName} 缺少必填字段: ${String(field)}`);
      }
    }
  }

  /**
   * 验证数组不为空
   */
  static validateNonEmptyArray<T>(
    array: T[] | null | undefined, 
    fieldName: string
  ): void {
    if (!array || array.length === 0) {
      throw new Error(`${fieldName} 不能为空数组`);
    }
  }

  /**
   * 验证数值范围
   */
  static validateNumberRange(
    value: number, 
    min: number, 
    max: number, 
    fieldName: string
  ): void {
    if (value < min || value > max) {
      throw new Error(`${fieldName} 必须在 ${min} 和 ${max} 之间`);
    }
  }

  /**
   * 验证字符串长度
   */
  static validateStringLength(
    value: string, 
    minLength: number, 
    maxLength: number, 
    fieldName: string
  ): void {
    if (value.length < minLength || value.length > maxLength) {
      throw new Error(`${fieldName} 长度必须在 ${minLength} 和 ${maxLength} 之间`);
    }
  }
}