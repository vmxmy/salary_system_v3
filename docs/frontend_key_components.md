# 关键组件开发指南

## 概述

本文档详细定义了人事工资系统前端开发中的关键通用组件，包括组件API设计、实现要点和使用示例。这些组件是整个系统UI一致性和开发效率的基础。

---

## 一、通用数据表格组件 (DataTable)

### 1.1 组件概述
DataTable是系统中最核心的数据展示组件，提供统一的表格展示、操作和交互模式。

### 1.2 API设计

```typescript
interface DataTableProps<T = any> {
  // 数据相关
  dataSource: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  
  // 分页配置
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    onChange: (page: number, pageSize: number) => void;
  };
  
  // 选择功能
  rowSelection?: {
    selectedRowKeys: string[];
    onChange: (selectedRowKeys: string[], selectedRows: T[]) => void;
    getCheckboxProps?: (record: T) => { disabled?: boolean };
  };
  
  // 操作配置
  actions?: {
    create?: {
      text?: string;
      onClick: () => void;
      permission?: string[];
    };
    batchActions?: Array<{
      key: string;
      text: string;
      icon?: React.ReactNode;
      onClick: (selectedRows: T[]) => void;
      permission?: string[];
      danger?: boolean;
    }>;
  };
  
  // 搜索配置
  searchConfig?: {
    placeholder?: string;
    onSearch: (value: string) => void;
    filters?: DataTableFilter[];
  };
  
  // 导出配置
  exportConfig?: {
    filename?: string;
    columns?: string[];
    onExport?: (data: T[]) => void;
  };
  
  // 样式配置
  size?: 'small' | 'middle' | 'large';
  scroll?: { x?: number | string; y?: number | string };
  
  // 事件回调
  onRow?: (record: T, index: number) => React.HTMLAttributes<any>;
  onRowClick?: (record: T, index: number) => void;
  onRowDoubleClick?: (record: T, index: number) => void;
}

interface DataTableColumn<T> {
  title: string;
  dataIndex: keyof T;
  key?: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sorter?: boolean | ((a: T, b: T) => number);
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  permission?: string[]; // 列级权限控制
}

interface DataTableFilter {
  key: string;
  label: string;
  type: 'select' | 'dateRange' | 'input';
  options?: { label: string; value: any }[];
  onChange: (value: any) => void;
}
```

### 1.3 实现示例

```tsx
import React, { useState, useMemo } from 'react';
import { Table, Button, Space, Input, Select, DatePicker, Card, Dropdown, Menu } from 'antd';
import { SearchOutlined, PlusOutlined, ExportOutlined, MoreOutlined } from '@ant-design/icons';
import { usePermissions } from '@/hooks/usePermissions';

const DataTable: React.FC<DataTableProps> = ({
  dataSource,
  columns,
  loading = false,
  pagination,
  rowSelection,
  actions,
  searchConfig,
  exportConfig,
  size = 'middle',
  scroll,
  onRow,
  onRowClick,
  onRowDoubleClick
}) => {
  const { hasPermission } = usePermissions();
  const [searchValue, setSearchValue] = useState('');
  
  // 过滤有权限的列
  const visibleColumns = useMemo(() => {
    return columns.filter(col => {
      if (!col.permission) return true;
      return col.permission.some(p => hasPermission(p));
    });
  }, [columns, hasPermission]);
  
  // 处理行点击
  const handleRowClick = (record: any, index: number) => {
    return {
      onClick: () => onRowClick?.(record, index),
      onDoubleClick: () => onRowDoubleClick?.(record, index),
      ...onRow?.(record, index)
    };
  };
  
  // 批量操作菜单
  const batchActionMenu = (
    <Menu>
      {actions?.batchActions?.map(action => {
        if (action.permission && !action.permission.some(p => hasPermission(p))) {
          return null;
        }
        
        return (
          <Menu.Item
            key={action.key}
            icon={action.icon}
            danger={action.danger}
            onClick={() => action.onClick(rowSelection?.selectedRowKeys?.map(key => 
              dataSource.find(item => item.id === key)
            ).filter(Boolean) || [])}
          >
            {action.text}
          </Menu.Item>
        );
      })}
    </Menu>
  );
  
  return (
    <Card>
      {/* 工具栏 */}
      <div className="table-toolbar" style={{ marginBottom: 16 }}>
        <div className="toolbar-left">
          {/* 创建按钮 */}
          {actions?.create && (!actions.create.permission || 
            actions.create.permission.some(p => hasPermission(p))) && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={actions.create.onClick}
            >
              {actions.create.text || '新增'}
            </Button>
          )}
          
          {/* 批量操作 */}
          {rowSelection && rowSelection.selectedRowKeys.length > 0 && actions?.batchActions && (
            <Space>
              <span>已选择 {rowSelection.selectedRowKeys.length} 项</span>
              <Dropdown overlay={batchActionMenu} trigger={['click']}>
                <Button icon={<MoreOutlined />}>
                  批量操作
                </Button>
              </Dropdown>
            </Space>
          )}
        </div>
        
        <div className="toolbar-right">
          <Space>
            {/* 搜索框 */}
            {searchConfig && (
              <Input
                placeholder={searchConfig.placeholder || '搜索...'}
                prefix={<SearchOutlined />}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onPressEnter={() => searchConfig.onSearch(searchValue)}
                style={{ width: 250 }}
              />
            )}
            
            {/* 导出按钮 */}
            {exportConfig && (
              <Button
                icon={<ExportOutlined />}
                onClick={() => exportConfig.onExport?.(dataSource)}
              >
                导出
              </Button>
            )}
          </Space>
        </div>
      </div>
      
      {/* 高级筛选 */}
      {searchConfig?.filters && (
        <div className="table-filters" style={{ marginBottom: 16 }}>
          <Space wrap>
            {searchConfig.filters.map(filter => (
              <div key={filter.key} style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 8 }}>{filter.label}:</span>
                {filter.type === 'select' && (
                  <Select
                    placeholder={`选择${filter.label}`}
                    style={{ width: 150 }}
                    onChange={filter.onChange}
                    allowClear
                  >
                    {filter.options?.map(option => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                )}
                {filter.type === 'dateRange' && (
                  <DatePicker.RangePicker onChange={filter.onChange} />
                )}
                {filter.type === 'input' && (
                  <Input
                    placeholder={`输入${filter.label}`}
                    style={{ width: 150 }}
                    onChange={(e) => filter.onChange(e.target.value)}
                  />
                )}
              </div>
            ))}
          </Space>
        </div>
      )}
      
      {/* 数据表格 */}
      <Table
        dataSource={dataSource}
        columns={visibleColumns}
        loading={loading}
        pagination={pagination}
        rowSelection={rowSelection}
        size={size}
        scroll={scroll}
        onRow={handleRowClick}
        rowKey="id"
      />
    </Card>
  );
};

export default DataTable;
```

### 1.4 使用示例

```tsx
const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  const columns: DataTableColumn<Employee>[] = [
    {
      title: '员工姓名',
      dataIndex: 'full_name',
      sorter: true,
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      filterable: true,
    },
    {
      title: '职务',
      dataIndex: 'position_name',
    },
    {
      title: '入职日期',
      dataIndex: 'hire_date',
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      ),
      permission: ['employee:edit', 'employee:delete']
    }
  ];

  return (
    <DataTable
      dataSource={employees}
      columns={columns}
      loading={loading}
      pagination={{
        ...pagination,
        onChange: (page, pageSize) => {
          setPagination({ ...pagination, current: page, pageSize });
          fetchEmployees(page, pageSize);
        }
      }}
      rowSelection={{
        selectedRowKeys,
        onChange: setSelectedRowKeys
      }}
      actions={{
        create: {
          text: '新增员工',
          onClick: () => navigate('/employees/create'),
          permission: ['employee:create']
        },
        batchActions: [
          {
            key: 'batchDelete',
            text: '批量删除',
            icon: <DeleteOutlined />,
            onClick: handleBatchDelete,
            danger: true,
            permission: ['employee:delete']
          }
        ]
      }}
      searchConfig={{
        placeholder: '搜索员工姓名、工号',
        onSearch: handleSearch,
        filters: [
          {
            key: 'department',
            label: '部门',
            type: 'select',
            options: departmentOptions,
            onChange: handleDepartmentFilter
          },
          {
            key: 'hireDate',
            label: '入职日期',
            type: 'dateRange',
            onChange: handleDateRangeFilter
          }
        ]
      }}
      exportConfig={{
        filename: '员工列表',
        onExport: handleExport
      }}
      onRowDoubleClick={(record) => navigate(`/employees/${record.id}`)}
    />
  );
};
```

---

## 二、树形结构组件 (TreeManager)

### 2.1 组件概述
TreeManager用于管理具有层级关系的数据，如部门结构、分类体系等。

### 2.2 API设计

```typescript
interface TreeNode {
  id: string;
  title: string;
  key: string;
  children?: TreeNode[];
  parentId?: string;
  disabled?: boolean;
  isLeaf?: boolean;
  // 扩展属性
  [key: string]: any;
}

interface TreeManagerProps {
  // 数据
  treeData: TreeNode[];
  loading?: boolean;
  
  // 选择模式
  selectable?: boolean;
  checkable?: boolean;
  multiple?: boolean;
  selectedKeys?: string[];
  checkedKeys?: string[];
  
  // 操作配置
  operations?: {
    create?: {
      text?: string;
      onClick: (parentNode?: TreeNode) => void;
    };
    edit?: {
      onClick: (node: TreeNode) => void;
    };
    delete?: {
      onClick: (node: TreeNode) => void;
    };
    move?: {
      onDrop: (dragNode: TreeNode, dropNode: TreeNode, dropPosition: number) => void;
    };
  };
  
  // 显示配置
  showLine?: boolean;
  showIcon?: boolean;
  showActions?: boolean;
  expandedKeys?: string[];
  autoExpandParent?: boolean;
  
  // 搜索配置
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  
  // 事件回调
  onSelect?: (selectedKeys: string[], selectedNodes: TreeNode[]) => void;
  onCheck?: (checkedKeys: string[], checkedNodes: TreeNode[]) => void;
  onExpand?: (expandedKeys: string[]) => void;
  onRightClick?: (node: TreeNode) => void;
  
  // 自定义渲染
  titleRender?: (node: TreeNode) => React.ReactNode;
  iconRender?: (node: TreeNode) => React.ReactNode;
}
```

### 2.3 实现示例

```tsx
import React, { useState, useMemo } from 'react';
import { Tree, Input, Space, Button, Dropdown, Menu, Modal } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  MoreOutlined,
  FolderOutlined,
  FileOutlined
} from '@ant-design/icons';

const TreeManager: React.FC<TreeManagerProps> = ({
  treeData,
  loading = false,
  selectable = true,
  checkable = false,
  multiple = false,
  selectedKeys = [],
  checkedKeys = [],
  operations,
  showLine = true,
  showIcon = true,
  showActions = true,
  expandedKeys = [],
  autoExpandParent = true,
  searchable = false,
  searchPlaceholder = '搜索节点',
  onSearch,
  onSelect,
  onCheck,
  onExpand,
  onRightClick,
  titleRender,
  iconRender
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [contextMenuNode, setContextMenuNode] = useState<TreeNode | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // 搜索过滤
  const filteredTreeData = useMemo(() => {
    if (!searchValue) return treeData;
    
    const filterTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        const children = node.children ? filterTree(node.children) : [];
        
        if (node.title.toLowerCase().includes(searchValue.toLowerCase()) || children.length > 0) {
          acc.push({
            ...node,
            children: children.length > 0 ? children : undefined
          });
        }
        
        return acc;
      }, []);
    };
    
    return filterTree(treeData);
  }, [treeData, searchValue]);

  // 节点右键菜单
  const handleRightClick = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    setContextMenuNode(node);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);
    onRightClick?.(node);
  };

  // 操作菜单
  const getContextMenu = (node: TreeNode) => (
    <Menu
      onClick={({ key }) => {
        setContextMenuVisible(false);
        
        switch (key) {
          case 'create':
            operations?.create?.onClick(node);
            break;
          case 'edit':
            operations?.edit?.onClick(node);
            break;
          case 'delete':
            Modal.confirm({
              title: '确认删除',
              content: `确定要删除 "${node.title}" 吗？`,
              onOk: () => operations?.delete?.onClick(node)
            });
            break;
        }
      }}
    >
      {operations?.create && (
        <Menu.Item key="create" icon={<PlusOutlined />}>
          新增子节点
        </Menu.Item>
      )}
      {operations?.edit && (
        <Menu.Item key="edit" icon={<EditOutlined />}>
          编辑
        </Menu.Item>
      )}
      {operations?.delete && (
        <Menu.Item key="delete" icon={<DeleteOutlined />} danger>
          删除
        </Menu.Item>
      )}
    </Menu>
  );

  // 自定义标题渲染
  const renderTitle = (node: TreeNode) => {
    if (titleRender) {
      return titleRender(node);
    }

    return (
      <div 
        className="tree-node-title"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        onContextMenu={(e) => handleRightClick(e, node)}
      >
        <span>{node.title}</span>
        {showActions && (
          <div className="tree-node-actions" style={{ opacity: 0.7 }}>
            <Space size="small">
              {operations?.create && (
                <Button 
                  type="text" 
                  size="small" 
                  icon={<PlusOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    operations.create.onClick(node);
                  }}
                />
              )}
              {operations?.edit && (
                <Button 
                  type="text" 
                  size="small" 
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    operations.edit.onClick(node);
                  }}
                />
              )}
              {operations?.delete && (
                <Button 
                  type="text" 
                  size="small" 
                  icon={<DeleteOutlined />}
                  danger
                  onClick={(e) => {
                    e.stopPropagation();
                    Modal.confirm({
                      title: '确认删除',
                      content: `确定要删除 "${node.title}" 吗？`,
                      onOk: () => operations.delete!.onClick(node)
                    });
                  }}
                />
              )}
            </Space>
          </div>
        )}
      </div>
    );
  };

  // 自定义图标渲染
  const renderIcon = (node: TreeNode) => {
    if (iconRender) {
      return iconRender(node);
    }
    
    return node.children && node.children.length > 0 
      ? <FolderOutlined />
      : <FileOutlined />;
  };

  return (
    <div className="tree-manager">
      {/* 工具栏 */}
      <div className="tree-toolbar" style={{ marginBottom: 16 }}>
        <Space>
          {operations?.create && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => operations.create!.onClick()}
            >
              {operations.create.text || '新增根节点'}
            </Button>
          )}
          
          {searchable && (
            <Input
              placeholder={searchPlaceholder}
              prefix={<SearchOutlined />}
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                onSearch?.(e.target.value);
              }}
              style={{ width: 250 }}
            />
          )}
        </Space>
      </div>

      {/* 树形组件 */}
      <Tree
        treeData={filteredTreeData}
        loading={loading}
        selectable={selectable}
        checkable={checkable}
        multiple={multiple}
        selectedKeys={selectedKeys}
        checkedKeys={checkedKeys}
        expandedKeys={expandedKeys}
        autoExpandParent={autoExpandParent}
        showLine={showLine}
        showIcon={showIcon}
        draggable={!!operations?.move}
        onSelect={(keys, info) => {
          onSelect?.(keys as string[], info.selectedNodes as TreeNode[]);
        }}
        onCheck={(keys, info) => {
          onCheck?.(keys as string[], info.checkedNodes as TreeNode[]);
        }}
        onExpand={(keys) => {
          onExpand?.(keys as string[]);
        }}
        onDrop={(info) => {
          if (operations?.move) {
            operations.move.onDrop(
              info.dragNode as TreeNode,
              info.node as TreeNode,
              info.dropPosition
            );
          }
        }}
        titleRender={renderTitle}
        icon={renderIcon}
      />

      {/* 右键菜单 */}
      {contextMenuVisible && contextMenuNode && (
        <div
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            zIndex: 1000
          }}
          onMouseLeave={() => setContextMenuVisible(false)}
        >
          {getContextMenu(contextMenuNode)}
        </div>
      )}
    </div>
  );
};

export default TreeManager;
```

---

## 三、时间轴组件 (TimelineManager)

### 3.1 组件概述
TimelineManager专门用于管理具有时间有效期的数据，如员工职位历史、薪资变更记录等。

### 3.2 API设计

```typescript
interface TimelineItem {
  id: string;
  title: string;
  startDate: string;
  endDate?: string; // null表示当前有效
  content?: React.ReactNode;
  status?: 'past' | 'current' | 'future';
  editable?: boolean;
  data?: any; // 关联的业务数据
}

interface TimelineManagerProps {
  // 数据
  items: TimelineItem[];
  loading?: boolean;
  
  // 显示配置
  mode?: 'left' | 'alternate' | 'right';
  showControls?: boolean;
  showDateLabels?: boolean;
  
  // 操作配置
  operations?: {
    add?: {
      text?: string;
      onClick: () => void;
    };
    edit?: {
      onClick: (item: TimelineItem) => void;
    };
    delete?: {
      onClick: (item: TimelineItem) => void;
    };
  };
  
  // 时间配置
  dateFormat?: string;
  showTime?: boolean;
  
  // 事件回调
  onItemClick?: (item: TimelineItem) => void;
  onDateRangeChange?: (item: TimelineItem, startDate: string, endDate?: string) => void;
  
  // 自定义渲染
  itemRender?: (item: TimelineItem) => React.ReactNode;
  dotRender?: (item: TimelineItem) => React.ReactNode;
}
```

### 3.3 实现示例

```tsx
import React, { useMemo } from 'react';
import { Timeline, Card, Space, Button, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const TimelineManager: React.FC<TimelineManagerProps> = ({
  items,
  loading = false,
  mode = 'left',
  showControls = true,
  showDateLabels = true,
  operations,
  dateFormat = 'YYYY-MM-DD',
  showTime = false,
  onItemClick,
  onDateRangeChange,
  itemRender,
  dotRender
}) => {
  // 按时间排序并添加状态
  const sortedItems = useMemo(() => {
    const now = dayjs();
    
    return items
      .map(item => ({
        ...item,
        status: item.endDate 
          ? (dayjs(item.endDate).isBefore(now) ? 'past' : 'future')
          : (dayjs(item.startDate).isAfter(now) ? 'future' : 'current') as 'past' | 'current' | 'future'
      }))
      .sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf());
  }, [items]);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colorMap = {
      past: 'gray',
      current: 'blue', 
      future: 'green'
    };
    return colorMap[status] || 'gray';
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const textMap = {
      past: '已结束',
      current: '当前',
      future: '计划中'
    };
    return textMap[status] || '';
  };

  // 自定义点渲染
  const renderDot = (item: TimelineItem) => {
    if (dotRender) {
      return dotRender(item);
    }

    const color = getStatusColor(item.status!);
    const icon = item.status === 'current' ? <ClockCircleOutlined /> : undefined;
    
    return (
      <div 
        style={{ 
          width: 12, 
          height: 12, 
          borderRadius: '50%', 
          backgroundColor: color,
          border: `2px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {icon}
      </div>
    );
  };

  // 自定义项目渲染
  const renderItem = (item: TimelineItem) => {
    if (itemRender) {
      return itemRender(item);
    }

    const formatDate = (date: string) => {
      const format = showTime ? `${dateFormat} HH:mm` : dateFormat;
      return dayjs(date).format(format);
    };

    return (
      <Card 
        size="small"
        className={`timeline-item timeline-item-${item.status}`}
        onClick={() => onItemClick?.(item)}
        style={{ 
          cursor: onItemClick ? 'pointer' : 'default',
          opacity: item.status === 'past' ? 0.7 : 1
        }}
      >
        <div className="timeline-item-header">
          <div className="timeline-item-title">
            <Space>
              <span style={{ fontWeight: 'bold' }}>{item.title}</span>
              <Tag color={getStatusColor(item.status!)}>
                {getStatusText(item.status!)}
              </Tag>
              {item.status === 'current' && (
                <Tag color="processing" icon={<ClockCircleOutlined />}>
                  进行中
                </Tag>
              )}
            </Space>
          </div>
          
          {showControls && (
            <div className="timeline-item-actions">
              <Space size="small">
                {operations?.edit && item.editable !== false && (
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      operations.edit!.onClick(item);
                    }}
                  />
                )}
                {operations?.delete && item.editable !== false && (
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={(e) => {
                      e.stopPropagation();
                      operations.delete!.onClick(item);
                    }}
                  />
                )}
              </Space>
            </div>
          )}
        </div>

        {showDateLabels && (
          <div className="timeline-item-dates" style={{ color: '#666', fontSize: '12px', marginTop: 8 }}>
            <Space split={<span>→</span>}>
              <span>{formatDate(item.startDate)}</span>
              <span>{item.endDate ? formatDate(item.endDate) : '至今'}</span>
            </Space>
          </div>
        )}

        {item.content && (
          <div className="timeline-item-content" style={{ marginTop: 8 }}>
            {item.content}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="timeline-manager">
      {/* 工具栏 */}
      {showControls && operations?.add && (
        <div className="timeline-toolbar" style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={operations.add.onClick}
          >
            {operations.add.text || '新增记录'}
          </Button>
        </div>
      )}

      {/* 时间轴 */}
      <Timeline mode={mode}>
        {sortedItems.map(item => (
          <Timeline.Item
            key={item.id}
            dot={renderDot(item)}
            color={getStatusColor(item.status!)}
          >
            {renderItem(item)}
          </Timeline.Item>
        ))}
      </Timeline>

      {/* 空状态 */}
      {sortedItems.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          暂无记录
        </div>
      )}
    </div>
  );
};

export default TimelineManager;
```

---

## 四、权限矩阵组件 (PermissionMatrix)

### 4.1 组件概述
PermissionMatrix用于管理复杂的权限配置，以矩阵形式展示和编辑权限关系。

### 4.2 API设计

```typescript
interface PermissionItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  level?: number;
}

interface PermissionAssignment {
  roleId: string;
  permissionId: string;
  granted: boolean;
  inherited?: boolean; // 是否继承自上级角色
}

interface PermissionMatrixProps {
  // 数据
  roles: RoleItem[];
  permissions: PermissionItem[];
  assignments: PermissionAssignment[];
  loading?: boolean;
  
  // 显示配置
  showCategories?: boolean;
  showInheritance?: boolean;
  showBatchActions?: boolean;
  
  // 操作配置
  onChange?: (assignments: PermissionAssignment[]) => void;
  onBatchAssign?: (roleIds: string[], permissionIds: string[], granted: boolean) => void;
  
  // 权限继承配置
  inheritanceRules?: {
    [roleId: string]: string[]; // 角色ID -> 继承自的角色ID列表
  };
  
  // 自定义渲染
  cellRender?: (
    role: RoleItem, 
    permission: PermissionItem, 
    assignment: PermissionAssignment | undefined
  ) => React.ReactNode;
}
```

### 4.3 实现示例

```tsx
import React, { useState, useMemo } from 'react';
import { Table, Checkbox, Button, Space, Select, Popover, Tag, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, InheritedIcon } from '@ant-design/icons';

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  roles,
  permissions,
  assignments,
  loading = false,
  showCategories = true,
  showInheritance = true,
  showBatchActions = true,
  onChange,
  onBatchAssign,
  inheritanceRules = {},
  cellRender
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // 权限分组
  const permissionGroups = useMemo(() => {
    if (!showCategories) return { '': permissions };
    
    return permissions.reduce((groups, permission) => {
      const category = permission.category || '其他';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(permission);
      return groups;
    }, {} as Record<string, PermissionItem[]>);
  }, [permissions, showCategories]);

  // 权限分配映射
  const assignmentMap = useMemo(() => {
    return assignments.reduce((map, assignment) => {
      const key = `${assignment.roleId}-${assignment.permissionId}`;
      map[key] = assignment;
      return map;
    }, {} as Record<string, PermissionAssignment>);
  }, [assignments]);

  // 检查权限是否被授予（包括继承）
  const isPermissionGranted = (roleId: string, permissionId: string) => {
    const key = `${roleId}-${permissionId}`;
    const assignment = assignmentMap[key];
    
    if (assignment) {
      return assignment.granted;
    }
    
    // 检查继承权限
    if (showInheritance && inheritanceRules[roleId]) {
      for (const parentRoleId of inheritanceRules[roleId]) {
        if (isPermissionGranted(parentRoleId, permissionId)) {
          return true;
        }
      }
    }
    
    return false;
  };

  // 检查权限是否继承
  const isPermissionInherited = (roleId: string, permissionId: string) => {
    const key = `${roleId}-${permissionId}`;
    const assignment = assignmentMap[key];
    
    if (assignment && assignment.granted) {
      return false; // 直接授予，非继承
    }
    
    if (showInheritance && inheritanceRules[roleId]) {
      for (const parentRoleId of inheritanceRules[roleId]) {
        if (isPermissionGranted(parentRoleId, permissionId)) {
          return true; // 继承权限
        }
      }
    }
    
    return false;
  };

  // 切换权限状态
  const togglePermission = (roleId: string, permissionId: string) => {
    const key = `${roleId}-${permissionId}`;
    const currentAssignment = assignmentMap[key];
    const currentGranted = currentAssignment?.granted || false;
    
    const newAssignments = assignments.filter(a => 
      !(a.roleId === roleId && a.permissionId === permissionId)
    );
    
    newAssignments.push({
      roleId,
      permissionId,
      granted: !currentGranted,
      inherited: false
    });
    
    onChange?.(newAssignments);
  };

  // 批量分配权限
  const handleBatchAssign = (granted: boolean) => {
    if (selectedRoles.length === 0 || selectedPermissions.length === 0) {
      return;
    }
    
    onBatchAssign?.(selectedRoles, selectedPermissions, granted);
  };

  // 渲染权限单元格
  const renderPermissionCell = (role: RoleItem, permission: PermissionItem) => {
    if (cellRender) {
      const key = `${role.id}-${permission.id}`;
      return cellRender(role, permission, assignmentMap[key]);
    }

    const granted = isPermissionGranted(role.id, permission.id);
    const inherited = isPermissionInherited(role.id, permission.id);
    
    const cellContent = (
      <div 
        className="permission-cell"
        style={{ 
          textAlign: 'center', 
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: granted ? (inherited ? '#e6f7ff' : '#f6ffed') : 'transparent'
        }}
        onClick={() => !inherited && togglePermission(role.id, permission.id)}
      >
        {granted ? (
          inherited ? (
            <Tooltip title="继承权限">
              <Tag color="blue" size="small">继承</Tag>
            </Tooltip>
          ) : (
            <CheckOutlined style={{ color: '#52c41a' }} />
          )
        ) : (
          <CloseOutlined style={{ color: '#ff4d4f', opacity: 0.3 }} />
        )}
      </div>
    );

    if (inherited) {
      const parentRoles = inheritanceRules[role.id] || [];
      const parentRoleNames = parentRoles
        .map(pid => roles.find(r => r.id === pid)?.name)
        .filter(Boolean)
        .join(', ');
      
      return (
        <Popover 
          content={`继承自角色: ${parentRoleNames}`}
          title="权限继承"
        >
          {cellContent}
        </Popover>
      );
    }

    return cellContent;
  };

  // 表格列配置
  const columns = [
    {
      title: '权限',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left' as const,
      render: (name: string, permission: PermissionItem) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{name}</div>
          {permission.description && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {permission.description}
            </div>
          )}
        </div>
      ),
    },
    ...roles.map(role => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <Checkbox
            checked={selectedRoles.includes(role.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRoles([...selectedRoles, role.id]);
              } else {
                setSelectedRoles(selectedRoles.filter(id => id !== role.id));
              }
            }}
          />
          <div style={{ marginTop: 4 }}>
            <div style={{ fontWeight: 'bold' }}>{role.name}</div>
            {role.description && (
              <div style={{ fontSize: '11px', color: '#666' }}>
                {role.description}
              </div>
            )}
          </div>
        </div>
      ),
      dataIndex: role.id,
      key: role.id,
      width: 120,
      align: 'center' as const,
      render: (_: any, permission: PermissionItem) => 
        renderPermissionCell(role, permission),
    })),
  ];

  // 构建表格数据
  const tableData = Object.entries(permissionGroups).flatMap(([category, perms]) => {
    const data = perms.map(permission => ({
      ...permission,
      key: permission.id,
      category,
    }));
    
    // 添加分类标题行
    if (showCategories && category) {
      data.unshift({
        id: `category-${category}`,
        name: category,
        key: `category-${category}`,
        category,
        isCategory: true,
      } as any);
    }
    
    return data;
  });

  return (
    <div className="permission-matrix">
      {/* 批量操作工具栏 */}
      {showBatchActions && (
        <div className="batch-actions" style={{ marginBottom: 16 }}>
          <Space>
            <span>权限选择:</span>
            <Checkbox
              indeterminate={selectedPermissions.length > 0 && selectedPermissions.length < permissions.length}
              checked={selectedPermissions.length === permissions.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedPermissions(permissions.map(p => p.id));
                } else {
                  setSelectedPermissions([]);
                }
              }}
            >
              全选权限
            </Checkbox>
            
            <span style={{ marginLeft: 16 }}>角色选择:</span>
            <Checkbox
              indeterminate={selectedRoles.length > 0 && selectedRoles.length < roles.length}
              checked={selectedRoles.length === roles.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRoles(roles.map(r => r.id));
                } else {
                  setSelectedRoles([]);
                }
              }}
            >
              全选角色
            </Checkbox>
            
            <Button
              type="primary"
              size="small"
              disabled={selectedRoles.length === 0 || selectedPermissions.length === 0}
              onClick={() => handleBatchAssign(true)}
            >
              批量授权
            </Button>
            
            <Button
              size="small"
              disabled={selectedRoles.length === 0 || selectedPermissions.length === 0}
              onClick={() => handleBatchAssign(false)}
            >
              批量取消
            </Button>
          </Space>
        </div>
      )}

      {/* 权限矩阵表格 */}
      <Table
        columns={columns}
        dataSource={tableData}
        loading={loading}
        pagination={false}
        scroll={{ x: 200 + roles.length * 120, y: 600 }}
        size="small"
        rowClassName={(record: any) => 
          record.isCategory ? 'permission-category-row' : 'permission-row'
        }
        rowSelection={{
          selectedRowKeys: selectedPermissions,
          onChange: (keys) => setSelectedPermissions(keys as string[]),
          getCheckboxProps: (record: any) => ({
            disabled: record.isCategory,
          }),
        }}
      />
    </div>
  );
};

export default PermissionMatrix;
```

---

## 五、批量导入组件 (BatchImport)

### 5.1 组件概述
BatchImport用于处理Excel文件批量导入，提供数据预览、验证和导入功能。

### 5.2 API设计

```typescript
interface ImportColumn {
  key: string;
  title: string;
  required?: boolean;
  validator?: (value: any) => string | null; // 返回错误信息或null
  transform?: (value: any) => any; // 数据转换
}

interface ImportError {
  row: number;
  column: string;
  message: string;
}

interface BatchImportProps {
  // 配置
  columns: ImportColumn[];
  templateUrl?: string; // 模板下载链接
  maxFileSize?: number; // 最大文件大小(MB)
  allowedExtensions?: string[]; // 允许的文件扩展名
  
  // 数据处理
  onImport: (data: any[], errors: ImportError[]) => Promise<void>;
  onPreview?: (data: any[]) => void;
  
  // UI配置
  title?: string;
  description?: string;
  showPreview?: boolean;
  showProgress?: boolean;
  
  // 验证配置
  skipEmptyRows?: boolean;
  maxRows?: number;
  
  // 回调
  onSuccess?: (importedCount: number) => void;
  onError?: (errors: ImportError[]) => void;
}
```

### 5.3 实现示例

```tsx
import React, { useState } from 'react';
import { Upload, Button, Table, Alert, Progress, Modal, Steps, Space } from 'antd';
import { InboxOutlined, DownloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const BatchImport: React.FC<BatchImportProps> = ({
  columns,
  templateUrl,
  maxFileSize = 10,
  allowedExtensions = ['.xlsx', '.xls'],
  onImport,
  onPreview,
  title = '批量导入数据',
  description,
  showPreview = true,
  showProgress = true,
  skipEmptyRows = true,
  maxRows = 1000,
  onSuccess,
  onError
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileData, setFileData] = useState<any[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  // 文件上传处理
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // 解析数据
        const [headers, ...rows] = jsonData as any[][];
        const parsedData = rows
          .filter(row => {
            if (skipEmptyRows) {
              return row.some(cell => cell !== undefined && cell !== null && cell !== '');
            }
            return true;
          })
          .slice(0, maxRows)
          .map((row, index) => {
            const rowData: any = { __rowIndex: index + 2 }; // Excel行号(从2开始，因为第一行是标题)
            headers.forEach((header, colIndex) => {
              const column = columns.find(col => col.title === header);
              if (column) {
                let value = row[colIndex];
                if (column.transform) {
                  value = column.transform(value);
                }
                rowData[column.key] = value;
              }
            });
            return rowData;
          });

        // 验证数据
        const validationErrors: ImportError[] = [];
        parsedData.forEach((row, index) => {
          columns.forEach(column => {
            const value = row[column.key];
            
            // 必填验证
            if (column.required && (value === undefined || value === null || value === '')) {
              validationErrors.push({
                row: row.__rowIndex,
                column: column.key,
                message: `${column.title}不能为空`
              });
            }
            
            // 自定义验证
            if (column.validator && value !== undefined && value !== null && value !== '') {
              const error = column.validator(value);
              if (error) {
                validationErrors.push({
                  row: row.__rowIndex,
                  column: column.key,
                  message: error
                });
              }
            }
          });
        });

        setFileData(parsedData);
        setErrors(validationErrors);
        setCurrentStep(1);
        onPreview?.(parsedData);
        
      } catch (error) {
        Modal.error({
          title: '文件解析失败',
          content: '请确保文件格式正确且包含有效数据'
        });
      }
    };
    
    reader.readAsArrayBuffer(file);
    return false; // 阻止默认上传行为
  };

  // 执行导入
  const handleImport = async () => {
    if (errors.length > 0) {
      Modal.error({
        title: '数据验证失败',
        content: '请修复所有数据错误后再进行导入'
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setCurrentStep(2);

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      await onImport(fileData, errors);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      const successCount = fileData.length - errors.length;
      setImportResult({
        success: successCount,
        failed: errors.length
      });
      
      setCurrentStep(3);
      onSuccess?.(successCount);
      
    } catch (error) {
      Modal.error({
        title: '导入失败',
        content: error instanceof Error ? error.message : '导入过程中发生错误'
      });
      onError?.(errors);
    } finally {
      setImporting(false);
    }
  };

  // 重置状态
  const handleReset = () => {
    setCurrentStep(0);
    setFileData([]);
    setErrors([]);
    setImporting(false);
    setImportProgress(0);
    setImportResult(null);
  };

  // 表格列配置（预览）
  const previewColumns = [
    {
      title: '行号',
      dataIndex: '__rowIndex',
      width: 60,
      render: (rowIndex: number, record: any, index: number) => {
        const hasError = errors.some(error => error.row === rowIndex);
        return (
          <span style={{ color: hasError ? '#ff4d4f' : 'inherit' }}>
            {rowIndex}
          </span>
        );
      }
    },
    ...columns.map(col => ({
      title: col.title,
      dataIndex: col.key,
      render: (value: any, record: any) => {
        const error = errors.find(e => e.row === record.__rowIndex && e.column === col.key);
        return (
          <div>
            <span style={{ color: error ? '#ff4d4f' : 'inherit' }}>
              {value?.toString() || '-'}
            </span>
            {error && (
              <div style={{ fontSize: '12px', color: '#ff4d4f', marginTop: 2 }}>
                {error.message}
              </div>
            )}
          </div>
        );
      }
    }))
  ];

  const steps = [
    {
      title: '上传文件',
      content: (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Upload.Dragger
            accept={allowedExtensions.join(',')}
            beforeUpload={handleFileUpload}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 {allowedExtensions.join(', ')} 格式，文件大小不超过 {maxFileSize}MB
            </p>
          </Upload.Dragger>
          
          {templateUrl && (
            <div style={{ marginTop: 16 }}>
              <Button 
                icon={<DownloadOutlined />}
                onClick={() => window.open(templateUrl)}
              >
                下载导入模板
              </Button>
            </div>
          )}
        </div>
      )
    },
    {
      title: '数据预览',
      content: (
        <div>
          {errors.length > 0 && (
            <Alert
              type="warning"
              message={`发现 ${errors.length} 个数据错误`}
              description="请修复标红的数据后再进行导入"
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}
          
          <div style={{ marginBottom: 16 }}>
            <Space>
              <span>数据行数: {fileData.length}</span>
              <span>错误数: {errors.length}</span>
              <span>有效数据: {fileData.length - errors.length}</span>
            </Space>
          </div>
          
          {showPreview && (
            <Table
              columns={previewColumns}
              dataSource={fileData}
              rowKey="__rowIndex"
              pagination={{ pageSize: 20 }}
              scroll={{ x: 800 }}
              size="small"
            />
          )}
        </div>
      )
    },
    {
      title: '导入进度',
      content: (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Progress
            type="circle"
            percent={importProgress}
            status={importing ? 'active' : 'success'}
          />
          <div style={{ marginTop: 16 }}>
            {importing ? '正在导入数据...' : '导入完成'}
          </div>
        </div>
      )
    },
    {
      title: '导入结果',
      content: (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 18, marginBottom: 16 }}>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            导入完成
          </div>
          
          {importResult && (
            <div>
              <p>成功导入: {importResult.success} 条</p>
              {importResult.failed > 0 && (
                <p style={{ color: '#ff4d4f' }}>
                  失败: {importResult.failed} 条
                </p>
              )}
            </div>
          )}
          
          <Space style={{ marginTop: 24 }}>
            <Button type="primary" onClick={handleReset}>
              继续导入
            </Button>
          </Space>
        </div>
      )
    }
  ];

  return (
    <Modal
      title={title}
      open={true}
      width={800}
      footer={null}
      onCancel={handleReset}
    >
      {description && (
        <Alert
          type="info"
          message={description}
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map(step => (
          <Steps.Step key={step.title} title={step.title} />
        ))}
      </Steps>
      
      <div style={{ minHeight: 300 }}>
        {steps[currentStep].content}
      </div>
      
      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <Space>
          {currentStep > 0 && currentStep < 3 && (
            <Button onClick={() => setCurrentStep(currentStep - 1)}>
              上一步
            </Button>
          )}
          
          {currentStep === 1 && (
            <Button
              type="primary"
              onClick={handleImport}
              disabled={fileData.length === 0 || errors.length > 0}
              loading={importing}
            >
              开始导入
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default BatchImport;
```

---

## 六、审计日志组件 (AuditLog)

### 6.1 组件概述
AuditLog用于展示系统操作日志，提供详细的审计追踪功能。

### 6.2 API设计

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  result: 'success' | 'failed' | 'warning';
}

interface AuditLogProps {
  // 数据
  logs: AuditLogEntry[];
  loading?: boolean;
  
  // 分页
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  
  // 筛选配置
  filters?: {
    users?: { label: string; value: string }[];
    actions?: { label: string; value: string }[];
    resources?: { label: string; value: string }[];
    dateRange?: boolean;
  };
  
  // 显示配置
  showDetails?: boolean;
  showUserAgent?: boolean;
  showIpAddress?: boolean;
  
  // 事件回调
  onFilterChange?: (filters: any) => void;
  onExport?: () => void;
  
  // 自定义渲染
  actionRender?: (action: string, entry: AuditLogEntry) => React.ReactNode;
  detailsRender?: (details: any, entry: AuditLogEntry) => React.ReactNode;
}
```

### 6.3 实现示例

```tsx
import React, { useState } from 'react';
import { Table, Tag, Space, Button, Select, DatePicker, Drawer, Descriptions, Typography } from 'antd';
import { ExportOutlined, EyeOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const AuditLog: React.FC<AuditLogProps> = ({
  logs,
  loading = false,
  pagination,
  filters,
  showDetails = true,
  showUserAgent = false,
  showIpAddress = true,
  onFilterChange,
  onExport,
  actionRender,
  detailsRender
}) => {
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<any>({});

  // 获取结果标签颜色
  const getResultColor = (result: string) => {
    const colorMap = {
      success: 'success',
      failed: 'error',
      warning: 'warning'
    };
    return colorMap[result] || 'default';
  };

  // 获取结果标签文本
  const getResultText = (result: string) => {
    const textMap = {
      success: '成功',
      failed: '失败', 
      warning: '警告'
    };
    return textMap[result] || result;
  };

  // 处理筛选变更
  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...currentFilters, [key]: value };
    setCurrentFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  // 显示详情
  const showLogDetails = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setDetailsVisible(true);
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      width: 160,
      render: (timestamp: string) => dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss'),
      sorter: true,
    },
    {
      title: '用户',
      dataIndex: 'username',
      width: 120,
      render: (username: string, record: AuditLogEntry) => (
        <Space>
          <UserOutlined />
          <span>{username}</span>
        </Space>
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 120,
      render: (action: string, record: AuditLogEntry) => {
        if (actionRender) {
          return actionRender(action, record);
        }
        return <Text code>{action}</Text>;
      },
    },
    {
      title: '资源',
      dataIndex: 'resource',
      width: 120,
      render: (resource: string, record: AuditLogEntry) => (
        <span>
          {resource}
          {record.resourceId && (
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 4 }}>
              #{record.resourceId}
            </Text>
          )}
        </span>
      ),
    },
    {
      title: '结果',
      dataIndex: 'result',
      width: 80,
      render: (result: string) => (
        <Tag color={getResultColor(result)}>
          {getResultText(result)}
        </Tag>
      ),
    },
    ...(showIpAddress ? [{
      title: 'IP地址',
      dataIndex: 'ipAddress',
      width: 120,
    }] : []),
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_: any, record: AuditLogEntry) => (
        showDetails && (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showLogDetails(record)}
          >
            详情
          </Button>
        )
      ),
    },
  ];

  return (
    <div className="audit-log">
      {/* 筛选工具栏 */}
      <div className="audit-log-filters" style={{ marginBottom: 16 }}>
        <Space wrap>
          {filters?.users && (
            <div>
              <span style={{ marginRight: 8 }}>用户:</span>
              <Select
                placeholder="选择用户"
                style={{ width: 150 }}
                allowClear
                onChange={(value) => handleFilterChange('userId', value)}
              >
                {filters.users.map(user => (
                  <Select.Option key={user.value} value={user.value}>
                    {user.label}
                  </Select.Option>
                ))}
              </Select>
            </div>
          )}
          
          {filters?.actions && (
            <div>
              <span style={{ marginRight: 8 }}>操作:</span>
              <Select
                placeholder="选择操作"
                style={{ width: 150 }}
                allowClear
                onChange={(value) => handleFilterChange('action', value)}
              >
                {filters.actions.map(action => (
                  <Select.Option key={action.value} value={action.value}>
                    {action.label}
                  </Select.Option>
                ))}
              </Select>
            </div>
          )}
          
          {filters?.resources && (
            <div>
              <span style={{ marginRight: 8 }}>资源:</span>
              <Select
                placeholder="选择资源"
                style={{ width: 150 }}
                allowClear
                onChange={(value) => handleFilterChange('resource', value)}
              >
                {filters.resources.map(resource => (
                  <Select.Option key={resource.value} value={resource.value}>
                    {resource.label}
                  </Select.Option>
                ))}
              </Select>
            </div>
          )}
          
          {filters?.dateRange && (
            <div>
              <span style={{ marginRight: 8 }}>时间范围:</span>
              <RangePicker
                showTime
                onChange={(dates) => handleFilterChange('dateRange', dates)}
              />
            </div>
          )}
          
          {onExport && (
            <Button
              icon={<ExportOutlined />}
              onClick={onExport}
            >
              导出日志
            </Button>
          )}
        </Space>
      </div>

      {/* 日志表格 */}
      <Table
        columns={columns}
        dataSource={logs}
        loading={loading}
        pagination={pagination}
        rowKey="id"
        size="small"
      />

      {/* 详情抽屉 */}
      <Drawer
        title="操作详情"
        width={600}
        open={detailsVisible}
        onClose={() => setDetailsVisible(false)}
      >
        {selectedEntry && (
          <div>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="操作时间">
                <Space>
                  <ClockCircleOutlined />
                  {dayjs(selectedEntry.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="操作用户">
                <Space>
                  <UserOutlined />
                  {selectedEntry.username} (ID: {selectedEntry.userId})
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="操作类型">
                <Text code>{selectedEntry.action}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="操作资源">
                {selectedEntry.resource}
                {selectedEntry.resourceId && ` (ID: ${selectedEntry.resourceId})`}
              </Descriptions.Item>
              
              <Descriptions.Item label="操作结果">
                <Tag color={getResultColor(selectedEntry.result)}>
                  {getResultText(selectedEntry.result)}
                </Tag>
              </Descriptions.Item>
              
              {selectedEntry.ipAddress && (
                <Descriptions.Item label="IP地址">
                  {selectedEntry.ipAddress}
                </Descriptions.Item>
              )}
              
              {showUserAgent && selectedEntry.userAgent && (
                <Descriptions.Item label="用户代理">
                  <Text style={{ fontSize: '12px' }}>
                    {selectedEntry.userAgent}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 详细信息 */}
            {selectedEntry.details && (
              <div style={{ marginTop: 16 }}>
                <h4>操作详情</h4>
                {detailsRender ? (
                  detailsRender(selectedEntry.details, selectedEntry)
                ) : (
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: 12, 
                    borderRadius: 4,
                    overflow: 'auto',
                    fontSize: '12px'
                  }}>
                    {JSON.stringify(selectedEntry.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AuditLog;
```

---

## 使用指南

### 组件引入方式

```typescript
// 统一导出文件 src/components/common/index.ts
export { default as DataTable } from './DataTable';
export { default as TreeManager } from './TreeManager';
export { default as TimelineManager } from './TimelineManager';
export { default as PermissionMatrix } from './PermissionMatrix';
export { default as BatchImport } from './BatchImport';
export { default as AuditLog } from './AuditLog';

// 使用方式
import { DataTable, TreeManager } from '@/components/common';
```

### 样式定制

```scss
// 组件样式文件 src/components/common/styles.scss
.tree-manager {
  .tree-node-title {
    &:hover .tree-node-actions {
      opacity: 1;
    }
  }
  
  .tree-node-actions {
    transition: opacity 0.2s;
  }
}

.permission-matrix {
  .permission-cell {
    transition: background-color 0.2s;
    
    &:hover {
      background-color: #f0f0f0;
    }
  }
}

.timeline-manager {
  .timeline-item {
    &-past {
      opacity: 0.7;
    }
    
    &-current {
      border-left: 3px solid #1890ff;
    }
    
    &-future {
      border-left: 3px solid #52c41a;
    }
  }
}
```

### TypeScript类型定义

```typescript
// 类型定义文件 src/types/components.ts
export * from '../components/common/DataTable/types';
export * from '../components/common/TreeManager/types';
export * from '../components/common/TimelineManager/types';
export * from '../components/common/PermissionMatrix/types';
export * from '../components/common/BatchImport/types';
export * from '../components/common/AuditLog/types';
```

---

**文档版本**: v1.0  
**创建日期**: 2025-01-24  
**更新日期**: 2025-01-24  
**关联文档**: frontend_page_requirements.md, frontend_interaction_guidelines.md