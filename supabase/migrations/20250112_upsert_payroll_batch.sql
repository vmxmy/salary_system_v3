-- 创建事务化的批量UPSERT薪资记录函数
CREATE OR REPLACE FUNCTION upsert_payroll_batch(
    payroll_data jsonb,
    pay_period_start date,
    pay_period_end date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_success_count int := 0;
    v_failed_count int := 0;
    v_row jsonb;
    v_employee_id uuid;
    v_payroll_id uuid;
    v_component_id uuid;
    v_item jsonb;
BEGIN
    -- 开始事务
    v_result := jsonb_build_object('success', false, 'data', '[]'::jsonb);
    
    -- 遍历每条薪资数据
    FOR v_row IN SELECT * FROM jsonb_array_elements(payroll_data)
    LOOP
        BEGIN
            -- 查找员工
            SELECT id INTO v_employee_id
            FROM employees
            WHERE employee_code = v_row->>'employee_code'
               OR employee_name = v_row->>'employee_name'
               OR id_number = v_row->>'id_number'
            LIMIT 1;
            
            IF v_employee_id IS NULL THEN
                -- 如果找不到员工，记录失败
                v_failed_count := v_failed_count + 1;
                CONTINUE;
            END IF;
            
            -- 查找或创建薪资记录
            SELECT id INTO v_payroll_id
            FROM payrolls
            WHERE employee_id = v_employee_id
              AND pay_period_start = pay_period_start
              AND pay_period_end = pay_period_end;
            
            IF v_payroll_id IS NULL THEN
                -- 创建新薪资记录
                INSERT INTO payrolls (
                    employee_id,
                    pay_period_start,
                    pay_period_end,
                    pay_date,
                    status
                ) VALUES (
                    v_employee_id,
                    pay_period_start,
                    pay_period_end,
                    pay_period_end,
                    'draft'
                ) RETURNING id INTO v_payroll_id;
            END IF;
            
            -- 删除现有薪资项目（为了实现真正的UPSERT）
            DELETE FROM payroll_items
            WHERE payroll_id = v_payroll_id;
            
            -- 插入新的薪资项目
            FOR v_item IN SELECT * FROM jsonb_each(v_row->'payroll_data')
            LOOP
                -- 查找薪资组件
                SELECT id INTO v_component_id
                FROM salary_components
                WHERE name = v_item.key;
                
                IF v_component_id IS NOT NULL THEN
                    INSERT INTO payroll_items (
                        payroll_id,
                        component_id,
                        amount
                    ) VALUES (
                        v_payroll_id,
                        v_component_id,
                        (v_item.value)::numeric
                    );
                END IF;
            END LOOP;
            
            v_success_count := v_success_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- 记录失败但继续处理下一条
            v_failed_count := v_failed_count + 1;
            RAISE WARNING 'Error processing row: %', SQLERRM;
        END;
    END LOOP;
    
    -- 返回结果
    v_result := jsonb_build_object(
        'success', v_success_count > 0,
        'success_count', v_success_count,
        'failed_count', v_failed_count,
        'total_count', v_success_count + v_failed_count
    );
    
    RETURN v_result;
END;
$$;

-- 创建用于更新薪资项目的事务函数
CREATE OR REPLACE FUNCTION upsert_payroll_items_batch(
    items_data jsonb,
    import_mode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_item jsonb;
    v_existing_id uuid;
BEGIN
    -- 开始事务
    BEGIN
        IF import_mode IN ('UPDATE', 'UPSERT') THEN
            -- 删除现有项目
            FOR v_item IN SELECT * FROM jsonb_array_elements(items_data)
            LOOP
                DELETE FROM payroll_items
                WHERE payroll_id = (v_item->>'payroll_id')::uuid
                  AND component_id = (v_item->>'component_id')::uuid;
            END LOOP;
        END IF;
        
        -- 插入新项目
        INSERT INTO payroll_items (payroll_id, component_id, amount)
        SELECT 
            (value->>'payroll_id')::uuid,
            (value->>'component_id')::uuid,
            (value->>'amount')::numeric
        FROM jsonb_array_elements(items_data);
        
        v_result := jsonb_build_object(
            'success', true,
            'count', jsonb_array_length(items_data)
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- 回滚事务
        RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
    END;
    
    RETURN v_result;
END;
$$;

-- 添加权限
GRANT EXECUTE ON FUNCTION upsert_payroll_batch TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_payroll_items_batch TO authenticated;