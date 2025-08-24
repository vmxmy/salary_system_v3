#!/usr/bin/env python3
"""
薪资周期员工缴费基数导出脚本

使用方法:
python export_contribution_base.py 2025-06
python export_contribution_base.py --period 2025-06 --output /path/to/output.csv
"""

import sys
import csv
import argparse
import os
from datetime import datetime
import psycopg2
from psycopg2.extras import DictCursor

# 数据库连接配置
DB_CONFIG = {
    'host': '8.137.160.207',
    'port': '5432',
    'database': 'salary_system',
    'user': 'salary_system',
    'password': 'caijing123!'
}

def get_db_connection():
    """建立数据库连接"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except psycopg2.Error as e:
        print(f"数据库连接错误: {e}")
        sys.exit(1)

def validate_period_format(period_str):
    """验证薪资周期格式 (YYYY-MM)"""
    try:
        datetime.strptime(period_str, '%Y-%m')
        return True
    except ValueError:
        return False

def get_payroll_period_info(conn, period_str):
    """获取薪资周期信息"""
    query = """
    SELECT id, name, start_date, end_date, pay_date
    FROM payroll.payroll_periods 
    WHERE name LIKE %s
    ORDER BY start_date DESC
    LIMIT 1
    """
    
    period_name = f"{period_str[:4]}年{period_str[5:7]}月"
    
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute(query, (f"%{period_name}%",))
        result = cursor.fetchone()
        
        if not result:
            print(f"未找到薪资周期: {period_name}")
            return None
            
        return dict(result)

def export_contribution_base(conn, period_info, output_file):
    """导出员工缴费基数信息"""
    
    # 构建导出查询 - 结合员工基本信息和缴费基数
    query = """
    SELECT 
        pp.name as "薪资周期",
        pp.start_date as "周期开始日期",
        pp.end_date as "周期结束日期",
        pp.pay_date as "发放日期",
        eb.employee_code as "员工编号",
        COALESCE(eb.full_name, '未知姓名') as "员工姓名",
        eb.id_number as "身份证号",
        eb.personnel_category_name as "人员类别",
        eb.department_name as "部门名称",
        eb.position_name as "职位名称",
        eb.hire_date as "入职日期",
        CASE WHEN eb.is_active THEN '在职' ELSE '离职' END as "员工状态",
        
        -- 缴费基数信息
        COALESCE(pc."社保缴费基数", 0.00) as "社保缴费基数",
        COALESCE(pc."养老保险缴费基数", 0.00) as "养老保险缴费基数",
        COALESCE(pc."医疗保险缴费基数", 0.00) as "医疗保险缴费基数",
        COALESCE(pc."住房公积金缴费基数", 0.00) as "住房公积金缴费基数",
        COALESCE(pc."职业年金缴费基数", 0.00) as "职业年金缴费基数",
        COALESCE(pc."计税基数", 0.00) as "个人所得税计税基数",
        COALESCE(pc."基本工资", 0.00) as "基本工资",
        
        -- 缴费费率信息
        COALESCE(pc."养老保险个人费率", 0.00) as "养老保险个人费率",
        COALESCE(pc."医疗保险个人费率", 0.00) as "医疗保险个人费率", 
        COALESCE(pc."住房公积金个人费率", 0.00) as "住房公积金个人费率",
        COALESCE(pc."养老保险单位费率", 0.00) as "养老保险单位费率",
        COALESCE(pc."医疗保险单位费率", 0.00) as "医疗保险单位费率",
        COALESCE(pc."住房公积金单位费率", 0.00) as "住房公积金单位费率",
        
        -- 计算出的缴费金额
        ROUND(COALESCE(pc."养老保险缴费基数", 0.00) * COALESCE(pc."养老保险个人费率", 0.00) / 100, 2) as "养老保险个人缴费",
        ROUND(COALESCE(pc."医疗保险缴费基数", 0.00) * COALESCE(pc."医疗保险个人费率", 0.00) / 100, 2) as "医疗保险个人缴费",
        ROUND(COALESCE(pc."住房公积金缴费基数", 0.00) * COALESCE(pc."住房公积金个人费率", 0.00) / 100, 2) as "住房公积金个人缴费",
        ROUND(COALESCE(pc."养老保险缴费基数", 0.00) * COALESCE(pc."养老保险单位费率", 0.00) / 100, 2) as "养老保险单位缴费",
        ROUND(COALESCE(pc."医疗保险缴费基数", 0.00) * COALESCE(pc."医疗保险单位费率", 0.00) / 100, 2) as "医疗保险单位缴费",
        ROUND(COALESCE(pc."住房公积金缴费基数", 0.00) * COALESCE(pc."住房公积金单位费率", 0.00) / 100, 2) as "住房公积金单位缴费",
        
        -- 薪资信息
        pe.gross_pay as "应发合计",
        pe.total_deductions as "扣除合计",
        pe.net_pay as "实发合计",
        pe.calculated_at as "计算时间"
        
    FROM payroll.payroll_entries pe
    JOIN payroll.payroll_periods pp ON pe.payroll_period_id = pp.id
    JOIN reports.v_employees_basic eb ON pe.employee_id = eb.id
    LEFT JOIN reports.v_payroll_calculations pc ON pe.id = pc."薪资条目id"
    WHERE pp.id = %s
    ORDER BY 
        COALESCE(eb.personnel_category_name, '未分类'),
        eb.employee_code,
        eb.full_name
    """
    
    try:
        with conn.cursor(cursor_factory=DictCursor) as cursor:
            cursor.execute(query, (period_info['id'],))
            rows = cursor.fetchall()
            
            if not rows:
                print(f"薪资周期 '{period_info['name']}' 未找到缴费基数数据")
                return False
                
            # 写入CSV文件
            with open(output_file, 'w', newline='', encoding='utf-8-sig') as csvfile:
                # 获取字段名
                fieldnames = [desc[0] for desc in cursor.description]
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                # 写入表头
                writer.writeheader()
                
                # 写入数据
                for row in rows:
                    # 转换日期格式
                    row_dict = dict(row)
                    for key, value in row_dict.items():
                        if isinstance(value, datetime):
                            row_dict[key] = value.strftime('%Y-%m-%d')
                    
                    writer.writerow(row_dict)
            
            print(f"成功导出 {len(rows)} 条员工缴费基数记录到: {output_file}")
            return True
            
    except Exception as e:
        print(f"导出过程中发生错误: {e}")
        return False

def generate_output_filename(period_str):
    """生成输出文件名"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"员工缴费基数_{period_str}_{timestamp}.csv"
    return filename

def print_summary_stats(conn, period_info):
    """打印缴费基数统计摘要"""
    query = """
    SELECT 
        COALESCE(eb.personnel_category_name, '未分类') as category_name,
        COUNT(*) as employee_count,
        ROUND(AVG(COALESCE(pc."社保缴费基数", 0)), 2) as avg_social_base,
        ROUND(AVG(COALESCE(pc."住房公积金缴费基数", 0)), 2) as avg_housing_base,
        ROUND(AVG(COALESCE(pc."计税基数", 0)), 2) as avg_tax_base,
        ROUND(MIN(COALESCE(pc."社保缴费基数", 0)), 2) as min_social_base,
        ROUND(MAX(COALESCE(pc."社保缴费基数", 0)), 2) as max_social_base
    FROM payroll.payroll_entries pe
    JOIN reports.v_employees_basic eb ON pe.employee_id = eb.id
    LEFT JOIN reports.v_payroll_calculations pc ON pe.id = pc."薪资条目id"
    WHERE pe.payroll_period_id = %s
    GROUP BY eb.personnel_category_name
    ORDER BY employee_count DESC, category_name
    """
    
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute(query, (period_info['id'],))
        stats = cursor.fetchall()
        
        print(f"\n=== {period_info['name']} 缴费基数统计 ===")
        print(f"周期时间: {period_info['start_date'].strftime('%Y-%m-%d')} 至 {period_info['end_date'].strftime('%Y-%m-%d')}")
        print(f"发放日期: {period_info['pay_date'].strftime('%Y-%m-%d')}")
        print("\n各人员类别缴费基数情况:")
        print("-" * 100)
        print(f"{'类别':15} | {'人数':3} | {'平均社保基数':10} | {'平均公积金基数':12} | {'平均计税基数':10} | {'社保基数范围':20}")
        print("-" * 100)
        
        total_employees = 0
        for stat in stats:
            min_max_range = f"{stat['min_social_base']:.0f}~{stat['max_social_base']:.0f}"
            print(f"{stat['category_name']:15} | {stat['employee_count']:3}人 | {stat['avg_social_base']:8.2f} | {stat['avg_housing_base']:10.2f} | {stat['avg_tax_base']:8.2f} | {min_max_range:20}")
            total_employees += stat['employee_count']
        
        print("-" * 100)
        print(f"{'总计':15} | {total_employees:3}人")
        print()

def main():
    parser = argparse.ArgumentParser(
        description='导出指定薪资周期的员工缴费基数信息',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
使用示例:
  python export_contribution_base.py 2025-06
  python export_contribution_base.py --period 2025-06 --output 缴费基数_202506.csv
  python export_contribution_base.py 2025-06 --stats-only
        '''
    )
    
    parser.add_argument('period', nargs='?', help='薪资周期 (格式: YYYY-MM)')
    parser.add_argument('--period', dest='period_arg', help='薪资周期 (格式: YYYY-MM)')
    parser.add_argument('--output', '-o', help='输出CSV文件路径')
    parser.add_argument('--stats-only', action='store_true', help='仅显示统计信息，不导出文件')
    
    args = parser.parse_args()
    
    # 获取周期参数
    period = args.period or args.period_arg
    if not period:
        parser.error('请指定薪资周期参数')
    
    # 验证周期格式
    if not validate_period_format(period):
        print("错误: 薪资周期格式应为 YYYY-MM，例如: 2025-06")
        sys.exit(1)
    
    # 生成输出文件名
    if not args.output:
        output_file = generate_output_filename(period)
    else:
        output_file = args.output
    
    # 建立数据库连接
    print("正在连接数据库...")
    conn = get_db_connection()
    
    try:
        # 获取薪资周期信息
        period_info = get_payroll_period_info(conn, period)
        if not period_info:
            sys.exit(1)
        
        # 显示统计信息
        print_summary_stats(conn, period_info)
        
        # 如果只显示统计信息，则退出
        if args.stats_only:
            print("仅显示统计信息模式，未导出文件。")
            return
        
        # 导出数据
        print(f"正在导出缴费基数数据到: {output_file}")
        success = export_contribution_base(conn, period_info, output_file)
        
        if success:
            print(f"\n导出完成! 文件路径: {os.path.abspath(output_file)}")
        else:
            print("导出失败!")
            sys.exit(1)
            
    finally:
        conn.close()

if __name__ == '__main__':
    main()