/**
 * 组织架构实体与DTO映射器
 * 
 * 处理组织架构领域实体与DTO之间的转换
 */

import { BaseMapper, Mapper, MapperUtils, MapperValidator } from '../../../shared/mappers/BaseMapper';
import { Department, DepartmentStatus, DepartmentType } from '../domain/entities/Department';
import { Position, PositionStatus, WorkLocation } from '../domain/entities/Position';
import { 
  DepartmentDto, 
  DepartmentDtoStatus, 
  DepartmentDtoType,
  PositionDto,
  PositionDtoStatus,
  WorkLocationDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreatePositionDto,
  UpdatePositionDto,
  OrganizationTreeDto
} from '../dto/OrganizationDto';

/**
 * 部门映射器
 */
@Mapper('department')
export class DepartmentMapper extends BaseMapper<Department, DepartmentDto> {

  /**
   * 从部门实体转换为DTO
   */
  toDto(department: Department): DepartmentDto {
    MapperValidator.validateRequired(department, ['id', 'name', 'type'], 'Department');

    return {
      ...this.mapBaseDtoProperties(department),
      name: department.name,
      code: department.code,
      type: this.mapDepartmentTypeToDto(department.type),
      status: this.mapDepartmentStatusToDto(department.status),
      parentId: department.parentId,
      parentName: department.parent?.name,
      managerId: department.managerId,
      managerName: department.manager?.employeeName,
      description: department.description,
      establishDate: this.dateToString(department.establishDate),
      budget: department.budget,
      employeeCount: department.employeeCount,
      positionCount: department.positionCount,
      contactInfo: department.contactInfo ? {
        phoneNumber: department.contactInfo.phoneNumber,
        email: department.contactInfo.email,
        address: department.contactInfo.address
      } : undefined,
      auditInfo: this.mapAuditInfo(department)
    };
  }

  /**
   * 从DTO转换为部门实体
   */
  toDomain(dto: DepartmentDto): Department {
    MapperValidator.validateRequired(dto, ['name', 'type'], 'DepartmentDto');

    const department = new Department(
      dto.name,
      this.mapDepartmentTypeFromDto(dto.type),
      dto.id
    );

    department.code = dto.code;
    department.status = this.mapDepartmentStatusFromDto(dto.status);
    department.parentId = dto.parentId;
    department.managerId = dto.managerId;
    department.description = dto.description;
    department.establishDate = this.stringToDate(dto.establishDate);
    department.budget = dto.budget;

    if (dto.contactInfo) {
      department.contactInfo = {
        phoneNumber: dto.contactInfo.phoneNumber,
        email: dto.contactInfo.email,
        address: dto.contactInfo.address
      };
    }

    return department;
  }

  /**
   * 从创建DTO转换为部门实体
   */
  fromCreateDto(dto: CreateDepartmentDto): Department {
    MapperValidator.validateRequired(dto, ['name', 'type'], 'CreateDepartmentDto');

    const department = new Department(
      dto.name,
      this.mapDepartmentTypeFromDto(dto.type)
    );

    department.code = dto.code;
    department.parentId = dto.parentId;
    department.managerId = dto.managerId;
    department.description = dto.description;
    department.establishDate = this.stringToDate(dto.establishDate);
    department.budget = dto.budget;

    if (dto.contactInfo) {
      department.contactInfo = {
        phoneNumber: dto.contactInfo.phoneNumber,
        email: dto.contactInfo.email,
        address: dto.contactInfo.address
      };
    }

    return department;
  }

  /**
   * 应用更新DTO到部门实体
   */
  applyUpdateDto(department: Department, dto: UpdateDepartmentDto): void {
    if (dto.name !== undefined) {
      department.name = dto.name;
    }

    if (dto.type !== undefined) {
      department.type = this.mapDepartmentTypeFromDto(dto.type);
    }

    if (dto.status !== undefined) {
      department.status = this.mapDepartmentStatusFromDto(dto.status);
    }

    if (dto.parentId !== undefined) {
      department.parentId = dto.parentId;
    }

    if (dto.managerId !== undefined) {
      department.managerId = dto.managerId;
    }

    if (dto.description !== undefined) {
      department.description = dto.description;
    }

    if (dto.budget !== undefined) {
      department.budget = dto.budget;
    }

    if (dto.contactInfo !== undefined) {
      department.contactInfo = {
        phoneNumber: dto.contactInfo.phoneNumber,
        email: dto.contactInfo.email,
        address: dto.contactInfo.address
      };
    }
  }

  /**
   * 转换为组织架构树节点DTO
   */
  toTreeNodeDto(
    department: Department,
    children: DepartmentDto[] = [],
    employeeCount: number = 0,
    positionCount: number = 0,
    activePositions: number = 0
  ): OrganizationTreeDto {
    return {
      id: department.id!,
      label: department.name,
      parentId: department.parentId,
      children: children.map(child => this.toTreeNodeDto(
        this.toDomain(child), 
        [], 
        child.employeeCount || 0, 
        child.positionCount || 0
      )),
      data: {
        department: this.toDto(department),
        employeeCount,
        positionCount,
        activePositions,
        vacantPositions: positionCount - activePositions
      }
    };
  }

  // ==================== 私有映射方法 ====================

  private mapDepartmentTypeToDto(type: DepartmentType): DepartmentDtoType {
    return MapperUtils.mapEnum(type, {
      [DepartmentType.HEADQUARTERS]: DepartmentDtoType.HEADQUARTERS,
      [DepartmentType.BRANCH]: DepartmentDtoType.BRANCH,
      [DepartmentType.CORE_BUSINESS]: DepartmentDtoType.CORE_BUSINESS,
      [DepartmentType.SUPPORT]: DepartmentDtoType.SUPPORT,
      [DepartmentType.RESEARCH]: DepartmentDtoType.RESEARCH,
      [DepartmentType.SALES]: DepartmentDtoType.SALES,
      [DepartmentType.FINANCE]: DepartmentDtoType.FINANCE,
      [DepartmentType.HR]: DepartmentDtoType.HR,
      [DepartmentType.IT]: DepartmentDtoType.IT,
      [DepartmentType.OPERATIONS]: DepartmentDtoType.OPERATIONS
    });
  }

  private mapDepartmentTypeFromDto(type: DepartmentDtoType): DepartmentType {
    return MapperUtils.mapEnum(type, {
      [DepartmentDtoType.HEADQUARTERS]: DepartmentType.HEADQUARTERS,
      [DepartmentDtoType.BRANCH]: DepartmentType.BRANCH,
      [DepartmentDtoType.CORE_BUSINESS]: DepartmentType.CORE_BUSINESS,
      [DepartmentDtoType.SUPPORT]: DepartmentType.SUPPORT,
      [DepartmentDtoType.RESEARCH]: DepartmentType.RESEARCH,
      [DepartmentDtoType.SALES]: DepartmentType.SALES,
      [DepartmentDtoType.FINANCE]: DepartmentType.FINANCE,
      [DepartmentDtoType.HR]: DepartmentType.HR,
      [DepartmentDtoType.IT]: DepartmentType.IT,
      [DepartmentDtoType.OPERATIONS]: DepartmentType.OPERATIONS
    });
  }

  private mapDepartmentStatusToDto(status: DepartmentStatus): DepartmentDtoStatus {
    return MapperUtils.mapEnum(status, {
      [DepartmentStatus.ACTIVE]: DepartmentDtoStatus.ACTIVE,
      [DepartmentStatus.INACTIVE]: DepartmentDtoStatus.INACTIVE,
      [DepartmentStatus.SUSPENDED]: DepartmentDtoStatus.SUSPENDED,
      [DepartmentStatus.DISSOLVED]: DepartmentDtoStatus.DISSOLVED
    });
  }

  private mapDepartmentStatusFromDto(status: DepartmentDtoStatus): DepartmentStatus {
    return MapperUtils.mapEnum(status, {
      [DepartmentDtoStatus.ACTIVE]: DepartmentStatus.ACTIVE,
      [DepartmentDtoStatus.INACTIVE]: DepartmentStatus.INACTIVE,
      [DepartmentDtoStatus.SUSPENDED]: DepartmentStatus.SUSPENDED,
      [DepartmentDtoStatus.DISSOLVED]: DepartmentStatus.DISSOLVED
    });
  }
}

/**
 * 职位映射器
 */
@Mapper('position')
export class PositionMapper extends BaseMapper<Position, PositionDto> {

  /**
   * 从职位实体转换为DTO
   */
  toDto(position: Position): PositionDto {
    MapperValidator.validateRequired(position, ['id', 'name', 'level', 'departmentId'], 'Position');

    return {
      ...this.mapBaseDtoProperties(position),
      name: position.name,
      code: position.code,
      level: position.level,
      status: this.mapPositionStatusToDto(position.status),
      departmentId: position.departmentId,
      departmentName: position.department?.name,
      description: position.description,
      responsibilities: [...position.responsibilities],
      requirements: [...position.requirements],
      salaryRange: {
        min: position.salaryRange.min,
        max: position.salaryRange.max,
        currency: position.salaryRange.currency
      },
      headcount: position.headcount,
      currentCount: position.currentCount,
      openings: position.openings,
      workLocation: this.mapWorkLocationToDto(position.workLocation),
      reportsTo: position.reportsTo,
      reportsToName: position.supervisor?.name,
      auditInfo: this.mapAuditInfo(position)
    };
  }

  /**
   * 从DTO转换为职位实体
   */
  toDomain(dto: PositionDto): Position {
    MapperValidator.validateRequired(dto, ['name', 'level', 'departmentId', 'headcount'], 'PositionDto');

    const position = new Position(
      dto.name,
      dto.level,
      dto.departmentId,
      dto.headcount,
      this.mapWorkLocationFromDto(dto.workLocation),
      dto.id
    );

    position.code = dto.code;
    position.status = this.mapPositionStatusFromDto(dto.status);
    position.description = dto.description;
    position.responsibilities = [...(dto.responsibilities || [])];
    position.requirements = [...(dto.requirements || [])];
    position.salaryRange = {
      min: dto.salaryRange.min,
      max: dto.salaryRange.max,
      currency: dto.salaryRange.currency
    };
    position.currentCount = dto.currentCount;
    position.openings = dto.openings;
    position.reportsTo = dto.reportsTo;

    return position;
  }

  /**
   * 从创建DTO转换为职位实体
   */
  fromCreateDto(dto: CreatePositionDto): Position {
    MapperValidator.validateRequired(dto, ['name', 'level', 'departmentId', 'headcount'], 'CreatePositionDto');

    const position = new Position(
      dto.name,
      dto.level,
      dto.departmentId,
      dto.headcount,
      this.mapWorkLocationFromDto(dto.workLocation)
    );

    position.code = dto.code;
    position.description = dto.description;
    position.responsibilities = [...(dto.responsibilities || [])];
    position.requirements = [...(dto.requirements || [])];
    position.salaryRange = {
      min: dto.salaryRange.min,
      max: dto.salaryRange.max,
      currency: dto.salaryRange.currency
    };
    position.reportsTo = dto.reportsTo;

    return position;
  }

  /**
   * 应用更新DTO到职位实体
   */
  applyUpdateDto(position: Position, dto: UpdatePositionDto): void {
    if (dto.name !== undefined) {
      position.name = dto.name;
    }

    if (dto.level !== undefined) {
      position.level = dto.level;
    }

    if (dto.status !== undefined) {
      position.status = this.mapPositionStatusFromDto(dto.status);
    }

    if (dto.departmentId !== undefined) {
      position.departmentId = dto.departmentId;
    }

    if (dto.description !== undefined) {
      position.description = dto.description;
    }

    if (dto.responsibilities !== undefined) {
      position.responsibilities = [...dto.responsibilities];
    }

    if (dto.requirements !== undefined) {
      position.requirements = [...dto.requirements];
    }

    if (dto.salaryRange !== undefined) {
      position.salaryRange = {
        min: dto.salaryRange.min,
        max: dto.salaryRange.max,
        currency: dto.salaryRange.currency
      };
    }

    if (dto.headcount !== undefined) {
      position.headcount = dto.headcount;
    }

    if (dto.workLocation !== undefined) {
      position.workLocation = this.mapWorkLocationFromDto(dto.workLocation);
    }

    if (dto.reportsTo !== undefined) {
      position.reportsTo = dto.reportsTo;
    }
  }

  // ==================== 私有映射方法 ====================

  private mapPositionStatusToDto(status: PositionStatus): PositionDtoStatus {
    return MapperUtils.mapEnum(status, {
      [PositionStatus.ACTIVE]: PositionDtoStatus.ACTIVE,
      [PositionStatus.INACTIVE]: PositionDtoStatus.INACTIVE,
      [PositionStatus.SUSPENDED]: PositionDtoStatus.SUSPENDED,
      [PositionStatus.DISCONTINUED]: PositionDtoStatus.DISCONTINUED
    });
  }

  private mapPositionStatusFromDto(status: PositionDtoStatus): PositionStatus {
    return MapperUtils.mapEnum(status, {
      [PositionDtoStatus.ACTIVE]: PositionStatus.ACTIVE,
      [PositionDtoStatus.INACTIVE]: PositionStatus.INACTIVE,
      [PositionDtoStatus.SUSPENDED]: PositionStatus.SUSPENDED,
      [PositionDtoStatus.DISCONTINUED]: PositionStatus.DISCONTINUED
    });
  }

  private mapWorkLocationToDto(location: WorkLocation): WorkLocationDto {
    return MapperUtils.mapEnum(location, {
      [WorkLocation.OFFICE]: WorkLocationDto.OFFICE,
      [WorkLocation.REMOTE]: WorkLocationDto.REMOTE,
      [WorkLocation.HYBRID]: WorkLocationDto.HYBRID,
      [WorkLocation.FIELD]: WorkLocationDto.FIELD,
      [WorkLocation.CLIENT_SITE]: WorkLocationDto.CLIENT_SITE
    });
  }

  private mapWorkLocationFromDto(location: WorkLocationDto): WorkLocation {
    return MapperUtils.mapEnum(location, {
      [WorkLocationDto.OFFICE]: WorkLocation.OFFICE,
      [WorkLocationDto.REMOTE]: WorkLocation.REMOTE,
      [WorkLocationDto.HYBRID]: WorkLocation.HYBRID,
      [WorkLocationDto.FIELD]: WorkLocation.FIELD,
      [WorkLocationDto.CLIENT_SITE]: WorkLocation.CLIENT_SITE
    });
  }
}