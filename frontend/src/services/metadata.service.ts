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
   */
  async getTableStructure(tableName: string): Promise<any[]> {
    try {
      // 使用RPC函数获取表结构信息
      const { data, error } = await supabase.rpc('get_table_columns', { 
        table_name_param: tableName,
        schema_name_param: 'public'
      });
      
      if (error) {
        console.warn('RPC function failed, using fallback:', error);
        return this.getHardcodedTableStructure(tableName);
      }
      
      console.log(`Successfully retrieved ${data?.length || 0} columns for ${tableName} via RPC`);
      return data || [];
    } catch (error) {
      console.warn('Failed to get table structure via RPC, using fallback:', error);
      return this.getHardcodedTableStructure(tableName);
    }
  }


  /**
   * 硬编码的表结构（仅作为最后的备选方案）
   */
  private getHardcodedTableStructure(tableName: string): any[] {
    console.warn(`Using hardcoded fallback structure for ${tableName}`);
    
    // 标准化表名 - 将 'employees' 映射到视图
    const normalizedTableName = tableName === 'employees' ? 'view_employee_basic_info' : tableName;
    
    // 仅保留基本字段作为应急备选
    const basicStructure = {
      'view_employee_basic_info': [
        { column_name: 'employee_id', data_type: 'uuid', is_nullable: 'YES', ordinal_position: 1 },
        { column_name: 'full_name', data_type: 'text', is_nullable: 'YES', ordinal_position: 2 },
        { column_name: 'department_name', data_type: 'text', is_nullable: 'YES', ordinal_position: 3 },
        { column_name: 'position_name', data_type: 'text', is_nullable: 'YES', ordinal_position: 4 },
        { column_name: 'employment_status', data_type: 'text', is_nullable: 'YES', ordinal_position: 5 },
        { column_name: 'hire_date', data_type: 'date', is_nullable: 'YES', ordinal_position: 6 },
        { column_name: 'mobile_phone', data_type: 'text', is_nullable: 'YES', ordinal_position: 7 },
      ]
    };

    return basicStructure[normalizedTableName as keyof typeof basicStructure] || [];
  }

  /**
   * 获取薪资视图的字段元数据
   */
  async getPayrollViewMetadata(): Promise<TableMetadata> {
    const cacheKey = 'payroll_view_metadata';
    
    // 检查缓存
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cacheTime = isDevelopment ? 30 * 1000 : this.CACHE_DURATION;
    
    if (this.cache.has(cacheKey) && Date.now() < (this.cacheExpiry.get(cacheKey) || 0)) {
      console.log('Using cached payroll metadata');
      return this.cache.get(cacheKey)!;
    }

    try {
      console.log('Getting payroll view metadata...');
      const columns = await this.getTableStructure('view_payroll_summary');
      console.log('Retrieved payroll columns:', columns.length);
      
      const fields: FieldMetadata[] = columns.map((col: any) => {
        const fieldType = this.mapPostgresTypeToFieldType(col.data_type, col.column_name);
        return {
          name: col.column_name,
          type: fieldType,
          label: this.generatePayrollFieldLabel(col.column_name),
          description: this.generatePayrollFieldDescription(col.column_name),
          required: col.is_nullable === 'NO',
          searchable: this.isPayrollSearchableField(col.column_name),
          sortable: this.isPayrollSortableField(col.column_name),
          filterable: this.isPayrollFilterableField(col.column_name),
          width: this.getPayrollDefaultWidth(col.column_name),
          alignment: this.getDefaultAlignment(col.data_type),
          visible: this.isPayrollDefaultVisible(col.column_name),
          order: this.getPayrollDefaultOrder(col.column_name),
          options: this.getPayrollFieldOptions(col.column_name, fieldType),
        };
      });

      const metadata: TableMetadata = {
        tableName: 'view_payroll_summary',
        displayName: '薪资列表',
        description: '薪资记录和员工信息',
        fields: fields.sort((a, b) => (a.order || 999) - (b.order || 999)),
        primaryKey: 'payroll_id',
        defaultSort: { field: 'pay_date', direction: 'desc' },
        defaultFields: [
          'full_name',        // 员工姓名
          'department_name',  // 部门
          'pay_date',         // 发薪日期
          'status',           // 状态
          'gross_pay',        // 应发工资
          'total_deductions', // 扣除合计
          'net_pay'           // 实发工资
        ],
      };

      // 缓存结果
      this.cache.set(cacheKey, metadata);
      this.cacheExpiry.set(cacheKey, Date.now() + cacheTime);
      console.log('Payroll metadata cached successfully');

      return metadata;
    } catch (error) {
      console.error('Failed to get payroll metadata, using fallback:', error);
      return this.getFallbackPayrollMetadata();
    }
  }

  /**
   * 获取薪资元数据表的字段元数据
   */
  async getPayrollMetadataMetadata(): Promise<TableMetadata> {
    const cacheKey = 'payroll_metadata_metadata';
    
    // 检查缓存
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cacheTime = isDevelopment ? 30 * 1000 : this.CACHE_DURATION;
    
    if (this.cache.has(cacheKey) && Date.now() < (this.cacheExpiry.get(cacheKey) || 0)) {
      console.log('Using cached payroll metadata metadata');
      return this.cache.get(cacheKey)!;
    }

    // 由于这是一个前端模拟的表格，我们直接返回静态配置
    const metadata: TableMetadata = {
      tableName: 'payroll_metadata',
      displayName: '薪资元数据',
      description: '薪资计算的基础组件、公式和规则管理',
      primaryKey: 'id',
      defaultSort: { field: 'updated_at', direction: 'desc' },
      defaultFields: [
        'name',          // 名称
        'type',          // 类型
        'category',      // 分类
        'status',        // 状态
        'description',   // 描述
        'updated_at'     // 更新时间
      ],
      fields: [
        {
          name: 'id',
          type: 'text',
          label: 'ID',
          description: '元数据唯一标识符',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'left',
          visible: false,
          order: 1,
        },
        {
          name: 'name',
          type: 'text',
          label: '名称',
          description: '薪资组件或规则名称',
          required: false,
          searchable: true,
          sortable: true,
          filterable: false,
          width: 150,
          alignment: 'left',
          visible: true,
          order: 2,
        },
        {
          name: 'type',
          type: 'select',
          label: '类型',
          description: '元数据类型',
          required: false,
          searchable: false,
          sortable: true,
          filterable: true,
          width: 120,
          alignment: 'center',
          visible: true,
          order: 3,
          options: [
            { value: 'component', label: '薪资组件' },
            { value: 'calculation', label: '计算规则' },
            { value: 'deduction', label: '扣除项目' },
            { value: 'benefit', label: '福利项目' },
          ],
        },
        {
          name: 'description',
          type: 'text',
          label: '描述',
          description: '详细说明',
          required: false,
          searchable: true,
          sortable: false,
          filterable: false,
          width: 200,
          alignment: 'left',
          visible: true,
          order: 4,
        },
        {
          name: 'category',
          type: 'text',
          label: '分类',
          description: '所属分类',
          required: false,
          searchable: true,
          sortable: true,
          filterable: true,
          width: 120,
          alignment: 'left',
          visible: true,
          order: 5,
        },
        {
          name: 'status',
          type: 'select',
          label: '状态',
          description: '使用状态',
          required: false,
          searchable: false,
          sortable: true,
          filterable: true,
          width: 100,
          alignment: 'center',
          visible: true,
          order: 6,
          options: [
            { value: 'active', label: '活跃' },
            { value: 'inactive', label: '停用' },
          ],
        },
        {
          name: 'formula',
          type: 'text',
          label: '公式',
          description: '计算公式',
          required: false,
          searchable: true,
          sortable: false,
          filterable: false,
          width: 200,
          alignment: 'left',
          visible: false,
          order: 7,
        },
        {
          name: 'base_amount',
          type: 'number',
          label: '基础金额',
          description: '基础金额',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'right',
          visible: false,
          order: 8,
        },
        {
          name: 'percentage',
          type: 'number',
          label: '百分比',
          description: '计算百分比',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 100,
          alignment: 'right',
          visible: false,
          order: 9,
        },
        {
          name: 'taxable',
          type: 'boolean',
          label: '应税',
          description: '是否应税',
          required: false,
          searchable: false,
          sortable: true,
          filterable: true,
          width: 80,
          alignment: 'center',
          visible: false,
          order: 10,
        },
        {
          name: 'mandatory',
          type: 'boolean',
          label: '强制',
          description: '是否强制',
          required: false,
          searchable: false,
          sortable: true,
          filterable: true,
          width: 80,
          alignment: 'center',
          visible: false,
          order: 11,
        },
        {
          name: 'created_at',
          type: 'datetime',
          label: '创建时间',
          description: '创建时间',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 150,
          alignment: 'center',
          visible: false,
          order: 12,
        },
        {
          name: 'updated_at',
          type: 'datetime',
          label: '更新时间',
          description: '最后更新时间',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 150,
          alignment: 'center',
          visible: true,
          order: 13,
        },
      ],
    };

    // 缓存结果
    this.cache.set(cacheKey, metadata);
    this.cacheExpiry.set(cacheKey, Date.now() + cacheTime);
    console.log('Payroll metadata metadata cached successfully');

    return metadata;
  }

  /**
   * 获取员工视图的字段元数据
   */
  async getEmployeeViewMetadata(): Promise<TableMetadata> {
    const cacheKey = 'employee_view_metadata';
    
    // 检查缓存（开发环境下减少缓存时间以便测试）
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cacheTime = isDevelopment ? 30 * 1000 : this.CACHE_DURATION; // 开发环境30秒，生产环境5分钟
    
    if (this.cache.has(cacheKey) && Date.now() < (this.cacheExpiry.get(cacheKey) || 0)) {
      console.log('Using cached employee metadata');
      return this.cache.get(cacheKey)!;
    }

    try {
      // 从view_employee_basic_info视图获取字段信息
      console.log('Getting employee view metadata...');
      const columns = await this.getTableStructure('view_employee_basic_info');
      console.log('Retrieved columns:', columns.length);
      
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
      this.cacheExpiry.set(cacheKey, Date.now() + cacheTime);
      console.log('Metadata cached successfully');

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
    if (fieldName === 'employment_status' || fieldName === 'gender' || fieldName === 'latest_degree') return 'select';
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
      'mobile_phone': '手机号',
      'email': '邮箱',
      'work_email': '工作邮箱',
      'personal_email': '个人邮箱',
      'primary_bank_account': '银行账号',
      'bank_name': '银行名称',
      'branch_name': '支行名称',
      'latest_institution': '最新毕业院校',
      'latest_degree': '最高学历',
      'latest_field_of_study': '专业',
      'latest_graduation_date': '毕业时间',
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
      'primary_bank_account', 'latest_institution', 'latest_field_of_study'
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
      'rank_name', 'category_name', 'gender', 'has_occupational_pension',
      'latest_degree'
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
      'latest_institution': 150,
      'latest_degree': 100,
      'latest_field_of_study': 120,
      'latest_graduation_date': 120,
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
      'latest_degree': [
        { value: '大学专科', label: '大学专科' },
        { value: '学士学位', label: '学士学位' },
        { value: '硕士学位', label: '硕士学位' },
        { value: '博士学位', label: '博士学位' },
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
      'department_id': 21,
      'position_id': 22,
      'rank_id': 23,
      'category_id': 24,
      'work_email': 25,
      'personal_email': 26,
      'branch_name': 27,
      'latest_institution': 28,
      'latest_degree': 29,
      'latest_field_of_study': 30,
      'latest_graduation_date': 31,
      'created_at': 32,
      'updated_at': 33,
    };

    return orderMap[fieldName] || 999;
  }

  /**
   * 生成薪资字段显示标签
   */
  private generatePayrollFieldLabel(fieldName: string): string {
    const labelMap: Record<string, string> = {
      'payroll_id': '薪资ID',
      'pay_date': '发薪日期',
      'pay_period_start': '计薪开始',
      'pay_period_end': '计薪结束',
      'employee_id': '员工ID',
      'full_name': '员工姓名',
      'department_name': '部门',
      'position_name': '职位',
      'category_name': '人员类别',
      'gross_pay': '应发工资',
      'total_deductions': '扣除合计',
      'net_pay': '实发工资',
      'status': '薪资状态',
      'primary_bank_account': '银行账号',
      'bank_name': '银行名称',
      'branch_name': '支行名称',
      'created_at': '创建时间',
      'updated_at': '更新时间',
    };

    return labelMap[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * 生成薪资字段描述
   */
  private generatePayrollFieldDescription(fieldName: string): string {
    const descMap: Record<string, string> = {
      'payroll_id': '薪资记录唯一标识符',
      'full_name': '员工完整姓名',
      'department_name': '员工所属部门',
      'pay_date': '薪资发放日期',
      'status': '薪资记录当前状态',
      'gross_pay': '税前应发工资总额',
      'total_deductions': '各项扣除总额',
      'net_pay': '实际发放金额',
    };

    return descMap[fieldName];
  }

  /**
   * 判断薪资字段是否可搜索
   */
  private isPayrollSearchableField(fieldName: string): boolean {
    const searchableFields = [
      'full_name', 'department_name', 'position_name', 'category_name', 
      'status', 'primary_bank_account', 'bank_name'
    ];
    return searchableFields.includes(fieldName);
  }

  /**
   * 判断薪资字段是否可排序
   */
  private isPayrollSortableField(_fieldName: string): boolean {
    // 薪资字段基本都可排序
    return true;
  }

  /**
   * 判断薪资字段是否可筛选
   */
  private isPayrollFilterableField(fieldName: string): boolean {
    const filterableFields = [
      'status', 'department_name', 'position_name', 'category_name'
    ];
    return filterableFields.includes(fieldName);
  }

  /**
   * 获取薪资字段默认宽度
   */
  private getPayrollDefaultWidth(fieldName: string): number {
    const widthMap: Record<string, number> = {
      'payroll_id': 120,
      'full_name': 120,
      'department_name': 120,
      'position_name': 120,
      'category_name': 120,
      'pay_date': 120,
      'pay_period_start': 120,
      'pay_period_end': 120,
      'status': 100,
      'gross_pay': 120,
      'total_deductions': 120,
      'net_pay': 120,
      'primary_bank_account': 150,
      'bank_name': 150,
      'branch_name': 150,
      'created_at': 150,
      'updated_at': 150,
    };

    return widthMap[fieldName] || 100;
  }

  /**
   * 判断薪资字段是否默认可见
   */
  private isPayrollDefaultVisible(fieldName: string): boolean {
    const defaultVisibleFields = [
      'full_name',        // 员工姓名
      'department_name',  // 部门
      'pay_date',         // 发薪日期
      'status',           // 状态
      'gross_pay',        // 应发工资
      'total_deductions', // 扣除合计
      'net_pay'           // 实发工资
    ];
    return defaultVisibleFields.includes(fieldName);
  }

  /**
   * 获取薪资字段选项（用于select类型字段）
   */
  private getPayrollFieldOptions(fieldName: string, fieldType: FieldMetadata['type']): { value: string; label: string }[] | undefined {
    if (fieldType !== 'select') return undefined;

    const optionsMap: Record<string, { value: string; label: string }[]> = {
      'status': [
        { value: 'draft', label: '草稿' },
        { value: 'approved', label: '已批准' },
        { value: 'paid', label: '已发放' },
        { value: 'cancelled', label: '已取消' },
      ],
    };

    return optionsMap[fieldName];
  }

  /**
   * 获取薪资字段默认排序
   */
  private getPayrollDefaultOrder(fieldName: string): number {
    const orderMap: Record<string, number> = {
      'full_name': 1,         // 员工姓名
      'department_name': 2,   // 部门
      'pay_date': 3,          // 发薪日期
      'status': 4,            // 状态
      'gross_pay': 5,         // 应发工资
      'total_deductions': 6,  // 扣除合计
      'net_pay': 7,           // 实发工资
      'payroll_id': 8,
      'employee_id': 9,
      'position_name': 10,
      'category_name': 11,
      'pay_period_start': 12,
      'pay_period_end': 13,
      'primary_bank_account': 14,
      'bank_name': 15,
      'branch_name': 16,
      'created_at': 17,
      'updated_at': 18,
    };

    return orderMap[fieldName] || 999;
  }

  /**
   * 备选薪资元数据（当API失败时使用）
   */
  private getFallbackPayrollMetadata(): TableMetadata {
    return {
      tableName: 'view_payroll_summary',
      displayName: '薪资列表',
      description: '薪资记录和员工信息',
      primaryKey: 'payroll_id',
      defaultSort: { field: 'pay_date', direction: 'desc' },
      defaultFields: [
        'full_name',        // 员工姓名
        'department_name',  // 部门
        'pay_date',         // 发薪日期
        'status',           // 状态
        'gross_pay',        // 应发工资
        'total_deductions', // 扣除合计
        'net_pay'           // 实发工资
      ],
      fields: [
        {
          name: 'payroll_id',
          type: 'text',
          label: '薪资ID',
          description: '薪资记录唯一标识符',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'left',
          visible: false,
          order: 8,
        },
        {
          name: 'full_name',
          type: 'text',
          label: '员工姓名',
          description: '员工完整姓名',
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
          name: 'department_name',
          type: 'text',
          label: '部门',
          description: '员工所属部门',
          required: false,
          searchable: true,
          sortable: true,
          filterable: true,
          width: 120,
          alignment: 'left',
          visible: true,
          order: 2,
        },
        {
          name: 'pay_date',
          type: 'date',
          label: '发薪日期',
          description: '薪资发放日期',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'center',
          visible: true,
          order: 3,
        },
        {
          name: 'status',
          type: 'select',
          label: '薪资状态',
          description: '薪资记录当前状态',
          required: false,
          searchable: true,
          sortable: true,
          filterable: true,
          width: 100,
          alignment: 'center',
          visible: true,
          order: 4,
          options: [
            { value: 'draft', label: '草稿' },
            { value: 'approved', label: '已批准' },
            { value: 'paid', label: '已发放' },
            { value: 'cancelled', label: '已取消' },
          ],
        },
        {
          name: 'gross_pay',
          type: 'number',
          label: '应发工资',
          description: '税前应发工资总额',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'right',
          visible: true,
          order: 5,
        },
        {
          name: 'total_deductions',
          type: 'number',
          label: '扣除合计',
          description: '各项扣除总额',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'right',
          visible: true,
          order: 6,
        },
        {
          name: 'net_pay',
          type: 'number',
          label: '实发工资',
          description: '实际发放金额',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'right',
          visible: true,
          order: 7,
        },
      ],
    };
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
        {
          name: 'latest_institution',
          type: 'text',
          label: '最新毕业院校',
          required: false,
          searchable: true,
          sortable: true,
          filterable: false,
          width: 150,
          alignment: 'left',
          visible: false,
          order: 15,
        },
        {
          name: 'latest_degree',
          type: 'select',
          label: '最高学历',
          required: false,
          searchable: false,
          sortable: true,
          filterable: true,
          width: 100,
          alignment: 'center',
          visible: false,
          order: 16,
          options: [
            { value: '大学专科', label: '大学专科' },
            { value: '学士学位', label: '学士学位' },
            { value: '硕士学位', label: '硕士学位' },
            { value: '博士学位', label: '博士学位' },
          ],
        },
        {
          name: 'latest_field_of_study',
          type: 'text',
          label: '专业',
          required: false,
          searchable: true,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'left',
          visible: false,
          order: 17,
        },
        {
          name: 'latest_graduation_date',
          type: 'date',
          label: '毕业时间',
          required: false,
          searchable: false,
          sortable: true,
          filterable: false,
          width: 120,
          alignment: 'center',
          visible: false,
          order: 18,
        },
      ],
    };
  }

  /**
   * 清除缓存
   */
  clearCache(tableName?: string): void {
    if (tableName) {
      const cacheKey = `${tableName}_metadata`;
      this.cache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
      console.log(`Cleared cache for ${tableName}`);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
      console.log('Cleared all metadata cache');
    }
  }

  /**
   * 强制刷新员工视图元数据（用于开发测试）
   */
  async forceRefreshEmployeeMetadata(): Promise<TableMetadata> {
    this.clearCache('employee_view');
    return this.getEmployeeViewMetadata();
  }
}

export const metadataService = new MetadataService();