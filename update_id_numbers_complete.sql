-- 从 PGS 数据库完整更新身份证号到 Supabase
-- 执行前请确保数据库连接正确

BEGIN;

-- 创建临时表存储 PGS 数据
CREATE TEMP TABLE temp_pgs_id_numbers (
    pgs_id INTEGER,
    full_name VARCHAR(200),
    id_number VARCHAR(20)
);

-- 插入所有 PGS 数据
INSERT INTO temp_pgs_id_numbers (pgs_id, full_name, id_number) VALUES
(303, '汪琳', '510103197108310040'),
(304, '韩霜', '511002197402181525'),
(305, '李薇', '510212197210121627'),
(306, '蒲薇', '510104198105140665'),
(307, '吕果', '510107197509030897'),
(308, '黄明', '513401196804180245'),
(309, '冉光俊', '510103197309155710'),
(310, '罗先华', '510125197310025831'),
(311, '熊静', '510102197005034083'),
(312, '方敬玉', '510102196903083202'),
(313, '高洪艳', '510103197106094225'),
(314, '罗蓉', '510106197511143528'),
(315, '杨洋', '510106197512164128'),
(316, '何婷', '510102197110271064'),
(317, '廖希', '510113198101150029'),
(318, '包晓静', '51010719800901262X'),
(319, '李文媛', '370902197908020026'),
(320, '刘丹', '513101198306270320'),
(321, '马霜', '511302198612070349'),
(322, '邱高长青', '511524199204180024'),
(323, '周宏伟', '429006198705292113'),
(324, '周雪莲', '511323198111206326'),
(325, '谷颖', '512528197506224093'),
(326, '胡潇', '511113199412223323'),
(327, '田原', '513030199904070047'),
(328, '符译文', '513001199604011027'),
(329, '陈秋如', '51150219950729002X'),
(330, '杨也', '513902199405034969'),
(331, '王优', '511522199501270031'),
(332, '李洋洋', '130702198807161216'),
(333, '罗茗文', '513723197908210014'),
(334, '李润民', '511723199812279452'),
(335, '余浩川', '513433198901200033'),
(336, '曹钰佼', '51072219930820784X'),
(337, '伍宇星', '510105199305021047'),
(338, '卢泓良', '371311198812263436'),
(339, '刘嘉', '51010419790927236X'),
(340, '张磊', '511111198901171715'),
(341, '胡艺山', '510522198903201295'),
(342, '李庆', '510107197706032170'),
(343, '唐国晋', '511381199708288596'),
(344, '张福祥', '230621199504160058'),
(345, '杨钰婕', '511102199707145925'),
(346, '李汶卿', '620503199907198039'),
(347, '李子贤', '13022719980123102X'),
(348, '殷凌霄', '513101198908076023'),
(349, '何万达', '513721199708058376'),
(350, '沙砾', '510107198806212632'),
(351, '张秋子', '513022199309130025'),
(352, '申龙', '510726198801255811'),
(353, '周至涯', '511081198010240012'),
(354, '阮永强', '510103197106306216'),
(355, '徐颖', '510322198312070042'),
(356, '陈敏', '510104198109290281'),
(357, '徐云祥', '510122197604122873'),
(358, '江慧', '513823198406075828'),
(359, '谢欣然', '510902198205169343'),
(360, '周湜杰', '510104198001113478'),
(361, '宋方圆', '510321198809260048'),
(362, '黄卓尔', '513101199605060045'),
(363, '李佳', '511381199005110265'),
(364, '卢妍如', '51162219951030004X'),
(365, '赵霁梅', '510105198512060263'),
(366, '阙兮遥', '510403199303170712'),
(367, '鄢银', '513902198504212172'),
(368, '张晋维', '522401199203170214'),
(369, '汪倩', '622425199903206622'),
(370, '辛文', '220211198706221217'),
(371, '蒋文韬', '511321199906230129'),
(372, '沈丽萍', '512501197304092141'),
(373, '陈琳', '510403197704302625'),
(374, '李旻', '142601197807242814'),
(375, '杨勤文', '510104198207264060'),
(376, '杜疆', '510105197804032526'),
(377, '张玲', '510124197803210027'),
(378, '赖梅', '510103197305160707'),
(379, '阴琪', '650300197206205423'),
(380, '张练', '511527198411210024'),
(381, '郑偲', '510108198811022127'),
(382, '张净', '511302198809010737'),
(383, '杨圣', '51032119921205801X');

-- 统计更新前的状态
DO $$
DECLARE
    v_total_employees INTEGER;
    v_employees_with_id INTEGER;
    v_employees_matched INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_employees FROM public.employees;
    SELECT COUNT(*) INTO v_employees_with_id FROM public.employees WHERE id_number IS NOT NULL;
    
    SELECT COUNT(*) INTO v_employees_matched
    FROM public.employees e
    WHERE (e.metadata->>'pgs_id')::INTEGER IN (SELECT pgs_id FROM temp_pgs_id_numbers);
    
    RAISE NOTICE '更新前状态:';
    RAISE NOTICE '  总员工数: %', v_total_employees;
    RAISE NOTICE '  已有身份证号: %', v_employees_with_id;
    RAISE NOTICE '  将要更新的员工数: %', v_employees_matched;
END $$;

-- 方案1: 通过 pgs_id 匹配更新
UPDATE public.employees e
SET id_number = t.id_number
FROM temp_pgs_id_numbers t
WHERE (e.metadata->>'pgs_id')::INTEGER = t.pgs_id
AND (e.id_number IS NULL OR e.id_number = '');

-- 记录更新结果
DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '通过 pgs_id 更新了 % 条记录', v_updated_count;
END $$;

-- 方案2: 通过姓名匹配更新（处理可能的姓名格式差异）
UPDATE public.employees e
SET id_number = t.id_number
FROM temp_pgs_id_numbers t
WHERE (
    e.full_name = t.full_name 
    OR e.full_name = REPLACE(t.full_name, '', ' ')  -- 处理中间有空格的情况
    OR REPLACE(e.full_name, ' ', '') = t.full_name  -- 处理无空格的情况
)
AND (e.id_number IS NULL OR e.id_number = '');

-- 记录更新结果
DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '通过姓名匹配额外更新了 % 条记录', v_updated_count;
END $$;

-- 显示更新后的统计
DO $$
DECLARE
    v_total_employees INTEGER;
    v_employees_with_id INTEGER;
    v_completion_rate NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total_employees FROM public.employees;
    SELECT COUNT(*) INTO v_employees_with_id FROM public.employees WHERE id_number IS NOT NULL AND id_number != '';
    
    IF v_total_employees > 0 THEN
        v_completion_rate := (v_employees_with_id::NUMERIC / v_total_employees) * 100;
        RAISE NOTICE '';
        RAISE NOTICE '更新后状态:';
        RAISE NOTICE '  总员工数: %', v_total_employees;
        RAISE NOTICE '  有身份证号: %', v_employees_with_id;
        RAISE NOTICE '  完整率: %.2f%%', v_completion_rate;
    END IF;
END $$;

-- 显示更新的详细信息
SELECT 
    e.id,
    e.employee_code,
    e.full_name,
    e.id_number,
    e.metadata->>'pgs_id' as pgs_id,
    CASE 
        WHEN e.id_number IS NOT NULL AND e.id_number != '' THEN '✓ 已更新'
        ELSE '✗ 未更新'
    END as status
FROM public.employees e
WHERE (e.metadata->>'pgs_id')::INTEGER IN (SELECT pgs_id FROM temp_pgs_id_numbers)
   OR e.full_name IN (SELECT full_name FROM temp_pgs_id_numbers)
ORDER BY 
    CASE WHEN e.id_number IS NOT NULL THEN 0 ELSE 1 END,
    e.employee_code;

-- 清理临时表
DROP TABLE temp_pgs_id_numbers;

COMMIT;