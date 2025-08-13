-- 添加导入批次ID字段，用于支持撤销功能
ALTER TABLE payrolls 
ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(50);

-- 创建导入历史表
CREATE TABLE IF NOT EXISTS import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    summary JSONB NOT NULL,
    details JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_payrolls_import_batch_id ON payrolls(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_import_history_batch_id ON import_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_import_history_status ON import_history(status);
CREATE INDEX IF NOT EXISTS idx_import_history_pay_period ON import_history(pay_period_start, pay_period_end);

-- 添加RLS策略
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- 允许已认证用户查看导入历史
CREATE POLICY "Allow authenticated users to view import history"
ON import_history FOR SELECT
TO authenticated
USING (true);

-- 允许已认证用户创建导入历史
CREATE POLICY "Allow authenticated users to create import history"
ON import_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- 允许已认证用户更新自己的导入历史（用于撤销）
CREATE POLICY "Allow authenticated users to update own import history"
ON import_history FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- 添加注释
COMMENT ON TABLE import_history IS '薪资导入历史记录表，用于追踪和撤销导入操作';
COMMENT ON COLUMN payrolls.import_batch_id IS '导入批次ID，用于关联导入历史和支持撤销';
COMMENT ON COLUMN import_history.batch_id IS '导入批次唯一标识';
COMMENT ON COLUMN import_history.status IS '导入状态: completed, failed, rolled_back';
COMMENT ON COLUMN import_history.summary IS '导入汇总信息';
COMMENT ON COLUMN import_history.details IS '导入详细信息';