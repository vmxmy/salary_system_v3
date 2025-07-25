# 文档管理模块

## 功能概述
集成 Supabase Storage，实现员工相关文档的上传、预览、下载和管理功能，支持权限控制和版本管理。

## 核心需求

### 1. 文档类型支持
- **简历**：PDF、Word 文档
- **证件照片**：身份证、学历证书等
- **合同文件**：劳动合同、保密协议等
- **其他材料**：培训证书、荣誉证书等

### 2. 文件操作功能
- **上传**：拖拽上传、批量上传、进度显示
- **预览**：PDF、图片的在线预览
- **下载**：单个/批量下载
- **删除**：软删除，保留历史记录
- **重命名**：文件重命名和描述编辑

### 3. Storage 集成
```typescript
// 文件上传示例
const uploadDocument = async (
  employeeId: string,
  file: File,
  documentType: string
) => {
  const fileName = `${employeeId}/${documentType}/${Date.now()}_${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('employee-documents')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
    
  if (data) {
    // 保存文件记录到数据库
    await supabase
      .from('employee_documents')
      .insert({
        employee_id: employeeId,
        file_path: data.path,
        file_name: file.name,
        file_size: file.size,
        document_type: documentType,
        mime_type: file.type
      });
  }
};
```

## 技术实现要点

### 文件存储结构
```
employee-documents/
├── {employee_id}/
│   ├── resume/
│   ├── certificates/
│   ├── contracts/
│   └── others/
```

### 权限控制
- 利用 Storage 的 RLS 策略
- 基于用户角色的访问控制
- 生成带有过期时间的签名 URL

### 界面设计
```tsx
interface DocumentSection {
  type: 'resume' | 'certificates' | 'contracts' | 'others';
  title: string;
  icon: ReactNode;
  acceptedFormats: string[];
  maxSize: number; // MB
  documents: EmployeeDocument[];
}

const DocumentManager: React.FC<{
  employeeId: string;
  sections: DocumentSection[];
}> = ({ employeeId, sections }) => {
  // 实现文档管理界面
};
```

## 高级功能

### 1. 文件预览
- PDF.js 集成用于 PDF 预览
- 图片的缩略图生成
- Office 文档的预览（通过第三方服务）

### 2. 版本控制
- 保留文件的历史版本
- 版本对比功能
- 恢复到历史版本

### 3. 批量操作
- 批量上传（支持压缩包）
- 批量下载（生成 ZIP）
- 批量删除

## 安全考虑
- 文件类型白名单验证
- 文件大小限制
- 病毒扫描集成（可选）
- 敏感文档的加密存储

## 用户体验
- 拖拽区域的视觉反馈
- 上传进度的实时显示
- 文件列表的搜索和筛选
- 响应式的网格/列表视图切换