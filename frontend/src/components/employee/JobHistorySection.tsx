import React, { useState } from 'react';
import type { EmployeeJobHistory } from '../../types/employee_new';
import JobHistoryForm from './JobHistoryForm';

interface JobHistorySectionProps {
  jobHistories: EmployeeJobHistory[];
  employeeId: string;
  canEdit: boolean;
  onAdd: (data: Omit<EmployeeJobHistory, 'id' | 'created_at'>) => void;
  onUpdate: (id: string, data: Partial<EmployeeJobHistory>) => void;
  onDelete: (id: string) => void;
}

const JobHistorySection: React.FC<JobHistorySectionProps> = ({
  jobHistories,
  employeeId,
  canEdit,
  onAdd,
  onUpdate,
  onDelete
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = (data: Omit<EmployeeJobHistory, 'id' | 'created_at'>) => {
    onAdd({ ...data, employee_id: employeeId });
    setIsAdding(false);
  };

  const handleUpdate = (id: string, data: Partial<EmployeeJobHistory>) => {
    onUpdate(id, data);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条工作履历记录吗？')) {
      onDelete(id);
    }
  };

  if (isAdding) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">添加工作履历</h3>
          <JobHistoryForm 
            onSave={handleAdd}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      </div>
    );
  }

  if (editingId) {
    const jobHistory = jobHistories.find(j => j.id === editingId);
    if (jobHistory) {
      return (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">编辑工作履历</h3>
            <JobHistoryForm 
              jobHistory={jobHistory}
              isEditing={true}
              onSave={(data) => handleUpdate(editingId, data as Partial<EmployeeJobHistory>)}
              onCancel={() => setEditingId(null)}
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h3 className="card-title text-lg">工作履历</h3>
          {canEdit && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setIsAdding(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加
            </button>
          )}
        </div>

        {jobHistories.length === 0 ? (
          <div className="text-center py-8 text-base-content/50">
            <p>暂无工作履历记录</p>
            {canEdit && (
              <button 
                className="btn btn-ghost btn-sm mt-2"
                onClick={() => setIsAdding(true)}
              >
                添加第一条记录
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {jobHistories.map((job) => (
              <div key={job.id} className="border-b border-base-200 pb-4 last:border-b-0">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-semibold">
                      {job.department?.name || '未知部门'} - {job.position?.name || '未知职位'}
                    </h4>
                    <p className="text-sm text-base-content/70">
                      职级: {job.rank?.name || '未知职级'}
                    </p>
                    <p className="text-sm">
                      任期: {new Date(job.effective_start_date).toLocaleDateString('zh-CN')}
                      {job.effective_end_date ? ` 至 ${new Date(job.effective_end_date).toLocaleDateString('zh-CN')}` : ' 至今'}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-ghost btn-xs"
                        onClick={() => setEditingId(job.id)}
                      >
                        编辑
                      </button>
                      <button 
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => handleDelete(job.id)}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
                {job.notes && (
                  <div className="mt-2 text-sm bg-base-200 p-2 rounded">
                    {job.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobHistorySection;