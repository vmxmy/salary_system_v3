# 页面交互设计规范

## 概述

本文档定义了人事工资系统前端页面的交互模式、设计规范和用户体验准则，确保整个系统的一致性和易用性。

---

## 一、时间片管理UI模式

### 1.1 设计原则
时间片数据（有效期范围数据）是本系统的核心特性，需要特殊的UI模式来处理历史、当前和未来状态的数据。

### 1.2 时间轴组件 (Timeline Component)

#### 视觉设计
```
过去 ←——————— 现在 ———————→ 未来
  |-----------|-----------|----------→
历史记录    当前记录    计划变更
（只读）   （可编辑）   （可修改）
```

#### 状态标识
- **历史记录**: 灰色背景，只读模式
- **当前记录**: 蓝色边框，可编辑
- **未来记录**: 绿色边框，可修改/删除
- **重叠冲突**: 红色边框，错误提示

#### 操作模式
1. **查看模式**: 时间轴展示所有记录
2. **编辑模式**: 弹出表单，区分修改类型
3. **新增模式**: 自动计算有效期起始时间

### 1.3 有效期编辑器

#### 编辑类型识别
```typescript
enum EditType {
  CORRECTION = 'correction',    // 纠错：修改历史数据
  CURRENT_UPDATE = 'current',   // 当前修改：立即生效
  SCHEDULED = 'scheduled'       // 计划变更：未来生效
}
```

#### 用户界面
```tsx
// 编辑确认对话框
<Modal title="编辑类型确认">
  <RadioGroup>
    <Radio value="correction">
      纠正错误 - 修改历史记录（影响过往计算）
    </Radio>
    <Radio value="current">
      当前调整 - 立即生效（从今天开始）
    </Radio>
    <Radio value="scheduled">
      计划变更 - 指定未来生效日期
    </Radio>
  </RadioGroup>
  
  {editType === 'scheduled' && (
    <DatePicker placeholder="选择生效日期" />
  )}
</Modal>
```

### 1.4 冲突检测与解决

#### 检测规则
- 同一员工不能在同一时间有多个有效记录
- 新记录的开始日期不能早于最后一条记录的开始日期（除非是纠错模式）
- 未来记录之间不能有时间重叠

#### 冲突解决流程
```
检测冲突 → 显示冲突列表 → 用户选择解决方案 → 自动调整相关记录
```

---

## 二、权限控制展示规范

### 2.1 页面级权限控制

#### 无权限访问页面
```tsx
<Result
  status="403"
  title="403"
  subTitle="抱歉，您没有权限访问此页面"
  extra={
    <Button type="primary" onClick={() => history.back()}>
      返回上页
    </Button>
  }
/>
```

#### 部分权限显示
- **只读模式**: 禁用所有编辑按钮，表单字段设为只读
- **受限编辑**: 只显示用户有权限的操作按钮
- **数据过滤**: 基于RLS只显示用户可见的数据

### 2.2 组件级权限控制

#### 权限包装组件
```tsx
interface PermissionWrapperProps {
  roles: UserRole[];
  permissions?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  roles,
  permissions,
  fallback = null,
  children
}) => {
  const { userRole, userPermissions } = useAuth();
  
  const hasRoleAccess = roles.includes(userRole);
  const hasPermissionAccess = permissions?.every(p => 
    userPermissions.includes(p)
  ) ?? true;
  
  if (hasRoleAccess && hasPermissionAccess) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};
```

#### 使用示例
```tsx
<PermissionWrapper 
  roles={[UserRole.ADMIN, UserRole.HR_MANAGER]}
  fallback={<span>无权限查看</span>}
>
  <Button type="primary">编辑员工信息</Button>
</PermissionWrapper>
```

### 2.3 数据级权限提示

#### 受限数据显示
```tsx
// 敏感信息脱敏
const MaskedData: React.FC<{value: string, mask?: boolean}> = ({value, mask = true}) => {
  if (mask) {
    return <span>***已脱敏***</span>;
  }
  return <span>{value}</span>;
};

// 权限受限提示
const RestrictedTooltip: React.FC<{children: React.ReactNode}> = ({children}) => (
  <Tooltip title="您没有权限查看此信息">
    {children}
  </Tooltip>
);
```

---

## 三、批量操作交互流程

### 3.1 选择机制

#### 表格选择
```tsx
const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

const rowSelection = {
  selectedRowKeys,
  onChange: setSelectedRowKeys,
  onSelect: (record, selected, selectedRows) => {
    // 单行选择处理
  },
  onSelectAll: (selected, selectedRows, changeRows) => {
    // 全选处理
  },
  getCheckboxProps: (record) => ({
    disabled: !hasPermission(record), // 根据权限禁用选择
  }),
};
```

#### 选择状态显示
```tsx
<div className="selection-bar">
  <span>已选择 {selectedRowKeys.length} 项</span>
  <Space>
    <Button onClick={() => setSelectedRowKeys([])}>清空选择</Button>
    <Button type="primary" onClick={handleBatchDelete}>批量删除</Button>
    <Button onClick={handleBatchExport}>批量导出</Button>
  </Space>
</div>
```

### 3.2 操作确认流程

#### 批量操作确认
```tsx
const BatchOperationModal: React.FC<{
  visible: boolean;
  operation: 'delete' | 'update' | 'export';
  selectedItems: any[];
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ visible, operation, selectedItems, onConfirm, onCancel }) => {
  const operationMap = {
    delete: { title: '批量删除确认', color: 'red', icon: <DeleteOutlined /> },
    update: { title: '批量更新确认', color: 'blue', icon: <EditOutlined /> },
    export: { title: '批量导出确认', color: 'green', icon: <ExportOutlined /> }
  };
  
  const config = operationMap[operation];
  
  return (
    <Modal
      title={config.title}
      visible={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      okButtonProps={{ danger: operation === 'delete' }}
    >
      <div style={{ color: config.color }}>
        {config.icon} 即将{operation === 'delete' ? '删除' : '处理'} {selectedItems.length} 项数据
      </div>
      
      <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 16 }}>
        {selectedItems.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
      
      {operation === 'delete' && (
        <Alert
          type="warning"
          message="删除操作不可恢复"
          description="请确认选择的数据可以被删除，此操作将永久删除选中的记录。"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
};
```

### 3.3 进度显示

#### 批量操作进度条
```tsx
const BatchProgressModal: React.FC<{
  visible: boolean;
  total: number;
  completed: number;
  failed: number;
  operation: string;
}> = ({ visible, total, completed, failed, operation }) => (
  <Modal
    title={`批量${operation}进度`}
    visible={visible}
    footer={null}
    closable={false}
  >
    <Progress 
      percent={Math.round((completed + failed) / total * 100)}
      status={failed > 0 ? 'exception' : 'active'}
    />
    
    <div style={{ marginTop: 16 }}>
      <div>总计: {total}</div>
      <div style={{ color: '#52c41a' }}>成功: {completed}</div>
      <div style={{ color: '#ff4d4f' }}>失败: {failed}</div>
      <div>剩余: {total - completed - failed}</div>
    </div>
    
    {failed > 0 && (
      <Alert
        type="warning"
        message="部分操作失败"
        description="请检查失败记录并重新处理"
        showIcon
        style={{ marginTop: 16 }}
      />
    )}
  </Modal>
);
```

---

## 四、表单验证规范

### 4.1 验证时机
- **实时验证**: 输入过程中的格式检查
- **失焦验证**: 字段完整性和业务规则检查
- **提交验证**: 表单整体验证和服务端验证

### 4.2 验证规则类型

#### 基础验证
```typescript
const validationRules = {
  required: { required: true, message: '此字段为必填项' },
  email: { type: 'email', message: '请输入有效的邮箱地址' },
  phone: { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
  idCard: { 
    pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
    message: '请输入有效的身份证号'
  }
};
```

#### 业务验证
```typescript
const businessRules = {
  uniqueEmployeeId: {
    validator: async (_, value) => {
      if (value) {
        const exists = await checkEmployeeIdExists(value);
        if (exists) {
          throw new Error('员工编号已存在');
        }
      }
    }
  },
  
  dateRange: {
    validator: (_, value, { getFieldValue }) => {
      const startDate = getFieldValue('startDate');
      if (startDate && value && value.isBefore(startDate)) {
        throw new Error('结束日期不能早于开始日期');
      }
    }
  }
};
```

### 4.3 错误显示模式

#### 字段级错误
```tsx
<Form.Item
  name="employeeName"
  label="员工姓名"
  rules={[validationRules.required]}
  validateStatus={errors.employeeName ? 'error' : ''}
  help={errors.employeeName?.message}
>
  <Input placeholder="请输入员工姓名" />
</Form.Item>
```

#### 表单级错误汇总
```tsx
{Object.keys(errors).length > 0 && (
  <Alert
    type="error"
    message="表单验证失败"
    description={
      <ul>
        {Object.entries(errors).map(([field, error]) => (
          <li key={field}>{error.message}</li>
        ))}
      </ul>
    }
    style={{ marginBottom: 16 }}
  />
)}
```

---

## 五、错误处理模式

### 5.1 错误类型分类

#### 客户端错误
```typescript
enum ClientErrorType {
  VALIDATION = 'validation',      // 表单验证错误
  PERMISSION = 'permission',      // 权限错误
  NETWORK = 'network',           // 网络错误
  BUSINESS = 'business'          // 业务逻辑错误
}
```

#### 服务端错误
```typescript
enum ServerErrorType {
  UNAUTHORIZED = 401,     // 未授权
  FORBIDDEN = 403,       // 禁止访问
  NOT_FOUND = 404,       // 资源不存在
  CONFLICT = 409,        // 数据冲突
  SERVER_ERROR = 500     // 服务器错误
}
```

### 5.2 错误展示组件

#### 全局错误边界
```tsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // 发送错误报告到监控服务
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="500"
          title="页面出现错误"
          subTitle="抱歉，页面遇到了一些问题"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
```

#### API错误处理
```tsx
const useApiError = () => {
  const showError = useCallback((error: ApiError) => {
    const errorConfig = {
      [ServerErrorType.UNAUTHORIZED]: {
        title: '登录已过期',
        description: '请重新登录后继续操作',
        action: () => logout()
      },
      [ServerErrorType.FORBIDDEN]: {
        title: '权限不足',
        description: '您没有权限执行此操作',
      },
      [ServerErrorType.NOT_FOUND]: {
        title: '资源不存在',
        description: '请求的资源可能已被删除或不存在',
      },
      [ServerErrorType.CONFLICT]: {
        title: '数据冲突',
        description: '操作失败，数据可能已被其他用户修改',
      },
      [ServerErrorType.SERVER_ERROR]: {
        title: '服务器错误',
        description: '服务暂时不可用，请稍后重试',
      }
    };

    const config = errorConfig[error.status] || {
      title: '操作失败',
      description: error.message || '未知错误'
    };

    Modal.error({
      title: config.title,
      content: config.description,
      onOk: config.action
    });
  }, []);

  return { showError };
};
```

### 5.3 友好错误提示

#### 业务错误提示
```tsx
const BusinessErrorAlert: React.FC<{
  error: BusinessError;
  onRetry?: () => void;
  onCancel?: () => void;
}> = ({ error, onRetry, onCancel }) => {
  const getErrorIcon = (type: string) => {
    const iconMap = {
      validation: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      permission: <StopOutlined style={{ color: '#ff4d4f' }} />,
      business: <InfoCircleOutlined style={{ color: '#1890ff' }} />
    };
    return iconMap[type] || <QuestionCircleOutlined />;
  };

  return (
    <Alert
      type="warning"
      showIcon
      icon={getErrorIcon(error.type)}
      message={error.title}
      description={error.description}
      action={
        <Space>
          {onRetry && (
            <Button size="small" onClick={onRetry}>
              重试
            </Button>
          )}
          {onCancel && (
            <Button size="small" type="text" onClick={onCancel}>
              取消
            </Button>
          )}
        </Space>
      }
    />
  );
};
```

---

## 六、响应式设计规范

### 6.1 断点定义
```scss
$breakpoints: (
  xs: 0,      // 超小屏幕 手机
  sm: 576px,  // 小屏幕 平板竖屏
  md: 768px,  // 中等屏幕 平板横屏
  lg: 992px,  // 大屏幕 桌面显示器
  xl: 1200px, // 超大屏幕 大桌面显示器
  xxl: 1600px // 超大屏幕 超宽显示器
);
```

### 6.2 移动端适配

#### 表格响应式
```tsx
const ResponsiveTable: React.FC<{columns: any[], dataSource: any[]}> = ({
  columns,
  dataSource
}) => {
  const [screenSize, setScreenSize] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setScreenSize(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 移动端使用卡片模式
  if (screenSize < 768) {
    return (
      <div className="mobile-card-list">
        {dataSource.map(item => (
          <Card key={item.id} size="small" style={{ marginBottom: 8 }}>
            {columns.map(col => (
              <div key={col.dataIndex} className="card-row">
                <span className="label">{col.title}:</span>
                <span className="value">{item[col.dataIndex]}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    );
  }

  // 桌面端使用表格模式
  return <Table columns={columns} dataSource={dataSource} />;
};
```

#### 表单响应式布局
```tsx
const ResponsiveForm: React.FC = () => {
  return (
    <Form layout="vertical">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="name" label="姓名">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};
```

---

## 七、用户体验优化

### 7.1 加载状态处理

#### 骨架屏
```tsx
const TableSkeleton: React.FC<{rows?: number}> = ({rows = 5}) => (
  <div>
    {Array.from({length: rows}).map((_, index) => (
      <div key={index} style={{ display: 'flex', padding: '12px 0' }}>
        <Skeleton.Avatar style={{ marginRight: 16 }} />
        <div style={{ flex: 1 }}>
          <Skeleton active paragraph={{ rows: 1 }} />
        </div>
      </div>
    ))}
  </div>
);
```

#### 加载占位符
```tsx
const LoadingWrapper: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
}> = ({ loading, children, skeleton }) => {
  if (loading) {
    return skeleton || <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: 50 }} />;
  }
  return <>{children}</>;
};
```

### 7.2 操作反馈

#### 成功反馈
```tsx
const showSuccessMessage = (action: string, count?: number) => {
  message.success(
    count 
      ? `成功${action} ${count} 条记录`
      : `${action}成功`
  );
};
```

#### 操作确认
```tsx
const confirmAction = (action: string, onConfirm: () => void) => {
  Modal.confirm({
    title: `确认${action}`,
    content: `您确定要${action}吗？此操作无法撤销。`,
    okText: '确认',
    cancelText: '取消',
    onOk: onConfirm,
  });
};
```

### 7.3 键盘快捷键

#### 快捷键定义
```tsx
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+S 保存
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
      
      // Ctrl+N 新增
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        handleAdd();
      }
      
      // ESC 取消
      if (event.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);
};
```

---

## 八、无障碍访问规范

### 8.1 语义化HTML
```tsx
// 使用语义化标签
<main role="main">
  <header>
    <h1>员工管理</h1>
  </header>
  
  <nav aria-label="员工操作">
    <button aria-label="添加新员工">添加员工</button>
  </nav>
  
  <section aria-label="员工列表">
    <table role="table" aria-label="员工信息表格">
      {/* 表格内容 */}
    </table>
  </section>
</main>
```

### 8.2 ARIA属性
```tsx
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  {errorMessage}
</div>

<button
  aria-expanded={menuOpen}
  aria-haspopup="menu"
  aria-controls="dropdown-menu"
>
  操作菜单
</button>
```

### 8.3 焦点管理
```tsx
const useFocusManagement = () => {
  const focusRef = useRef<HTMLElement>(null);
  
  const setFocus = useCallback(() => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  }, []);
  
  return { focusRef, setFocus };
};
```

---

## 九、国际化交互规范

### 9.1 语言切换
```tsx
const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  
  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    // 保存到本地存储
    localStorage.setItem('language', language);
  };
  
  return (
    <Select
      value={i18n.language}
      onChange={handleLanguageChange}
      style={{ width: 120 }}
    >
      <Select.Option value="zh-CN">中文</Select.Option>
      <Select.Option value="en-US">English</Select.Option>
    </Select>
  );
};
```

### 9.2 本地化显示
```tsx
const LocalizedDateTime: React.FC<{date: string}> = ({date}) => {
  const { i18n } = useTranslation();
  
  const formatDate = (dateString: string) => {
    const locale = i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';
    return new Intl.DateTimeFormat(locale).format(new Date(dateString));
  };
  
  return <span>{formatDate(date)}</span>;
};
```

---

## 十、性能优化交互

### 10.1 虚拟滚动
```tsx
const VirtualTable: React.FC<{
  dataSource: any[];
  columns: any[];
  height: number;
}> = ({ dataSource, columns, height }) => {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(20);
  
  const visibleData = dataSource.slice(startIndex, endIndex);
  
  return (
    <div style={{ height, overflow: 'auto' }}>
      {/* 虚拟滚动实现 */}
    </div>
  );
};
```

### 10.2 防抖搜索
```tsx
const useDebounceSearch = (callback: (value: string) => void, delay = 300) => {
  const [searchValue, setSearchValue] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue) {
        callback(searchValue);
      }
    }, delay);
    
    return () => clearTimeout(timer);
  }, [searchValue, callback, delay]);
  
  return [searchValue, setSearchValue] as const;
};
```

---

**文档版本**: v1.0  
**创建日期**: 2025-01-24  
**更新日期**: 2025-01-24  
**关联文档**: frontend_page_requirements.md