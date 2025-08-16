-- 审批流程配置表
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  workflow_type VARCHAR(50) DEFAULT 'payroll', -- payroll, leave, expense等
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}', -- 存储灵活的配置信息
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 审批流程步骤表
CREATE TABLE IF NOT EXISTS approval_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  approver_type VARCHAR(50) NOT NULL, -- role, user, department_head, direct_manager
  approver_value VARCHAR(255), -- 具体的角色名、用户ID等
  approval_type VARCHAR(20) DEFAULT 'single', -- single, all, any
  is_optional BOOLEAN DEFAULT false,
  auto_approve_conditions JSONB, -- 自动审批条件
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, step_order)
);

-- 审批实例表（每个薪资记录的审批流程实例）
CREATE TABLE IF NOT EXISTS approval_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id),
  entity_type VARCHAR(50) NOT NULL, -- payroll, leave_request等
  entity_id UUID NOT NULL, -- 关联的业务实体ID
  current_step INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, approved, rejected, cancelled
  initiated_by UUID REFERENCES auth.users(id),
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  UNIQUE(entity_type, entity_id)
);

-- 审批记录表
CREATE TABLE IF NOT EXISTS approval_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES approval_instances(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  approver_id UUID REFERENCES auth.users(id),
  action VARCHAR(20) NOT NULL, -- approve, reject, return, delegate
  comments TEXT,
  attachments JSONB DEFAULT '[]',
  action_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  delegated_to UUID REFERENCES auth.users(id),
  delegated_at TIMESTAMP WITH TIME ZONE,
  INDEX idx_approval_records_instance (instance_id),
  INDEX idx_approval_records_approver (approver_id)
);

-- 审批通知表
CREATE TABLE IF NOT EXISTS approval_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES approval_instances(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  notification_type VARCHAR(50) NOT NULL, -- pending_approval, approved, rejected, returned
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  action_required BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_recipient (recipient_id, is_read),
  INDEX idx_notifications_instance (instance_id)
);

-- 审批委托表
CREATE TABLE IF NOT EXISTS approval_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID NOT NULL REFERENCES auth.users(id),
  delegate_id UUID NOT NULL REFERENCES auth.users(id),
  workflow_type VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_date >= start_date)
);

-- 创建视图：待审批列表
CREATE OR REPLACE VIEW view_pending_approvals AS
SELECT 
  ai.id as instance_id,
  ai.entity_type,
  ai.entity_id,
  ai.current_step,
  ai.status as approval_status,
  ai.initiated_at,
  aws.step_name,
  aws.approver_type,
  aws.approver_value,
  -- 薪资相关信息（当entity_type='payroll'时）
  p.employee_id,
  e.employee_name,
  e.department_id,
  d.name as department_name,
  p.pay_period_start,
  p.pay_period_end,
  p.gross_pay,
  p.net_pay
FROM approval_instances ai
JOIN approval_workflow_steps aws ON ai.workflow_id = aws.workflow_id 
  AND ai.current_step = aws.step_order
LEFT JOIN payrolls p ON ai.entity_type = 'payroll' AND ai.entity_id = p.id
LEFT JOIN employees e ON p.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE ai.status IN ('pending', 'in_progress')
ORDER BY ai.initiated_at DESC;

-- 创建视图：审批历史
CREATE OR REPLACE VIEW view_approval_history AS
SELECT 
  ar.id,
  ar.instance_id,
  ai.entity_type,
  ai.entity_id,
  ar.step_order,
  aws.step_name,
  ar.approver_id,
  u.email as approver_email,
  ar.action,
  ar.comments,
  ar.action_at,
  -- 薪资相关信息
  p.employee_id,
  e.employee_name,
  p.pay_period_start,
  p.pay_period_end,
  p.gross_pay,
  p.net_pay
FROM approval_records ar
JOIN approval_instances ai ON ar.instance_id = ai.id
JOIN approval_workflow_steps aws ON ai.workflow_id = aws.workflow_id 
  AND ar.step_order = aws.step_order
LEFT JOIN auth.users u ON ar.approver_id = u.id
LEFT JOIN payrolls p ON ai.entity_type = 'payroll' AND ai.entity_id = p.id
LEFT JOIN employees e ON p.employee_id = e.id
ORDER BY ar.action_at DESC;

-- 创建函数：启动审批流程
CREATE OR REPLACE FUNCTION start_approval_workflow(
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_workflow_name VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_workflow_id UUID;
  v_instance_id UUID;
  v_first_step approval_workflow_steps%ROWTYPE;
BEGIN
  -- 获取适用的工作流
  SELECT id INTO v_workflow_id
  FROM approval_workflows
  WHERE workflow_type = p_entity_type
    AND is_active = true
    AND (name = p_workflow_name OR p_workflow_name IS NULL)
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_workflow_id IS NULL THEN
    RAISE EXCEPTION '未找到适用的审批流程';
  END IF;
  
  -- 创建审批实例
  INSERT INTO approval_instances (
    workflow_id, entity_type, entity_id, 
    status, initiated_by
  ) VALUES (
    v_workflow_id, p_entity_type, p_entity_id,
    'in_progress', auth.uid()
  ) RETURNING id INTO v_instance_id;
  
  -- 获取第一步审批人信息
  SELECT * INTO v_first_step
  FROM approval_workflow_steps
  WHERE workflow_id = v_workflow_id AND step_order = 1;
  
  -- 创建通知
  PERFORM create_approval_notification(
    v_instance_id, 
    v_first_step.approver_type, 
    v_first_step.approver_value,
    'pending_approval'
  );
  
  RETURN v_instance_id;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：处理审批动作
CREATE OR REPLACE FUNCTION process_approval_action(
  p_instance_id UUID,
  p_action VARCHAR,
  p_comments TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_instance approval_instances%ROWTYPE;
  v_current_step approval_workflow_steps%ROWTYPE;
  v_next_step approval_workflow_steps%ROWTYPE;
  v_max_step INTEGER;
BEGIN
  -- 获取审批实例
  SELECT * INTO v_instance FROM approval_instances WHERE id = p_instance_id;
  
  IF v_instance IS NULL THEN
    RAISE EXCEPTION '审批实例不存在';
  END IF;
  
  IF v_instance.status NOT IN ('pending', 'in_progress') THEN
    RAISE EXCEPTION '审批流程已结束';
  END IF;
  
  -- 记录审批动作
  INSERT INTO approval_records (
    instance_id, step_order, approver_id, 
    action, comments
  ) VALUES (
    p_instance_id, v_instance.current_step, auth.uid(),
    p_action, p_comments
  );
  
  -- 根据动作更新流程
  IF p_action = 'approve' THEN
    -- 获取最大步骤数
    SELECT MAX(step_order) INTO v_max_step
    FROM approval_workflow_steps
    WHERE workflow_id = v_instance.workflow_id;
    
    IF v_instance.current_step >= v_max_step THEN
      -- 所有步骤完成，审批通过
      UPDATE approval_instances
      SET status = 'approved', completed_at = CURRENT_TIMESTAMP
      WHERE id = p_instance_id;
      
      -- 更新业务实体状态
      IF v_instance.entity_type = 'payroll' THEN
        UPDATE payrolls SET status = 'approved' 
        WHERE id = v_instance.entity_id;
      END IF;
    ELSE
      -- 进入下一步
      UPDATE approval_instances
      SET current_step = current_step + 1
      WHERE id = p_instance_id;
      
      -- 通知下一步审批人
      SELECT * INTO v_next_step
      FROM approval_workflow_steps
      WHERE workflow_id = v_instance.workflow_id 
        AND step_order = v_instance.current_step + 1;
      
      PERFORM create_approval_notification(
        p_instance_id,
        v_next_step.approver_type,
        v_next_step.approver_value,
        'pending_approval'
      );
    END IF;
    
  ELSIF p_action = 'reject' THEN
    -- 审批拒绝
    UPDATE approval_instances
    SET status = 'rejected', completed_at = CURRENT_TIMESTAMP
    WHERE id = p_instance_id;
    
    -- 更新业务实体状态
    IF v_instance.entity_type = 'payroll' THEN
      UPDATE payrolls SET status = 'draft' 
      WHERE id = v_instance.entity_id;
    END IF;
    
  ELSIF p_action = 'return' THEN
    -- 退回修改
    UPDATE approval_instances
    SET current_step = 1, status = 'pending'
    WHERE id = p_instance_id;
    
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 创建RLS策略
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_delegations ENABLE ROW LEVEL SECURITY;

-- 创建索引优化查询性能
CREATE INDEX idx_approval_instances_status ON approval_instances(status);
CREATE INDEX idx_approval_instances_entity ON approval_instances(entity_type, entity_id);
CREATE INDEX idx_approval_notifications_unread ON approval_notifications(recipient_id, is_read) WHERE is_read = false;