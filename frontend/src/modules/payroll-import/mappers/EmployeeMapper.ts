/**
 * 员工实体与DTO映射器
 * 
 * 处理Employee领域实体与EmployeeDto之间的转换
 */

import { BaseMapper, Mapper, MapperUtils, MapperValidator } from '../../../shared/mappers/BaseMapper';
import { EmployeeEnhanced, EmploymentStatus, EmployeeType } from '../domain/entities/EmployeeEnhanced';
import { 
  EmployeeDto, 
  EmployeeDtoStatus, 
  EmployeeDtoType,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeDetailDto,
  EmployeeContactDto,
  EmployeePersonalDto,
  EmployeeOptionDto
} from '../dto/EmployeeDto';

/**
 * 员工映射器
 */
@Mapper('employee')
export class EmployeeMapper extends BaseMapper<EmployeeEnhanced, EmployeeDto> {

  /**
   * 从员工实体转换为DTO
   */
  toDto(employee: EmployeeEnhanced): EmployeeDto {
    MapperValidator.validateRequired(employee, ['id', 'employeeName', 'idNumber'], 'Employee');

    return {
      ...this.mapBaseDtoProperties(employee),
      employeeName: employee.employeeName,
      idNumber: employee.idNumber,
      employeeNumber: employee.employeeNumber,
      hireDate: this.dateToString(employee.hireDate)!,
      terminationDate: this.dateToString(employee.terminationDate),
      employmentStatus: this.mapEmploymentStatusToDto(employee.employmentStatus),
      employeeType: this.mapEmployeeTypeToDto(employee.employeeType),
      baseSalary: employee.baseSalary,
      departmentId: employee.departmentId,
      departmentName: employee.department?.name,
      positionId: employee.positionId,
      positionName: employee.position?.name,
      managerId: employee.managerId,
      managerName: employee.manager?.employeeName,
      contactInfo: this.mapContactInfoToDto(employee.contactInfo),
      personalInfo: this.mapPersonalInfoToDto(employee.personalInfo),
      auditInfo: this.mapAuditInfo(employee)
    };
  }

  /**
   * 从DTO转换为员工实体
   */
  toDomain(dto: EmployeeDto): EmployeeEnhanced {
    MapperValidator.validateRequired(dto, ['employeeName', 'idNumber', 'hireDate'], 'EmployeeDto');

    const employee = new EmployeeEnhanced(
      dto.employeeName,
      dto.idNumber,
      this.stringToDate(dto.hireDate)!,
      this.mapEmploymentStatusFromDto(dto.employmentStatus),
      this.mapEmployeeTypeFromDto(dto.employeeType),
      dto.id
    );

    // 设置可选属性
    if (dto.employeeNumber) {
      employee.setEmployeeNumber(dto.employeeNumber);
    }

    if (dto.baseSalary) {
      employee.baseSalary = dto.baseSalary;
    }

    if (dto.departmentId) {
      employee.departmentId = dto.departmentId;
    }

    if (dto.positionId) {
      employee.positionId = dto.positionId;
    }

    if (dto.managerId) {
      employee.managerId = dto.managerId;
    }

    if (dto.terminationDate) {
      employee.terminationDate = this.stringToDate(dto.terminationDate);
    }

    // 设置联系信息和个人信息
    if (dto.contactInfo) {
      employee.contactInfo = this.mapContactInfoFromDto(dto.contactInfo);
    }

    if (dto.personalInfo) {
      employee.personalInfo = this.mapPersonalInfoFromDto(dto.personalInfo);
    }

    return employee;
  }

  /**
   * 从创建DTO转换为员工实体
   */
  fromCreateDto(dto: CreateEmployeeDto): EmployeeEnhanced {
    MapperValidator.validateRequired(dto, ['employeeName', 'idNumber', 'hireDate'], 'CreateEmployeeDto');

    const employee = new EmployeeEnhanced(
      dto.employeeName,
      dto.idNumber,
      this.stringToDate(dto.hireDate)!,
      this.mapEmploymentStatusFromDto(dto.employmentStatus),
      this.mapEmployeeTypeFromDto(dto.employeeType)
    );

    employee.baseSalary = dto.baseSalary;
    employee.departmentId = dto.departmentId;
    employee.positionId = dto.positionId;
    employee.managerId = dto.managerId;

    if (dto.contactInfo) {
      employee.contactInfo = this.mapContactInfoFromDto(dto.contactInfo);
    }

    if (dto.personalInfo) {
      employee.personalInfo = this.mapPersonalInfoFromDto(dto.personalInfo);
    }

    return employee;
  }

  /**
   * 应用更新DTO到员工实体
   */
  applyUpdateDto(employee: EmployeeEnhanced, dto: UpdateEmployeeDto): void {
    if (dto.employeeName !== undefined) {
      employee.employeeName = dto.employeeName;
    }

    if (dto.employmentStatus !== undefined) {
      employee.employmentStatus = this.mapEmploymentStatusFromDto(dto.employmentStatus);
    }

    if (dto.employeeType !== undefined) {
      employee.employeeType = this.mapEmployeeTypeFromDto(dto.employeeType);
    }

    if (dto.baseSalary !== undefined) {
      employee.baseSalary = dto.baseSalary;
    }

    if (dto.departmentId !== undefined) {
      employee.departmentId = dto.departmentId;
    }

    if (dto.positionId !== undefined) {
      employee.positionId = dto.positionId;
    }

    if (dto.managerId !== undefined) {
      employee.managerId = dto.managerId;
    }

    if (dto.terminationDate !== undefined) {
      employee.terminationDate = this.stringToDate(dto.terminationDate);
    }

    if (dto.contactInfo) {
      employee.contactInfo = MapperUtils.merge(
        employee.contactInfo || {},
        this.mapContactInfoFromDto(dto.contactInfo)
      );
    }

    if (dto.personalInfo) {
      employee.personalInfo = MapperUtils.merge(
        employee.personalInfo || {},
        this.mapPersonalInfoFromDto(dto.personalInfo)
      );
    }
  }

  /**
   * 转换为详情DTO
   */
  toDetailDto(employee: EmployeeEnhanced): EmployeeDetailDto {
    const baseDto = this.toDto(employee);
    const statistics = employee.getStatistics();

    return {
      ...baseDto,
      statistics: {
        tenureDays: statistics.tenureDays,
        tenureMonths: statistics.tenureMonths,
        tenureYears: statistics.tenureYears,
        payrollRecordsCount: statistics.payrollRecordsCount,
        latestPayroll: statistics.latestPayroll ? {
          payDate: this.dateToString(statistics.latestPayroll.payDate)!,
          grossPay: statistics.latestPayroll.grossPay,
          netPay: statistics.latestPayroll.netPay
        } : undefined,
        annualIncome: statistics.annualIncome
      },
      careerHistory: employee.careerHistory?.map(history => ({
        departmentName: history.departmentName,
        positionName: history.positionName,
        startDate: this.dateToString(history.startDate)!,
        endDate: this.dateToString(history.endDate),
        baseSalary: history.baseSalary,
        reason: history.reason
      })),
      performanceRecords: employee.performanceRecords?.map(record => ({
        evaluationDate: this.dateToString(record.evaluationDate)!,
        evaluatorName: record.evaluatorName,
        ratingLevel: record.ratingLevel,
        score: record.score,
        comments: record.comments
      }))
    };
  }

  /**
   * 转换为选项DTO
   */
  toOptionDto(employee: EmployeeEnhanced): EmployeeOptionDto {
    return {
      value: employee.id!,
      label: employee.employeeName,
      employeeNumber: employee.employeeNumber,
      departmentName: employee.department?.name,
      positionName: employee.position?.name,
      status: this.mapEmploymentStatusToDto(employee.employmentStatus),
      disabled: !employee.isActive
    };
  }

  /**
   * 批量转换为选项DTO
   */
  toOptionDtoList(employees: EmployeeEnhanced[]): EmployeeOptionDto[] {
    return employees.map(employee => this.toOptionDto(employee));
  }

  // ==================== 私有映射方法 ====================

  private mapEmploymentStatusToDto(status: EmploymentStatus): EmployeeDtoStatus {
    return MapperUtils.mapEnum(status, {
      [EmploymentStatus.ACTIVE]: EmployeeDtoStatus.ACTIVE,
      [EmploymentStatus.PROBATION]: EmployeeDtoStatus.PROBATION,
      [EmploymentStatus.TERMINATED]: EmployeeDtoStatus.TERMINATED,
      [EmploymentStatus.SUSPENDED]: EmployeeDtoStatus.SUSPENDED
    });
  }

  private mapEmploymentStatusFromDto(status: EmployeeDtoStatus): EmploymentStatus {
    return MapperUtils.mapEnum(status, {
      [EmployeeDtoStatus.ACTIVE]: EmploymentStatus.ACTIVE,
      [EmployeeDtoStatus.PROBATION]: EmploymentStatus.PROBATION,
      [EmployeeDtoStatus.TERMINATED]: EmploymentStatus.TERMINATED,
      [EmployeeDtoStatus.SUSPENDED]: EmploymentStatus.SUSPENDED
    });
  }

  private mapEmployeeTypeToDto(type: EmployeeType): EmployeeDtoType {
    return MapperUtils.mapEnum(type, {
      [EmployeeType.FULL_TIME]: EmployeeDtoType.FULL_TIME,
      [EmployeeType.PART_TIME]: EmployeeDtoType.PART_TIME,
      [EmployeeType.CONTRACT]: EmployeeDtoType.CONTRACT,
      [EmployeeType.INTERN]: EmployeeDtoType.INTERN,
      [EmployeeType.TEMPORARY]: EmployeeDtoType.TEMPORARY
    });
  }

  private mapEmployeeTypeFromDto(type: EmployeeDtoType): EmployeeType {
    return MapperUtils.mapEnum(type, {
      [EmployeeDtoType.FULL_TIME]: EmployeeType.FULL_TIME,
      [EmployeeDtoType.PART_TIME]: EmployeeType.PART_TIME,
      [EmployeeDtoType.CONTRACT]: EmployeeType.CONTRACT,
      [EmployeeDtoType.INTERN]: EmployeeType.INTERN,
      [EmployeeDtoType.TEMPORARY]: EmployeeType.TEMPORARY
    });
  }

  private mapContactInfoToDto(contactInfo: any): EmployeeContactDto | undefined {
    if (!contactInfo) return undefined;

    return {
      phoneNumber: contactInfo.phoneNumber,
      email: contactInfo.email,
      emergencyContact: contactInfo.emergencyContact ? {
        name: contactInfo.emergencyContact.name,
        relationship: contactInfo.emergencyContact.relationship,
        phoneNumber: contactInfo.emergencyContact.phoneNumber
      } : undefined,
      homeAddress: contactInfo.homeAddress ? {
        province: contactInfo.homeAddress.province,
        city: contactInfo.homeAddress.city,
        district: contactInfo.homeAddress.district,
        street: contactInfo.homeAddress.street,
        postalCode: contactInfo.homeAddress.postalCode
      } : undefined
    };
  }

  private mapContactInfoFromDto(dto: EmployeeContactDto): any {
    return {
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      emergencyContact: dto.emergencyContact ? {
        name: dto.emergencyContact.name,
        relationship: dto.emergencyContact.relationship,
        phoneNumber: dto.emergencyContact.phoneNumber
      } : undefined,
      homeAddress: dto.homeAddress ? {
        province: dto.homeAddress.province,
        city: dto.homeAddress.city,
        district: dto.homeAddress.district,
        street: dto.homeAddress.street,
        postalCode: dto.homeAddress.postalCode
      } : undefined
    };
  }

  private mapPersonalInfoToDto(personalInfo: any): EmployeePersonalDto | undefined {
    if (!personalInfo) return undefined;

    return {
      gender: personalInfo.gender,
      birthDate: this.dateToString(personalInfo.birthDate),
      age: personalInfo.age,
      ethnicity: personalInfo.ethnicity,
      politicalStatus: personalInfo.politicalStatus,
      maritalStatus: personalInfo.maritalStatus,
      education: personalInfo.education,
      major: personalInfo.major,
      graduatedFrom: personalInfo.graduatedFrom,
      workExperience: personalInfo.workExperience
    };
  }

  private mapPersonalInfoFromDto(dto: EmployeePersonalDto): any {
    return {
      gender: dto.gender,
      birthDate: this.stringToDate(dto.birthDate),
      age: dto.age,
      ethnicity: dto.ethnicity,
      politicalStatus: dto.politicalStatus,
      maritalStatus: dto.maritalStatus,
      education: dto.education,
      major: dto.major,
      graduatedFrom: dto.graduatedFrom,
      workExperience: dto.workExperience
    };
  }
}