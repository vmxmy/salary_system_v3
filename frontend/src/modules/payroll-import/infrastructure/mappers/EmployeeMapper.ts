/**
 * Employee数据映射器
 * 
 * 负责在Employee Domain实体和Supabase数据库记录之间进行转换
 */

import { IDataMapper } from '../../../../shared/infrastructure/repositories/SupabaseRepositoryBase';
import { Employee, EmploymentStatus, Gender } from '../../domain/entities/Employee';
import type { Database } from '@/types/supabase';

type EmployeeRow = Database['public']['Tables']['employees']['Row'];
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

/**
 * Employee映射器实现
 */
export class EmployeeMapper implements IDataMapper<Employee, EmployeeRow> {
  
  /**
   * 从数据库行转换为Domain实体
   */
  toDomain(row: EmployeeRow): Employee {
    const employee = new Employee(
      row.employee_name || '',
      row.id_number || '',
      new Date(row.hire_date),
      this.mapEmploymentStatus(row.employment_status),
      row.id
    );

    // 设置可选属性
    if (row.date_of_birth) {
      employee.updateBasicInfo(
        undefined,
        new Date(row.date_of_birth),
        this.mapGender(row.gender)
      );
    }

    if (row.manager_id) {
      employee.setManager(row.manager_id);
    }

    if (row.user_id) {
      employee.setUser(row.user_id);
    }

    if (row.termination_date) {
      // 这里需要特殊处理，因为terminate方法会改变状态
      // 我们直接设置私有属性（需要在Employee类中提供setter或者特殊构造方法）
      (employee as any)._terminationDate = new Date(row.termination_date);
    }

    // 设置审计字段
    this.setAuditFields(employee, row);

    return employee;
  }

  /**
   * 从Domain实体转换为数据库插入对象
   */
  toInsert(entity: Employee): EmployeeInsert {
    return {
      id: entity.id,
      employee_name: entity.employeeName,
      id_number: entity.idNumber,
      employment_status: this.mapEmploymentStatusToDb(entity.employmentStatus),
      hire_date: entity.hireDate.toISOString().split('T')[0], // YYYY-MM-DD format
      date_of_birth: entity.dateOfBirth?.toISOString().split('T')[0] || null,
      gender: this.mapGenderToDb(entity.gender),
      manager_id: entity.managerId || null,
      user_id: entity.userId || null,
      termination_date: entity.terminationDate?.toISOString().split('T')[0] || null,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString()
    };
  }

  /**
   * 从Domain实体转换为数据库更新对象
   */
  toUpdate(entity: Employee): EmployeeUpdate {
    return {
      employee_name: entity.employeeName,
      id_number: entity.idNumber,
      employment_status: this.mapEmploymentStatusToDb(entity.employmentStatus),
      hire_date: entity.hireDate.toISOString().split('T')[0],
      date_of_birth: entity.dateOfBirth?.toISOString().split('T')[0] || null,
      gender: this.mapGenderToDb(entity.gender),
      manager_id: entity.managerId || null,
      user_id: entity.userId || null,
      termination_date: entity.terminationDate?.toISOString().split('T')[0] || null,
      updated_at: entity.updatedAt.toISOString()
    };
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 映射数据库雇佣状态到Domain枚举
   */
  private mapEmploymentStatus(dbStatus: string): EmploymentStatus {
    switch (dbStatus.toLowerCase()) {
      case 'active':
        return EmploymentStatus.ACTIVE;
      case 'inactive':
        return EmploymentStatus.INACTIVE;
      case 'terminated':
        return EmploymentStatus.TERMINATED;
      case 'on_leave':
        return EmploymentStatus.ON_LEAVE;
      default:
        return EmploymentStatus.ACTIVE; // 默认值
    }
  }

  /**
   * 映射Domain雇佣状态到数据库值
   */
  private mapEmploymentStatusToDb(status: EmploymentStatus): string {
    return status.toString();
  }

  /**
   * 映射数据库性别到Domain枚举
   */
  private mapGender(dbGender: string | null): Gender | undefined {
    if (!dbGender) return undefined;
    
    switch (dbGender.toLowerCase()) {
      case 'male':
      case '男':
        return Gender.MALE;
      case 'female':
      case '女':
        return Gender.FEMALE;
      case 'other':
      case '其他':
        return Gender.OTHER;
      default:
        return undefined;
    }
  }

  /**
   * 映射Domain性别到数据库值
   */
  private mapGenderToDb(gender: Gender | undefined): string | null {
    if (!gender) return null;
    
    switch (gender) {
      case Gender.MALE:
        return 'male';
      case Gender.FEMALE:
        return 'female';
      case Gender.OTHER:
        return 'other';
      default:
        return null;
    }
  }

  /**
   * 设置审计字段
   */
  private setAuditFields(employee: Employee, row: EmployeeRow): void {
    // 由于BaseEntity的字段是protected，我们需要通过类型断言来设置
    const entity = employee as any;
    entity._createdAt = new Date(row.created_at);
    entity._updatedAt = new Date(row.updated_at);
  }
}

/**
 * 员工扩展信息映射器
 * 用于处理包含部门、职位等关联信息的复杂查询结果
 */
export class EmployeeWithDetailsMapper {
  
  /**
   * 从员工详情视图转换为Domain实体
   */
  static fromEmployeeView(viewData: any): Employee {
    const mapper = new EmployeeMapper();
    
    // 首先创建基础员工实体
    const employee = mapper.toDomain({
      id: viewData.employee_id,
      employee_name: viewData.employee_name,
      id_number: viewData.id_number,
      employment_status: viewData.employment_status,
      hire_date: viewData.hire_date,
      date_of_birth: viewData.date_of_birth,
      gender: viewData.gender,
      manager_id: viewData.manager_id,
      user_id: viewData.user_id,
      termination_date: viewData.termination_date,
      created_at: viewData.created_at,
      updated_at: viewData.updated_at
    });

    // 设置职位信息（如果存在）
    if (viewData.department_id && viewData.department_name) {
      employee.setCurrentPosition({
        departmentId: viewData.department_id,
        departmentName: viewData.department_name,
        positionId: viewData.position_id || '',
        positionName: viewData.position_name || '',
        categoryId: viewData.category_id || '',
        categoryName: viewData.category_name || '',
        effectiveStartDate: new Date(viewData.position_start_date || viewData.hire_date),
        effectiveEndDate: viewData.position_end_date ? new Date(viewData.position_end_date) : undefined
      });
    }

    return employee;
  }

  /**
   * 转换银行账户数据
   */
  static mapBankAccounts(bankAccountRows: any[]): any[] {
    return bankAccountRows.map(row => ({
      id: row.id,
      bankName: row.bank_name,
      accountNumber: row.account_number,
      accountHolderName: row.account_holder_name,
      branchName: row.branch_name,
      isPrimary: row.is_primary || false,
      effectiveStartDate: new Date(row.effective_start_date),
      effectiveEndDate: row.effective_end_date ? new Date(row.effective_end_date) : undefined
    }));
  }
}

/**
 * 批量导入数据映射器
 * 专门处理Excel导入时的数据转换
 */
export class EmployeeImportMapper {
  
  /**
   * 从Excel行数据创建Employee实体
   */
  static fromExcelRow(excelRow: Record<string, any>): Employee {
    // 数据清洗和验证
    const employeeName = this.cleanString(excelRow['姓名'] || excelRow['员工姓名'] || excelRow['name']);
    const idNumber = this.cleanString(excelRow['身份证号'] || excelRow['证件号码'] || excelRow['id_number']);
    const hireDate = this.parseDate(excelRow['入职日期'] || excelRow['雇佣日期'] || excelRow['hire_date']);
    
    if (!employeeName || !idNumber || !hireDate) {
      throw new Error(`必填字段缺失: 姓名=${employeeName}, 身份证号=${idNumber}, 入职日期=${hireDate}`);
    }

    const employee = new Employee(
      employeeName,
      idNumber,
      hireDate,
      this.parseEmploymentStatus(excelRow['雇佣状态'] || excelRow['状态'] || excelRow['employment_status'])
    );

    // 设置可选字段
    const dateOfBirth = this.parseDate(excelRow['出生日期'] || excelRow['生日'] || excelRow['date_of_birth']);
    const gender = this.parseGender(excelRow['性别'] || excelRow['gender']);
    
    if (dateOfBirth || gender) {
      employee.updateBasicInfo(undefined, dateOfBirth, gender);
    }

    return employee;
  }

  /**
   * 清理字符串数据
   */
  private static cleanString(value: any): string | null {
    if (value === null || value === undefined) return null;
    
    const cleaned = String(value).trim();
    return cleaned === '' ? null : cleaned;
  }

  /**
   * 解析日期
   */
  private static parseDate(value: any): Date | null {
    if (!value) return null;
    
    // 处理Excel日期格式
    if (typeof value === 'number') {
      // Excel日期序列号
      const excelDate = new Date((value - 25569) * 86400 * 1000);
      return isNaN(excelDate.getTime()) ? null : excelDate;
    }
    
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    
    return null;
  }

  /**
   * 解析雇佣状态
   */
  private static parseEmploymentStatus(value: any): EmploymentStatus {
    if (!value) return EmploymentStatus.ACTIVE;
    
    const status = String(value).toLowerCase().trim();
    
    switch (status) {
      case '在职':
      case 'active':
      case '正常':
        return EmploymentStatus.ACTIVE;
      case '离职':
      case 'terminated':
      case '已离职':
        return EmploymentStatus.TERMINATED;
      case '休假':
      case 'on_leave':
      case '请假':
        return EmploymentStatus.ON_LEAVE;
      case '非活跃':
      case 'inactive':
        return EmploymentStatus.INACTIVE;
      default:
        return EmploymentStatus.ACTIVE;
    }
  }

  /**
   * 解析性别
   */
  private static parseGender(value: any): Gender | undefined {
    if (!value) return undefined;
    
    const gender = String(value).toLowerCase().trim();
    
    switch (gender) {
      case '男':
      case 'male':
      case 'm':
        return Gender.MALE;
      case '女':
      case 'female':
      case 'f':
        return Gender.FEMALE;
      case '其他':
      case 'other':
      case 'o':
        return Gender.OTHER;
      default:
        return undefined;
    }
  }
}