import React, { useState } from 'react';
import { useEmployeeList } from '@/hooks/employee/useEmployeeList';
import { useEmployeeFullCreate } from '@/hooks/employee/useEmployeeFullCreate';
import type { 
  FullEmployeeCreateRequest, 
  CreateEmployeeRequest,
  LookupOption 
} from '@/types/employee';

/**
 * 员工创建测试页面
 * 演示完整的员工创建功能，包括：
 * 1. 基础员工创建（仅基本信息）
 * 2. 完整员工创建（包含组织分配、类别分配、银行账户、教育背景）
 * 3. 表单选项加载和展示
 * 4. 错误处理和加载状态
 */
const EmployeeCreateTestPage: React.FC = () => {
  // 使用集成后的员工列表Hook
  const employeeList = useEmployeeList();
  
  // 也可以单独使用完整创建Hook
  const employeeFullCreate = useEmployeeFullCreate();

  // 表单状态
  const [basicForm, setBasicForm] = useState<CreateEmployeeRequest>({
    employee_name: '',
    id_number: '',
    hire_date: '',
    employment_status: 'active',
    gender: 'male',
    date_of_birth: '',
    mobile_phone: '',
    email: '',
    work_email: '',
    personal_email: '',
  });

  const [fullForm, setFullForm] = useState<FullEmployeeCreateRequest>({
    employee_name: '',
    id_number: '',
    hire_date: '',
    employment_status: 'active',
    gender: 'male',
    date_of_birth: '',
    mobile_phone: '',
    email: '',
    work_email: '',
    personal_email: '',
    organizational_assignment: {
      department_id: '',
      position_id: '',
      rank_id: '',
      start_date: '',
      end_date: '',
      notes: '',
    },
    category_assignment: {
      employee_category_id: '',
      effective_start_date: '',
    },
    bank_accounts: [{
      account_holder_name: '',
      account_number: '',
      bank_name: '',
      branch_name: '',
      is_primary: true,
      effective_start_date: '',
    }],
    education: [{
      institution_name: '',
      degree: '',
      field_of_study: '',
      graduation_date: '',
      notes: '',
    }],
  });

  const [showFullForm, setShowFullForm] = useState(false);

  // 获取当前日期，用于默认值
  const today = new Date().toISOString().split('T')[0];

  // 处理基础表单提交
  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('提交基础员工信息:', basicForm);
    employeeList.actions.create(basicForm);
  };

  // 处理完整表单提交
  const handleFullSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('提交完整员工信息:', fullForm);
    employeeList.actions.createFull(fullForm);
  };

  // 填充示例数据
  const fillSampleBasicData = () => {
    setBasicForm({
      employee_name: '张三',
      id_number: '110101199001011234',
      hire_date: today,
      employment_status: 'active',
      gender: 'male',
      date_of_birth: '1990-01-01',
      mobile_phone: '13800138000',
      email: 'zhangsan@example.com',
      work_email: 'zhang.san@company.com',
      personal_email: 'zhangsan.personal@gmail.com',
    });
  };

  const fillSampleFullData = () => {
    const formOptions = employeeList.fullCreate.formOptions;
    
    setFullForm({
      employee_name: '李四',
      id_number: '110101199002022345',
      hire_date: today,
      employment_status: 'active',
      gender: 'female',
      date_of_birth: '1990-02-02',
      mobile_phone: '13800138001',
      email: 'lisi@example.com',
      work_email: 'li.si@company.com',
      personal_email: 'lisi.personal@gmail.com',
      organizational_assignment: {
        department_id: formOptions?.departments[0]?.id || '',
        position_id: formOptions?.positions[0]?.id || '',
        rank_id: '',
        start_date: today,
        end_date: '',
        notes: '测试组织分配',
      },
      category_assignment: {
        employee_category_id: formOptions?.categories[0]?.id || '',
        effective_start_date: today,
      },
      bank_accounts: [{
        account_holder_name: '李四',
        account_number: '6222021234567890',
        bank_name: '中国工商银行',
        branch_name: '高新区支行',
        is_primary: true,
        effective_start_date: today,
      }],
      education: [{
        institution_name: '清华大学',
        degree: '学士',
        field_of_study: '计算机科学',
        graduation_date: '2012-06-30',
        notes: '优秀毕业生',
      }],
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-base-content mb-2">
          员工创建功能测试页面
        </h1>
        <p className="text-base-content/70">
          测试基础员工创建和完整员工创建功能，包括组织分配、类别分配、银行账户和教育背景
        </p>
      </div>

      {/* 状态展示区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="stats bg-base-200 shadow">
          <div className="stat">
            <div className="stat-title">员工总数</div>
            <div className="stat-value text-primary">
              {employeeList.statistics.total}
            </div>
          </div>
        </div>
        
        <div className="stats bg-base-200 shadow">
          <div className="stat">
            <div className="stat-title">在职人数</div>
            <div className="stat-value text-success">
              {employeeList.statistics.active}
            </div>
          </div>
        </div>

        <div className="stats bg-base-200 shadow">
          <div className="stat">
            <div className="stat-title">部门数量</div>
            <div className="stat-value text-info">
              {employeeList.statistics.departmentCount}
            </div>
          </div>
        </div>
      </div>

      {/* 表单选项加载状态 */}
      {employeeList.fullCreate.loading.isLoadingOptions && (
        <div className="alert alert-info mb-6">
          <span className="loading loading-spinner"></span>
          正在加载表单选项数据...
        </div>
      )}

      {employeeList.fullCreate.errors.optionsError && (
        <div className="alert alert-error mb-6">
          <span>表单选项加载失败: {employeeList.fullCreate.errors.optionsError.message}</span>
        </div>
      )}

      {/* 操作按钮区域 */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          className="btn btn-primary"
          onClick={() => setShowFullForm(false)}
        >
          基础创建模式
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setShowFullForm(true)}
        >
          完整创建模式
        </button>
        <button
          className="btn btn-accent"
          onClick={showFullForm ? fillSampleFullData : fillSampleBasicData}
        >
          填充示例数据
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => employeeList.actions.refresh()}
          disabled={employeeList.loading.isRefetching}
        >
          {employeeList.loading.isRefetching && <span className="loading loading-spinner"></span>}
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 基础创建表单 */}
        {!showFullForm && (
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-primary">基础员工创建</h2>
              <p className="text-sm text-base-content/70 mb-4">
                仅创建员工基本信息，不包含组织分配和其他关联数据
              </p>
              
              <form onSubmit={handleBasicSubmit} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">员工姓名 *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={basicForm.employee_name}
                    onChange={(e) => setBasicForm(prev => ({ ...prev, employee_name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">身份证号</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={basicForm.id_number}
                    onChange={(e) => setBasicForm(prev => ({ ...prev, id_number: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">性别</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={basicForm.gender || 'male'}
                      onChange={(e) => setBasicForm(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' | 'other' }))}
                    >
                      <option value="male">男</option>
                      <option value="female">女</option>
                      <option value="other">其他</option>
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">出生日期</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered"
                      value={basicForm.date_of_birth}
                      onChange={(e) => setBasicForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">入职日期 *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={basicForm.hire_date}
                    onChange={(e) => setBasicForm(prev => ({ ...prev, hire_date: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">手机号</span>
                  </label>
                  <input
                    type="tel"
                    className="input input-bordered"
                    value={basicForm.mobile_phone}
                    onChange={(e) => setBasicForm(prev => ({ ...prev, mobile_phone: e.target.value }))}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">邮箱</span>
                  </label>
                  <input
                    type="email"
                    className="input input-bordered"
                    value={basicForm.email}
                    onChange={(e) => setBasicForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="card-actions justify-end pt-4">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={employeeList.loading.isCreating}
                  >
                    {employeeList.loading.isCreating && <span className="loading loading-spinner"></span>}
                    创建员工
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 完整创建表单 */}
        {showFullForm && (
          <div className="card bg-base-100 shadow-lg col-span-1 xl:col-span-2">
            <div className="card-body">
              <h2 className="card-title text-secondary">完整员工创建</h2>
              <p className="text-sm text-base-content/70 mb-4">
                创建员工完整信息，包括组织分配、类别分配、银行账户和教育背景
              </p>
              
              <form onSubmit={handleFullSubmit} className="space-y-6">
                {/* 基本信息部分 */}
                <div className="collapse collapse-open bg-base-200">
                  <div className="collapse-title text-lg font-medium">
                    基本信息
                  </div>
                  <div className="collapse-content">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">员工姓名 *</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered input-sm"
                          value={fullForm.employee_name}
                          onChange={(e) => setFullForm(prev => ({ ...prev, employee_name: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">身份证号</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered input-sm"
                          value={fullForm.id_number}
                          onChange={(e) => setFullForm(prev => ({ ...prev, id_number: e.target.value }))}
                        />
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">性别</span>
                        </label>
                        <select
                          className="select select-bordered select-sm"
                          value={fullForm.gender || 'male'}
                          onChange={(e) => setFullForm(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' | 'other' }))}
                        >
                          <option value="male">男</option>
                          <option value="female">女</option>
                          <option value="other">其他</option>
                        </select>
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">出生日期</span>
                        </label>
                        <input
                          type="date"
                          className="input input-bordered input-sm"
                          value={fullForm.date_of_birth}
                          onChange={(e) => setFullForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                        />
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">入职日期 *</span>
                        </label>
                        <input
                          type="date"
                          className="input input-bordered input-sm"
                          value={fullForm.hire_date}
                          onChange={(e) => setFullForm(prev => ({ ...prev, hire_date: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">手机号</span>
                        </label>
                        <input
                          type="tel"
                          className="input input-bordered input-sm"
                          value={fullForm.mobile_phone}
                          onChange={(e) => setFullForm(prev => ({ ...prev, mobile_phone: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 组织分配部分 */}
                <div className="collapse collapse-open bg-base-200">
                  <div className="collapse-title text-lg font-medium">
                    组织分配
                  </div>
                  <div className="collapse-content">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">部门</span>
                        </label>
                        <select
                          className="select select-bordered select-sm"
                          value={fullForm.organizational_assignment?.department_id || ''}
                          onChange={(e) => setFullForm(prev => ({
                            ...prev,
                            organizational_assignment: {
                              ...prev.organizational_assignment!,
                              department_id: e.target.value
                            }
                          }))}
                        >
                          <option value="">请选择部门</option>
                          {employeeList.fullCreate.formOptions?.departments.map(dept => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">职位</span>
                        </label>
                        <select
                          className="select select-bordered select-sm"
                          value={fullForm.organizational_assignment?.position_id || ''}
                          onChange={(e) => setFullForm(prev => ({
                            ...prev,
                            organizational_assignment: {
                              ...prev.organizational_assignment!,
                              position_id: e.target.value
                            }
                          }))}
                        >
                          <option value="">请选择职位</option>
                          {employeeList.fullCreate.formOptions?.positions.map(pos => (
                            <option key={pos.id} value={pos.id}>
                              {pos.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">任职开始日期</span>
                        </label>
                        <input
                          type="date"
                          className="input input-bordered input-sm"
                          value={fullForm.organizational_assignment?.start_date}
                          onChange={(e) => setFullForm(prev => ({
                            ...prev,
                            organizational_assignment: {
                              ...prev.organizational_assignment!,
                              start_date: e.target.value
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 员工类别部分 */}
                <div className="collapse collapse-open bg-base-200">
                  <div className="collapse-title text-lg font-medium">
                    员工类别
                  </div>
                  <div className="collapse-content">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">人员类别</span>
                        </label>
                        <select
                          className="select select-bordered select-sm"
                          value={fullForm.category_assignment?.employee_category_id || ''}
                          onChange={(e) => setFullForm(prev => ({
                            ...prev,
                            category_assignment: {
                              ...prev.category_assignment!,
                              employee_category_id: e.target.value
                            }
                          }))}
                        >
                          <option value="">请选择人员类别</option>
                          {employeeList.fullCreate.formOptions?.categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">生效日期</span>
                        </label>
                        <input
                          type="date"
                          className="input input-bordered input-sm"
                          value={fullForm.category_assignment?.effective_start_date}
                          onChange={(e) => setFullForm(prev => ({
                            ...prev,
                            category_assignment: {
                              ...prev.category_assignment!,
                              effective_start_date: e.target.value
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 银行账户部分 */}
                <div className="collapse collapse-open bg-base-200">
                  <div className="collapse-title text-lg font-medium">
                    银行账户
                  </div>
                  <div className="collapse-content">
                    {fullForm.bank_accounts?.map((account, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">户名</span>
                          </label>
                          <input
                            type="text"
                            className="input input-bordered input-sm"
                            value={account.account_holder_name}
                            onChange={(e) => {
                              const newAccounts = [...(fullForm.bank_accounts || [])];
                              newAccounts[index] = { ...account, account_holder_name: e.target.value };
                              setFullForm(prev => ({ ...prev, bank_accounts: newAccounts }));
                            }}
                          />
                        </div>

                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">账号</span>
                          </label>
                          <input
                            type="text"
                            className="input input-bordered input-sm"
                            value={account.account_number}
                            onChange={(e) => {
                              const newAccounts = [...(fullForm.bank_accounts || [])];
                              newAccounts[index] = { ...account, account_number: e.target.value };
                              setFullForm(prev => ({ ...prev, bank_accounts: newAccounts }));
                            }}
                          />
                        </div>

                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">开户行</span>
                          </label>
                          <input
                            type="text"
                            className="input input-bordered input-sm"
                            value={account.bank_name}
                            onChange={(e) => {
                              const newAccounts = [...(fullForm.bank_accounts || [])];
                              newAccounts[index] = { ...account, bank_name: e.target.value };
                              setFullForm(prev => ({ ...prev, bank_accounts: newAccounts }));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 教育背景部分 */}
                <div className="collapse collapse-open bg-base-200">
                  <div className="collapse-title text-lg font-medium">
                    教育背景
                  </div>
                  <div className="collapse-content">
                    {fullForm.education?.map((edu, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">学校</span>
                          </label>
                          <input
                            type="text"
                            className="input input-bordered input-sm"
                            value={edu.institution_name}
                            onChange={(e) => {
                              const newEducation = [...(fullForm.education || [])];
                              newEducation[index] = { ...edu, institution_name: e.target.value };
                              setFullForm(prev => ({ ...prev, education: newEducation }));
                            }}
                          />
                        </div>

                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">学位</span>
                          </label>
                          <input
                            type="text"
                            className="input input-bordered input-sm"
                            value={edu.degree}
                            onChange={(e) => {
                              const newEducation = [...(fullForm.education || [])];
                              newEducation[index] = { ...edu, degree: e.target.value };
                              setFullForm(prev => ({ ...prev, education: newEducation }));
                            }}
                          />
                        </div>

                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">专业</span>
                          </label>
                          <input
                            type="text"
                            className="input input-bordered input-sm"
                            value={edu.field_of_study}
                            onChange={(e) => {
                              const newEducation = [...(fullForm.education || [])];
                              newEducation[index] = { ...edu, field_of_study: e.target.value };
                              setFullForm(prev => ({ ...prev, education: newEducation }));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-actions justify-end pt-4">
                  <button
                    type="submit"
                    className="btn btn-secondary btn-lg"
                    disabled={employeeList.fullCreate.loading.isCreatingFull}
                  >
                    {employeeList.fullCreate.loading.isCreatingFull && <span className="loading loading-spinner"></span>}
                    创建完整员工信息
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 信息展示区域 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-accent">创建状态监控</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">基础创建状态:</span>
                <span className={`badge ${employeeList.loading.isCreating ? 'badge-warning' : 'badge-success'}`}>
                  {employeeList.loading.isCreating ? '创建中...' : '就绪'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">完整创建状态:</span>
                <span className={`badge ${employeeList.fullCreate.loading.isCreatingFull ? 'badge-warning' : 'badge-success'}`}>
                  {employeeList.fullCreate.loading.isCreatingFull ? '创建中...' : '就绪'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">表单选项状态:</span>
                <span className={`badge ${employeeList.fullCreate.loading.isLoadingOptions ? 'badge-info' : 'badge-success'}`}>
                  {employeeList.fullCreate.loading.isLoadingOptions ? '加载中...' : '已加载'}
                </span>
              </div>

              {employeeList.fullCreate.formOptions && (
                <div className="text-xs text-base-content/70 mt-4">
                  <div>部门数量: {employeeList.fullCreate.formOptions.departments.length}</div>
                  <div>职位数量: {employeeList.fullCreate.formOptions.positions.length}</div>
                  <div>类别数量: {employeeList.fullCreate.formOptions.categories.length}</div>
                </div>
              )}
            </div>

            {/* 错误信息显示 */}
            {employeeList.fullCreate.errors.createError && (
              <div className="alert alert-error mt-4">
                <span>创建失败: {employeeList.fullCreate.errors.createError.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCreateTestPage;