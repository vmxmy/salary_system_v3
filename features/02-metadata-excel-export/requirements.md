# 元数据Excel导出

## 功能概述
实现薪资元数据导出为Excel文件的功能，支持HR管理员导出指定月份的完整工资数据。导出的Excel文件可以作为数据备份、离线编辑或批量导入的模板使用。

## 业务背景

### 使用场景
1. **数据备份**：月度工资数据存档
2. **离线编辑**：导出后在Excel中批量修改，再导入系统
3. **数据迁移**：从历史月份复制数据到新月份
4. **数据审核**：导出给财务或管理层审核
5. **模板生成**：为新月份生成标准模板

### 业务价值
- 提供灵活的数据处理方式
- 支持离线工作场景
- 便于数据共享和审核
- 简化批量数据操作流程

## 功能需求

### 1. 导出触发
#### 1.1 触发方式
- **位置**：元数据管理页面工具栏
- **按钮文案**：`📥 导出Excel`
- **权限控制**：仅HR管理员可见

#### 1.2 导出选项
- **默认行为**：导出当前选中月份的所有数据
- **空数据处理**：
  - 如果当月无数据，生成包含所有员工的空模板
  - 提示用户："当月暂无数据，将生成空模板"

### 2. Excel文件结构

#### 2.1 文件格式
- **格式**：.xlsx (Excel 2007+)
- **编码**：UTF-8
- **命名规范**：`薪资元数据_YYYY年MM月_导出时间戳.xlsx`
  - 示例：`薪资元数据_2025年01月_20250108143025.xlsx`

#### 2.2 工作表设计
**单一工作表名称**：`薪资数据`

#### 2.3 表头结构
```
第1行：大类标题行
├─ 员工信息 (合并A1:F1)
├─ 收入明细 (合并G1:动态结束列)
├─ 缴费基数 (合并下一列开始:+8列)
└─ 个人所得税 (单独一列)

第2行：具体字段名
├─ 员工信息：工号|姓名|身份证号|部门|职位|人员类别
├─ 收入明细：[动态earning字段]
├─ 缴费基数：养老|医疗|失业|工伤|生育|公积金|职业年金|大病医疗
└─ 个人所得税：个税金额

第3行开始：数据行
```

#### 2.4 列定义详情

**固定列 - 员工信息（A-F列）**：
| 列标 | 字段名 | 数据来源 | 格式要求 |
|------|--------|----------|----------|
| A | 工号 | employees.employee_code | 文本，必填 |
| B | 姓名 | employees.name | 文本，必填 |
| C | 身份证号 | employees.id_number | 文本，18位 |
| D | 部门 | departments.name | 文本，必填 |
| E | 职位 | positions.name | 文本，必填 |
| F | 人员类别 | personnel_categories.name | 文本，必填 |

**动态列 - 收入明细（G列开始）**：
- 基于 `salary_components` 表中 `type='earning'` 的所有记录
- 按 `name` 字段排序
- 每个组件占用一列
- 数据格式：数值，保留2位小数
- 空值显示为0.00

**固定列 - 缴费基数（收入明细后）**：
| 字段名 | system_key | 数据来源 | 格式要求 |
|--------|------------|----------|----------|
| 养老保险 | pension | employee_contribution_bases | 数值 |
| 医疗保险 | medical | employee_contribution_bases | 数值 |
| 失业保险 | unemployment | employee_contribution_bases | 数值 |
| 工伤保险 | work_injury | employee_contribution_bases | 数值 |
| 生育保险 | maternity | employee_contribution_bases | 数值 |
| 公积金 | housing_fund | employee_contribution_bases | 数值 |
| 职业年金 | occupational_pension | employee_contribution_bases | 数值 |
| 大病医疗 | serious_illness | employee_contribution_bases | 数值 |

**固定列 - 个人所得税（最后一列）**：
- 字段名：个税金额
- 数据来源：payroll_items（特定的个税component）
- 格式：数值，保留2位小数

### 3. 数据查询逻辑

```sql
-- 主查询：获取员工和工资主记录
WITH target_period AS (
  SELECT 
    DATE_TRUNC('month', '2025-01-01'::date) as period_start,
    DATE_TRUNC('month', '2025-01-01'::date) + INTERVAL '1 month' - INTERVAL '1 day' as period_end
),
active_employees AS (
  SELECT DISTINCT
    e.id,
    e.employee_code,
    e.name,
    e.id_number,
    d.name as department_name,
    p.name as position_name,
    pc.name as category_name
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  LEFT JOIN positions p ON e.position_id = p.id
  LEFT JOIN personnel_categories pc ON e.personnel_category_id = pc.id
  WHERE e.status = 'active'
),
-- 获取收入明细
earnings_data AS (
  SELECT 
    p.employee_id,
    sc.name as component_name,
    pi.amount
  FROM payrolls p
  JOIN payroll_items pi ON p.id = pi.payroll_id
  JOIN salary_components sc ON pi.component_id = sc.id
  CROSS JOIN target_period tp
  WHERE p.pay_period_start = tp.period_start
    AND sc.type = 'earning'
),
-- 获取缴费基数
contribution_bases AS (
  SELECT 
    ecb.employee_id,
    it.system_key,
    ecb.contribution_base
  FROM employee_contribution_bases ecb
  JOIN insurance_types it ON ecb.insurance_type_id = it.id
  CROSS JOIN target_period tp
  WHERE tp.period_start BETWEEN ecb.effective_start_date 
    AND COALESCE(ecb.effective_end_date, '9999-12-31')
)
-- 组装最终数据
SELECT * FROM active_employees
LEFT JOIN earnings_data ON ...
LEFT JOIN contribution_bases ON ...
```

### 4. Excel样式设置

#### 4.1 表头样式
- **第1行（大类标题）**：
  - 背景色：#E8F4FD（浅蓝色）
  - 字体：14号，加粗
  - 对齐：居中
  - 边框：所有边框

- **第2行（字段名）**：
  - 背景色：#F5F5F5（浅灰色）
  - 字体：12号，加粗
  - 对齐：居中
  - 边框：所有边框
  - 行高：25

#### 4.2 数据行样式
- **字体**：11号，常规
- **数值格式**：
  - 金额列：`#,##0.00`（千分位，2位小数）
  - 身份证列：文本格式（防止科学计数法）
- **边框**：细边框
- **行高**：20
- **冻结窗格**：冻结前2行和前2列（工号、姓名）

#### 4.3 列宽设置
- 工号：12
- 姓名：10
- 身份证号：20
- 部门：15
- 职位：15
- 人员类别：12
- 金额列：12
- 个税：12

### 5. 导出流程

#### 5.1 导出步骤
1. **用户点击导出按钮**
2. **显示导出确认对话框**：
   - 显示将导出的月份
   - 显示预计导出数据条数
   - 确认/取消按钮
3. **开始导出**：
   - 显示进度条或加载动画
   - 禁用导出按钮
4. **数据查询**：
   - 批量查询数据（分页查询避免内存溢出）
5. **生成Excel**：
   - 创建工作簿
   - 写入表头
   - 批量写入数据
   - 应用样式
6. **文件下载**：
   - 触发浏览器下载
   - 显示成功提示
7. **清理**：
   - 释放内存
   - 恢复按钮状态

#### 5.2 进度提示
```typescript
interface ExportProgress {
  status: 'preparing' | 'querying' | 'generating' | 'complete' | 'error';
  current: number;  // 当前处理数
  total: number;    // 总数
  message: string;  // 提示信息
}
```

### 6. 性能优化

#### 6.1 大数据量处理
- **分批查询**：每批100条，避免一次加载过多数据
- **流式写入**：使用 ExcelJS 的流式API
- **Web Worker**：将Excel生成放到Web Worker中，避免阻塞UI
- **内存管理**：及时释放不需要的对象引用

#### 6.2 查询优化
- 使用数据库视图预聚合数据
- 建立合适的索引
- 避免N+1查询问题

### 7. 错误处理

#### 7.1 常见错误场景
1. **网络错误**：数据查询失败
2. **数据异常**：数据格式不符合预期
3. **内存不足**：数据量过大
4. **浏览器限制**：文件大小超限

#### 7.2 错误提示
```typescript
const errorMessages = {
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
  DATA_ERROR: '数据格式异常，请联系管理员',
  MEMORY_ERROR: '数据量过大，建议分批导出',
  BROWSER_LIMIT: '文件过大，请使用Chrome浏览器',
  NO_DATA: '当前月份暂无数据',
};
```

### 8. 安全性要求
- 导出操作记录到审计日志
- 限制导出频率（每分钟最多3次）
- 敏感数据脱敏（身份证号中间位数用*替代）
- 文件加密选项（可选）

## 技术实现

### 依赖库
```json
{
  "exceljs": "^4.4.0",
  "file-saver": "^2.0.5"
}
```

### 核心接口
```typescript
interface ExportOptions {
  month: Date;
  includeEmptyTemplate?: boolean;
  maskSensitiveData?: boolean;
  batchSize?: number;
}

interface ExportResult {
  success: boolean;
  fileName?: string;
  rowCount?: number;
  error?: Error;
}

async function exportPayrollMetadata(
  options: ExportOptions
): Promise<ExportResult> {
  // 实现导出逻辑
}
```

## 测试要求
1. **功能测试**：
   - 正常数据导出
   - 空数据模板生成
   - 大数据量导出（1000+条）

2. **性能测试**：
   - 导出1000条数据耗时 < 10秒
   - 内存占用 < 100MB

3. **兼容性测试**：
   - Chrome/Firefox/Safari
   - Excel 2016/2019/365打开

## 验收标准
- ✅ 点击导出按钮能成功下载Excel文件
- ✅ Excel文件格式正确，可用Excel正常打开
- ✅ 数据完整性：所有员工和字段都正确导出
- ✅ 空数据时生成正确的模板
- ✅ 大数据量导出不会导致页面卡死
- ✅ 导出的文件可以直接用于导入功能