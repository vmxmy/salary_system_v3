import { supabase } from '@/lib/supabase';

export interface FieldMetadata {
  name: string;
  type: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'select' | 'email' | 'phone';
  label: string;
  description?: string;
  required?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  format?: string;
  options?: { value: string; label: string }[];
  width?: number;
  alignment?: 'left' | 'center' | 'right';
  visible?: boolean;
  order?: number;
}

export interface TableMetadata {
  tableName: string;
  displayName: string;
  description?: string;
  fields: FieldMetadata[];
  primaryKey: string;
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  defaultFields?: string[];
}

class MetadataService {
  private cache = new Map<string, TableMetadata>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 从Supabase获取表结构元数据
   * 由于没有可用的RPC函数，直接使用基于真实数据库结构的硬编码数据
   */
  async getTableStructure(tableName: string): Promise<any[]> {
    // 直接使用基于真实Supabase数据的结构
    console.log('Using hardcoded table structure based on real Supabase schema for:', tableName);
    return this.getHardcodedTableStructure(tableName);
  }

  /**
   * 硬编码的表结构（基于真实Supabase数据）
   */
  private getHardcodedTableStructure(tableName: string): any[] {
    // 标准化表名 - 将 'employees' 映射到视图
    const normalizedTableName = tableName === 'employees' ? 'view_employee_basic_info' : tableName;
    
    const structures = {
      'view_employee_basic_info': [
        { column_name: 'employee_id', data_type: 'uuid', is_nullable: 'YES', ordinal_position: 1 },
        { column_name: 'full_name', data_type: 'text', is_nullable: 'YES', ordinal_position: 2 },
        { column_name: 'id_number', data_type: 'text', is_nullable: 'YES', ordinal_position: 3 },
        { column_name: 'hire_date', data_type: 'date', is_nullable: 'YES', ordinal_position: 4 },
        { column_name: 'termination_date', data_type: 'date', is_nullable: 'YES', ordinal_position: 5 },
        { column_name: 'gender', data_type: 'text', is_nullable: 'YES', ordinal_position: 6 },
        { column_name: 'date_of_birth', data_type: 'date', is_nullable: 'YES', ordinal_position: 7 },
        { column_name: 'employment_status', data_type: 'text', is_nullable: 'YES', ordinal_position: 8 },
        { column_name: 'manager_id', data_type: 'uuid', is_nullable: 'YES', ordinal_position: 9 },
        { column_name: 'department_id', data_type: 'uuid', is_nullable: 'YES', ordinal_position: 10 },
        { column_name: 'department_name', data_type: 'text', is_nullable: 'YES', ordinal_position: 11 },
        { column_name: 'position_id', data_type: 'uuid', is_nullable: 'YES', ordinal_position: 12 },
        { column_name: 'position_name', data_type: 'text', is_nullable: 'YES', ordinal_position: 13 },
        { column_name: 'rank_id', data_type: 'uuid', is_nullable: 'YES', ordinal_position: 14 },
        { column_name: 'rank_name', data_type: 'text', is_nullable: 'YES', ordinal_position: 15 },
        { column_name: 'job_start_date', data_type: 'date', is_nullable: 'YES', ordinal_position: 16 },
        { column_name: 'category_id', data_type: 'uuid', is_nullable: 'YES', ordinal_position: 17 },
        { column_name: 'category_name', data_type: 'text', is_nullable: 'YES', ordinal_position: 18 },
        { column_name: 'category_start_date', data_type: 'date', is_nullable: 'YES', ordinal_position: 19 },
        { column_name: 'has_occupational_pension', data_type: 'text', is_nullable: 'YES', ordinal_position: 20 },
        { column_name: 'mobile_phone', data_type: 'text', is_nullable: 'YES', ordinal_position: 21 },
        { column_name: 'email', data_type: 'text', is_nullable: 'YES', ordinal_position: 22 },
        { column_name: 'work_email', data_type: 'text', is_nullable: 'YES', ordinal_position: 23 },
        { column_name: 'personal_email', data_type: 'text', is_nullable: 'YES', ordinal_position: 24 },
        { column_name: 'primary_bank_account', data_type: 'text', is_nullable: 'YES', ordinal_position: 25 },
        { column_name: 'bank_name', data_type: 'text', is_nullable: 'YES', ordinal_position: 26 },
        { column_name: 'branch_name', data_type: 'text', is_nullable: 'YES', ordinal_position: 27 },
        { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES', ordinal_position: 28 },
        { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'YES', ordinal_position: 29 }
      ]
    };

    return structures[normalizedTableName as keyof typeof structures] || [];
  }

  /**
   * 获取员工视图的字段元数据
   */
  async getEmployeeViewMetadata(): Promise<TableMetadata> {
    const cacheKey = 'employee_view_metadata';
    
    // 检查缓存
    if (this.cache.has(cacheKey) && Date.now() < (this.cacheExpiry.get(cacheKey) || 0)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // 从view_employee_basic_info视图获取字段信息（基于真实Supabase数据）
      const columns = await this.getTableStructure('view_employee_basic_info');
      
      const fields: FieldMetadata[] = columns.map((col: any) => {
        const fieldType = this.mapPostgresTypeToFieldType(col.data_type, col.column_name);
        return {
          name: col.column_name,
          type: fieldType,
          label: this.generateFieldLabel(col.column_name),
          description: this.generateFieldDescription(col.column_name),
          required: col.is_nullable === 'NO',
          searchable: this.isSearchableField(col.column_name),
          sortable: this.isSortableField(col.column_name),
          filterable: this.isFilterableField(col.column_name),
          width: this.getDefaultWidth(col.column_name),
          alignment: this.getDefaultAlignment(col.data_type),
          visible: this.isDefaultVisible(col.column_name),
          order: this.getDefaultOrder(col.column_name),
          options: this.getFieldOptions(col.column_name, fieldType),
        };
      });

      const metadata: TableMetadata = {
        tableName: 'view_employee_basic_info',
        displayName: '员工列表',
        description: '员工基本信息和当前状态',
        fields: fields.sort((a, b) => (a.order || 999) - (b.order || 999)),
        primaryKey: 'employee_id',
        defaultSort: { field: 'full_name', direction: 'asc' },
        defaultFields: [
          'full_name',      // 姓名
          'gender',         // 性别
          'category_name',  // 人员身份（人员类别）
          'department_name',// 部门
          'hire_date',      // 入职时间
          'mobile_phone'    // 手机号码
        ],
      };

      // 缓存结果
      this.cache.set(cacheKey, metadata);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return metadata;
    } catch (error) {
      console.error('Failed to get employee metadata, using fallback:', error);
      return this.getFallbackEmployeeMetadata();
    }
  }

  /**
   * 将PostgreSQL数据类型映射到字段类型
   */
  private mapPostgresTypeToFieldType(pgType: string, fieldName?: string): FieldMetadata['type'] {
    // 特殊字段类型处理
    if (fieldName === 'has_occupational_pension') return 'boolean';
    if (fieldName === 'employment_status' || fieldName === 'gender') return 'select';
    if (fieldName && fieldName.includes('email')) return 'email';
    if (fieldName && (fieldName.includes('phone') || fieldName.includes('mobile'))) return 'phone';
    if (fieldName === 'employee_id' || fieldName === 'uuid') return 'text';

    const typeMap: Record<string, FieldMetadata['type']> = {
      'text': 'text',
      'varchar': 'text',
      'character varying': 'text',
      'uuid': 'text',
      'integer': 'number',
      'bigint': 'number',
      'numeric': 'number',
      'decimal': 'number',
      'date': 'date',
      'timestamp': 'datetime',
      'timestamp with time zone': 'datetime',
      'timestamptz': 'datetime',
      'boolean': 'boolean',
    };

    return typeMap[pgType.toLowerCase()] || 'text';
  }

  /**
   * 生成字段显示标签
   */
  private generateFieldLabel(fieldName: string): string {
    const labelMap: Record<string, string> = {
      'employee_id': '员工ID',
      'full_name': '姓名',
      'id_number': '身份证号',
      'hire_date': '入职日期',
      'termination_date': '离职日期',
      'employment_status': '在职状态',
      'department_id': '部门ID',
      'department_name': '部门',
      'position_id': '职位ID',
      'position_name': '职位',
      'rank_id': '职级ID',
      'rank_name': '职级',
      'category_id': '类别ID',
      'category_name': '人员类别',
      'job_start_date': '岗位开始日期',
      'category_start_date': '类别开始日期',
      'has_occupational_pension': '职业年金',
      'gender': '性别',
      'date_of_birth': '出生日期',
      'manager_id': '上级主管',
      'mobile_phone': '手机号',
      'email': '邮箱',
      'work_email': '工作邮箱',
      'personal_email': '个人邮箱',
      'primary_bank_account': '银行账号',
      'bank_name': '银行名称',
      'branch_name': '支行名称',
      'created_at': '创建时间',
      'updated_at': '更新时间',
    };

    return labelMap[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * 生成字段描述
   */
  private generateFieldDescription(fieldName: string): string {
    const descMap: Record<string, string> = {
      'employee_id': '员工唯一标识符',
      'full_name': '员工完整姓名',
      'employment_status': '员工当前在职状态（在职/离职/停职）',
      'department_name': '员工所属部门名称',
      'position_name': '员工当前职位名称',
      'hire_date': '员工入职日期',
    };

    return descMap[fieldName];
  }

  /**
   * 判断字段是否可搜索
   */
  private isSearchableField(fieldName: string): boolean {
    const searchableFields = [
      'full_name', 'employee_id', 'id_number', 'department_name', 
      'position_name', 'rank_name', 'category_name', 'mobile_phone',
      'email', 'work_email', 'personal_email', 'bank_name',
      'primary_bank_account'
    ];
    return searchableFields.includes(fieldName);
  }

  /**
   * 判断字段是否可排序
   */
  private isSortableField(fieldName: string): boolean {
    const nonSortableFields = ['has_occupational_pension'];
    return !nonSortableFields.includes(fieldName);
  }

  /**
   * 判断字段是否可筛选
   */
  private isFilterableField(fieldName: string): boolean {
    const filterableFields = [
      'employment_status', 'department_name', 'position_name', 
      'rank_name', 'category_name', 'gender', 'has_occupational_pension'
    ];
    return filterableFields.includes(fieldName);
  }

  /**
   * 获取字段默认宽度
   */
  private getDefaultWidth(fieldName: string): number {
    const widthMap: Record<string, number> = {
      'employee_id': 120,
      'full_name': 120,
      'id_number': 150,
      'employment_status': 100,
      'department_name': 120,
      'position_name': 120,
      'rank_name': 100,
      'category_name': 120,
      'hire_date': 120,
      'job_start_date': 120,
      'category_start_date': 120,
      'date_of_birth': 120,
      'gender': 80,
      'has_occupational_pension': 100,
    };

    return widthMap[fieldName] || 100;
  }

  /**
   * 获取字段默认对齐方式
   */
  private getDefaultAlignment(dataType: string): FieldMetadata['alignment'] {
    if (['integer', 'bigint', 'numeric', 'decimal'].includes(dataType.toLowerCase())) {
      return 'right';
    }
    if (['date', 'timestamp', 'timestamptz'].includes(dataType.toLowerCase())) {
      return 'center';
    }
    return 'left';
  }

  /**
   * 判断字段是否默认可见
   */
  private isDefaultVisible(fieldName: string): boolean {
    const defaultVisibleFields = [
      'full_name',      // 姓名
      'gender',         // 性别
      'category_name',  // 人员身份（人员类别）
      'department_name',// 部门
      'hire_date',      // 入职时间
      'mobile_phone'    // 手机号码
    ];
    return defaultVisibleFields.includes(fieldName);
  }

  /**
   * 获取字段选项（用于select类型字段）
   */
  private getFieldOptions(fieldName: string, fieldType: FieldMetadata['type']): { value: string; label: string }[] | undefined {
    if (fieldType !== 'select') return undefined;

    const optionsMap: Record<string, { value: string; label: string }[]> = {
      'employment_status': [
        { value: 'active', label: '在职' },
        { value: 'inactive', label: '停职' },
        { value: 'terminated', label: '离职' },
      ],
      'gender': [
        { value: 'male', label: '男' },
        { value: 'female', label: '女' },
        { value: 'other', label: '其他' },
      ],
    };

    return optionsMap[fieldName];
  }

  /**
   * 获取字段默认排序
   */
  private getDefaultOrder(fieldName: string): number {
    const orderMap: Record<string, number> = {
      'full_name': 1,           // 姓名
      'gender': 2,              // 性别
      'category_name': 3,       // 人员身份
      'department_name': 4,     // 部门
      'hire_date': 5,           // 入职时间
      'mobile_phone': 6,        // 手机号码
      'employee_id': 7,
      'position_name': 8,
      'employment_status': 9,
      'email': 10,
      'bank_name': 11,
      'primary_bank_account': 12,
      'rank_name': 13,
      'job_start_date': 14,
      'category_start_date': 15,
      'id_number': 16,
      'date_of_birth': 17,
      'has_occupational_pension': 18,
      'termination_date': 19,
      'manager_id': 20,
      'department_id': 21,
      'position_id': 22,
      'rank_id': 23,
      'category_id': 24,
      'work_email': 25,
      'personal_email': 26,
      'branch_name': 27,
      'created_at': 28,
      'updated_at': 29,
    };

    return orderMap[fieldName] || 999;
  }

  /**
   * 备选员工元数据（当API失败时使用）- 基于真实Supabase数据
   */
  private getFallbackEmployeeMetadata(): TableMetadata {
    return {
      tableName: 'view_employee_basic_info',
      displayName: '员工列表',
      description: '员工基本信息和当前状态',
      primaryKey: 'employee_id',
      defaultSort: { field: 'full_name', direction: 'asc' },
      defaultFields: [
        'full_name',      // 姓名
        'gender',         // 性别
        'category_name',  // 人员身份
        'department_name',// 部门
        'hire_date',      // 入职时间
        'mobile_phone'    // 手机号码
      ],
      fields: [
        {
          name: 'employee_id',
          type: 'text',
          label: '员工ID',
          description: '员工唯一标识符',
          required: false,
          searchable: true,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'left',
          visible: true,
          order: 1,
        },
        {
          name: 'full_name',
          type: 'text',
          label: '姓名',
          description: '员工完整姓名',
          required: false,
          searchable: true,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'left',
          visible: true,
          order: 2,
        },
        {
          name: 'id_number',
          type: 'text',
          label: '身份证号',
          description: '员工身份证号码',
          required: false,
          searchable: true,
          sortable: true,
          filterable: false,
          width: 150,
          alignment: 'left',
          visible: false,
          order: 11,
        },
        {
          name: 'hire_date',
          type: 'date',
          label: '入职日期',
          description: '员工入职日期',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'center',
          visible: true,
          order: 6,
        },
        {
          name: 'gender',
          type: 'select',
          label: '性别',
          required: false,
          searchable: false,
          sortable: true,
          filterable: true,
          width: 80,
          alignment: 'center',
          visible: false,
          order: 13,
          options: [
            { value: 'male', label: '男' },
            { value: 'female', label: '女' },
            { value: 'other', label: '其他' },
          ],
        },
        {
          name: 'date_of_birth',
          type: 'date',
          label: '出生日期',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'center',
          visible: false,
          order: 12,
        },
        {
          name: 'employment_status',
          type: 'select',
          label: '在职状态',
          description: '员工当前在职状态',
          required: false,
          searchable: false,
          sortable: true,
          filterable: true,
          width: 100,
          alignment: 'center',
          visible: true,
          order: 5,
          options: [
            { value: 'active', label: '在职' },
            { value: 'inactive', label: '停职' },
            { value: 'terminated', label: '离职' },
          ],
        },
        {
          name: 'department_name',
          type: 'text',
          label: '部门',
          required: false,
          searchable: true,
          sortable: true,
          filterable: true,
          width: 120,
          alignment: 'left',
          visible: true,
          order: 3,
        },
        {
          name: 'position_name',
          type: 'text',
          label: '职位',
          required: false,
          searchable: true,
          sortable: true,
          filterable: true,
          width: 120,
          alignment: 'left',
          visible: true,
          order: 4,
        },
        {
          name: 'rank_name',
          type: 'text',
          label: '职级',
          required: false,
          searchable: true,
          sortable: true,
          filterable: true,
          width: 100,
          alignment: 'left',
          visible: false,
          order: 7,
        },
        {
          name: 'job_start_date',
          type: 'date',
          label: '岗位开始日期',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'center',
          visible: false,
          order: 9,
        },
        {
          name: 'category_name',
          type: 'text',
          label: '人员类别',
          required: false,
          searchable: true,
          sortable: true,
          filterable: true,
          width: 120,
          alignment: 'left',
          visible: false,
          order: 8,
        },
        {
          name: 'category_start_date',
          type: 'date',
          label: '类别开始日期',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'center',
          visible: false,
          order: 10,
        },
        {
          name: 'has_occupational_pension',
          type: 'boolean',
          label: '职业年金',
          required: false,
          searchable: false,
          sortable: false,
          filterable: true,
          width: 100,
          alignment: 'center',
          visible: false,
          order: 14,
        },
      ],
    };
  }

  /**
   * 清除缓存
   */
  clearCache(tableName?: string): void {
    if (tableName) {
      this.cache.delete(`${tableName}_metadata`);
      this.cacheExpiry.delete(`${tableName}_metadata`);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }
}

export const metadataService = new MetadataService();