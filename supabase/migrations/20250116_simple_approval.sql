-- 轻量级审批记录表
CREATE TABLE IF NOT EXISTS payroll_approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL, -- submit, approve, reject, pay
  from_status VARCHAR(20) NOT NULL,
  to_status VARCHAR(20) NOT NULL,
  operator_id UUID REFERENCES auth.users(id),
  operator_name VARCHAR(100),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_approval_logs_payroll (payroll_id),
  INDEX idx_approval_logs_created (created_at DESC)
);

-- 创建审批汇总视图
CREATE OR REPLACE VIEW view_payroll_approval_summary AS
SELECT 
  p.id as payroll_id,
  p.employee_id,
  e.employee_name,
  d.name as department_name,
  p.pay_month,
  p.gross_pay,
  p.net_pay,
  p.status,
  p.created_at,
  p.updated_at,
  -- 最新审批信息
  last_approval.action as last_action,
  last_approval.operator_name as last_operator,
  last_approval.created_at as last_action_at,
  last_approval.comments as last_comments,
  -- 统计信息
  COUNT(pal.id) as approval_count,
  CASE 
    WHEN p.status = 'draft' THEN '待提交'
    WHEN p.status = 'pending' THEN '待审批'
    WHEN p.status = 'approved' THEN '已审批'
    WHEN p.status = 'paid' THEN '已发放'
    WHEN p.status = 'rejected' THEN '已驳回'
    ELSE p.status
  END as status_label
FROM payrolls p
LEFT JOIN employees e ON p.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN LATERAL (
  SELECT action, operator_name, created_at, comments
  FROM payroll_approval_logs
  WHERE payroll_id = p.id
  ORDER BY created_at DESC
  LIMIT 1
) last_approval ON true
LEFT JOIN payroll_approval_logs pal ON p.id = pal.payroll_id
GROUP BY 
  p.id, p.employee_id, e.employee_name, d.name, p.pay_month,
  p.gross_pay, p.net_pay, p.status, p.created_at, p.updated_at,
  last_approval.action, last_approval.operator_name, 
  last_approval.created_at, last_approval.comments;

-- 更新payrolls表添加审批相关字段
ALTER TABLE payrolls 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 创建审批状态更新触发器
CREATE OR REPLACE FUNCTION update_payroll_approval_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 记录状态变更到审批日志
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO payroll_approval_logs (
      payroll_id,
      action,
      from_status,
      to_status,
      operator_id,
      operator_name,
      comments
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.status = 'pending' THEN 'submit'
        WHEN NEW.status = 'approved' THEN 'approve'
        WHEN NEW.status = 'rejected' THEN 'reject'
        WHEN NEW.status = 'paid' THEN 'pay'
        ELSE 'update'
      END,
      COALESCE(OLD.status, 'draft'),
      NEW.status,
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      NEW.rejection_reason
    );
    
    -- 更新时间戳
    IF NEW.status = 'pending' THEN
      NEW.submitted_at = CURRENT_TIMESTAMP;
    ELSIF NEW.status = 'approved' THEN
      NEW.approved_at = CURRENT_TIMESTAMP;
      NEW.approved_by = auth.uid();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payroll_approval_status
BEFORE UPDATE ON payrolls
FOR EACH ROW
EXECUTE FUNCTION update_payroll_approval_status();

-- 创建RLS策略
ALTER TABLE payroll_approval_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "审批日志读取策略" ON payroll_approval_logs
  FOR SELECT USING (true);

CREATE POLICY "审批日志创建策略" ON payroll_approval_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );