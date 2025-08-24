/**
 * 权限资源管理组件统一导出
 */

export { PermissionResourceList } from './PermissionResourceList';
export { PermissionDefinitionEditor } from './PermissionDefinitionEditor';
export { ResourceManagementModal } from './ResourceManagementModal';
export { PermissionCodeGenerator, permissionCodeUtils } from './PermissionCodeGenerator';

// 类型导出
export type {
  PermissionResourceListProps,
  PermissionDefinitionEditorProps,
  ResourceManagementModalProps,
  PermissionCodeGeneratorProps
} from '@/types/permission-resource';