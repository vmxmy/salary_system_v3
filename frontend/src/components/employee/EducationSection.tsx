import React, { useState } from 'react';
import type { EmployeeEducation } from '../../types/employee_new';
import EducationForm from './EducationForm';

interface EducationSectionProps {
  educations: EmployeeEducation[];
  employeeId: string;
  canEdit: boolean;
  onAdd: (data: Omit<EmployeeEducation, 'id' | 'created_at'>) => void;
  onUpdate: (id: string, data: Partial<EmployeeEducation>) => void;
  onDelete: (id: string) => void;
}

const EducationSection: React.FC<EducationSectionProps> = ({
  educations,
  employeeId,
  canEdit,
  onAdd,
  onUpdate,
  onDelete
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = (data: Omit<EmployeeEducation, 'id' | 'created_at'>) => {
    onAdd({ ...data, employee_id: employeeId });
    setIsAdding(false);
  };

  const handleUpdate = (id: string, data: Partial<EmployeeEducation>) => {
    onUpdate(id, data);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条教育背景记录吗？')) {
      onDelete(id);
    }
  };

  if (isAdding) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">添加教育背景</h3>
          <EducationForm 
            onSave={handleAdd}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      </div>
    );
  }

  if (editingId) {
    const education = educations.find(e => e.id === editingId);
    if (education) {
      return (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">编辑教育背景</h3>
            <EducationForm 
              education={education}
              isEditing={true}
              onSave={(data) => handleUpdate(editingId, data as Partial<EmployeeEducation>)}
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
          <h3 className="card-title text-lg">教育背景</h3>
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

        {educations.length === 0 ? (
          <div className="text-center py-8 text-base-content/50">
            <p>暂无教育背景记录</p>
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
            {educations.map((education) => (
              <div key={education.id} className="border-b border-base-200 pb-4 last:border-b-0">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-semibold">{education.institution_name}</h4>
                    <p className="text-sm text-base-content/70">
                      {education.degree} · {education.field_of_study}
                    </p>
                    {education.graduation_date && (
                      <p className="text-sm">
                        毕业时间: {new Date(education.graduation_date).toLocaleDateString('zh-CN')}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-ghost btn-xs"
                        onClick={() => setEditingId(education.id)}
                      >
                        编辑
                      </button>
                      <button 
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => handleDelete(education.id)}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
                {education.notes && (
                  <div className="mt-2 text-sm bg-base-200 p-2 rounded">
                    {education.notes}
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

export default EducationSection;