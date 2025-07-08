-- 从 PGS 数据库更新身份证号到 Supabase
-- 使用前请确保已经建立了正确的数据库连接

-- 步骤 1: 创建临时表存储 PGS 数据
CREATE TEMP TABLE temp_pgs_id_numbers (
    pgs_id INTEGER,
    employee_code VARCHAR(50),
    full_name VARCHAR(200),
    id_number VARCHAR(20)
);

-- 步骤 2: 插入 PGS 数据（需要手动从 PGS 导出并插入）
-- 这里是示例数据，实际使用时需要替换为完整数据
INSERT INTO temp_pgs_id_numbers (pgs_id, employee_code, full_name, id_number) VALUES
(332, NULL, '李洋洋', '130702198807161216'),
(328, NULL, '符译文', '513001199604011027'),
(334, NULL, '李润民', '511723199812279452'),
(348, NULL, '殷凌霄', '513101198908076023'),
(347, NULL, '李子贤', '13022719980123102X'),
(367, NULL, '鄢银', '513902198504212172'),
(368, NULL, '张晋维', '522401199203170214'),
(369, NULL, '汪倩', '622425199903206622'),
(365, NULL, '赵霁梅', '510105198512060263'),
(366, NULL, '阙兮遥', '510403199303170712'),
(370, NULL, '辛文', '220211198706221217'),
(371, NULL, '蒋文韬', '511321199906230129'),
(362, NULL, '黄卓尔', '513101199605060045'),
(353, NULL, '周至涯', '511081198010240012'),
(358, NULL, '江慧', '513823198406075828'),
(337, NULL, '伍宇星', '510105199305021047'),
(361, NULL, '宋方圆', '510321198809260048'),
(351, NULL, '张秋子', '513022199309130025'),
(359, NULL, '谢欣然', '510902198205169343'),
(349, NULL, '何万达', '513721199708058376');

-- 步骤 3: 更新 Supabase 中的员工身份证号
-- 通过 pgs_id 匹配（存储在 metadata 中）
UPDATE public.employees e
SET id_number = t.id_number
FROM temp_pgs_id_numbers t
WHERE (e.metadata->>'pgs_id')::INTEGER = t.pgs_id
AND e.id_number IS NULL;

-- 步骤 4: 通过姓名匹配更新（作为备用方案）
UPDATE public.employees e
SET id_number = t.id_number
FROM temp_pgs_id_numbers t
WHERE e.full_name = t.full_name
AND e.id_number IS NULL;

-- 步骤 5: 显示更新结果
SELECT 
    e.id,
    e.employee_code,
    e.full_name,
    e.id_number,
    CASE 
        WHEN e.id_number IS NOT NULL THEN '已更新'
        ELSE '未更新'
    END as update_status,
    e.metadata->>'pgs_id' as pgs_id
FROM public.employees e
WHERE (e.metadata->>'pgs_id')::INTEGER IN (
    SELECT pgs_id FROM temp_pgs_id_numbers
)
ORDER BY e.employee_code;

-- 清理临时表
DROP TABLE temp_pgs_id_numbers;