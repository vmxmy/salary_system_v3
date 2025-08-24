#!/usr/bin/env python3
"""
薪资周期工资明细导出脚本

使用方法:
python export_payroll_details.py 2025-06
python export_payroll_details.py --period 2025-06 --output /path/to/output.csv
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

def export_payroll_details(conn, period_info, output_file, include_zero_fields=False):
    """导出完整工资明细信息"""
    
    # 构建导出查询 - 使用优化的综合视图导出所有工资明细
    query = """
    SELECT * FROM reports.v_comprehensive_employee_payroll_optimized
    WHERE "薪资期间名称" LIKE %s
    ORDER BY 
        COALESCE("人员类别", '未分类'),
        "员工编号",
        "姓名"
    """
    
    period_name = f"%{period_info['name']}%"
    
    try:
        with conn.cursor(cursor_factory=DictCursor) as cursor:
            cursor.execute(query, (period_name,))
            rows = cursor.fetchall()
            
            if not rows:
                print(f"薪资周期 '{period_info['name']}' 未找到工资明细数据")
                return False
            
            # 获取所有字段名
            fieldnames = [desc[0] for desc in cursor.description]
            
            # 如果不包含零值字段，需要过滤掉所有值为0的字段
            if not include_zero_fields:
                # 分析哪些字段在所有记录中都为0或null
                non_zero_fields = set(fieldnames)
                numeric_fields = []
                
                # 识别数值字段
                for i, desc in enumerate(cursor.description):
                    if desc[1] == 1700:  # numeric type
                        numeric_fields.append(desc[0])
                
                # 检查每个数值字段是否在所有记录中都为0
                for field in numeric_fields:
                    has_non_zero = False
                    for row in rows:
                        if row[field] is not None and float(row[field]) != 0:
                            has_non_zero = True
                            break
                    if not has_non_zero:
                        non_zero_fields.discard(field)
                
                fieldnames = [f for f in fieldnames if f in non_zero_fields]
                print(f"过滤零值字段后，保留 {len(fieldnames)} 个有效字段")
            
            # 写入CSV文件
            with open(output_file, 'w', newline='', encoding='utf-8-sig') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                # 写入表头
                writer.writeheader()
                
                # 写入数据
                for row in rows:
                    # 转换日期格式和处理数据
                    row_dict = {}
                    for field in fieldnames:
                        value = row[field]
                        if isinstance(value, datetime):
                            row_dict[field] = value.strftime('%Y-%m-%d %H:%M:%S') if field in ['计算时间', '更新时间', '薪资运行日期', '审计时间'] else value.strftime('%Y-%m-%d')
                        elif value is None:
                            row_dict[field] = ""
                        else:
                            row_dict[field] = value
                    
                    writer.writerow(row_dict)
            
            print(f"成功导出 {len(rows)} 条工资明细记录到: {output_file}")
            return True
            
    except Exception as e:
        print(f"导出过程中发生错误: {e}")
        return False

def generate_output_filename(period_str, suffix=""):
    """生成输出文件名"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"工资明细{suffix}_{period_str}_{timestamp}.csv"
    return filename

def print_summary_stats(conn, period_info):
    """打印工资明细统计摘要"""
    query = """
    SELECT 
        COALESCE("人员类别", '未分类') as category_name,
        COUNT(*) as employee_count,
        ROUND(AVG(COALESCE("应发合计", 0)), 2) as avg_gross_pay,
        ROUND(AVG(COALESCE("扣除合计", 0)), 2) as avg_deductions,
        ROUND(AVG(COALESCE("实发合计", 0)), 2) as avg_net_pay,
        ROUND(MIN(COALESCE("应发合计", 0)), 2) as min_gross_pay,
        ROUND(MAX(COALESCE("应发合计", 0)), 2) as max_gross_pay,
        ROUND(SUM(COALESCE("应发合计", 0)), 2) as total_gross_pay,
        ROUND(SUM(COALESCE("实发合计", 0)), 2) as total_net_pay
    FROM reports.v_comprehensive_employee_payroll_optimized
    WHERE "薪资期间名称" LIKE %s
    GROUP BY "人员类别"
    ORDER BY employee_count DESC, category_name
    """
    
    period_name = f"%{period_info['name']}%"
    
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute(query, (period_name,))
        stats = cursor.fetchall()
        
        print(f"\n=== {period_info['name']} 工资明细统计 ===")
        print(f"周期时间: {period_info['start_date'].strftime('%Y-%m-%d')} 至 {period_info['end_date'].strftime('%Y-%m-%d')}")
        print(f"发放日期: {period_info['pay_date'].strftime('%Y-%m-%d')}")
        print("\n各人员类别工资分布:")
        print("-" * 120)
        print(f"{'类别':15} | {'人数':3} | {'平均应发':10} | {'平均扣除':10} | {'平均实发':10} | {'应发范围':20} | {'类别应发总额':12} | {'类别实发总额':12}")
        print("-" * 120)
        
        total_employees = 0
        total_gross = 0
        total_net = 0
        
        for stat in stats:
            gross_range = f"{stat['min_gross_pay']:.0f}~{stat['max_gross_pay']:.0f}"
            print(f"{stat['category_name']:15} | {stat['employee_count']:3}人 | {stat['avg_gross_pay']:8.2f} | {stat['avg_deductions']:8.2f} | {stat['avg_net_pay']:8.2f} | {gross_range:20} | {stat['total_gross_pay']:10.2f} | {stat['total_net_pay']:10.2f}")
            total_employees += stat['employee_count']
            total_gross += stat['total_gross_pay']
            total_net += stat['total_net_pay']
        
        print("-" * 120)
        print(f"{'总计':15} | {total_employees:3}人 | {'':8} | {'':8} | {'':8} | {'':20} | {total_gross:10.2f} | {total_net:10.2f}")
        print()

def print_field_analysis(conn, period_info):
    """分析工资项目字段使用情况"""
    query = """
    SELECT * FROM reports.v_comprehensive_employee_payroll_optimized
    WHERE "薪资期间名称" LIKE %s
    LIMIT 1
    """
    
    period_name = f"%{period_info['name']}%"
    
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute(query, (period_name,))
        
        # 获取字段信息
        fieldnames = [desc[0] for desc in cursor.description]
        
        # 分类字段
        basic_fields = []
        earning_fields = []
        deduction_fields = []
        other_fields = []
        
        for field in fieldnames:
            if field in ['薪资条目ID', '员工ID', '薪资期间ID', '薪资运行ID', '员工编号', '姓名', '身份证号', 
                        '部门名称', '职位名称', '人员类别', '薪资期间名称', '薪资期间开始日期', '薪资期间结束日期',
                        '薪资发放日期', '入职日期', '员工状态']:
                basic_fields.append(field)
            elif field in ['应发合计', '基本工资', '岗位工资', '级别工资', '薪级工资', '绩效工资', 
                          '奖励性绩效工资', '基础性绩效工资', '津贴', '补助', '各种津补贴']:
                earning_fields.append(field)
            elif field in ['扣除合计', '个人所得税', '养老保险个人应缴金额', '医疗保险个人缴纳金额',
                          '失业保险个人应缴金额', '职业年金个人应缴费额', '个人缴住房公积金']:
                deduction_fields.append(field)
            else:
                # 根据字段名判断是收入还是扣除项
                if any(keyword in field for keyword in ['工资', '津贴', '补贴', '奖', '补发', '绩效']):
                    if '扣' not in field and '个人' not in field and '单位' not in field:
                        earning_fields.append(field)
                elif any(keyword in field for keyword in ['个人', '扣', '税']):
                    deduction_fields.append(field)
                else:
                    other_fields.append(field)
        
        print(f"\n=== 工资明细字段结构分析 ===")
        print(f"总字段数: {len(fieldnames)}")
        print(f"基本信息字段: {len(basic_fields)} 个")
        print(f"收入项目字段: {len(earning_fields)} 个") 
        print(f"扣除项目字段: {len(deduction_fields)} 个")
        print(f"其他字段: {len(other_fields)} 个")
        print()

def main():
    parser = argparse.ArgumentParser(
        description='导出指定薪资周期的完整工资明细信息',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
使用示例:
  python export_payroll_details.py 2025-06
  python export_payroll_details.py --period 2025-06 --output 工资明细_202506.csv
  python export_payroll_details.py 2025-06 --stats-only
  python export_payroll_details.py 2025-06 --include-zero-fields
  python export_payroll_details.py 2025-06 --analyze-fields
        '''
    )
    
    parser.add_argument('period', nargs='?', help='薪资周期 (格式: YYYY-MM)')
    parser.add_argument('--period', dest='period_arg', help='薪资周期 (格式: YYYY-MM)')
    parser.add_argument('--output', '-o', help='输出CSV文件路径')
    parser.add_argument('--stats-only', action='store_true', help='仅显示统计信息，不导出文件')
    parser.add_argument('--include-zero-fields', action='store_true', help='包含所有字段（包括全零字段）')
    parser.add_argument('--analyze-fields', action='store_true', help='分析工资字段结构')
    
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
        suffix = "_完整字段" if args.include_zero_fields else "_有效字段"
        output_file = generate_output_filename(period, suffix)
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
        
        # 分析字段结构
        if args.analyze_fields:
            print_field_analysis(conn, period_info)
        
        # 如果只显示统计信息，则退出
        if args.stats_only:
            print("仅显示统计信息模式，未导出文件。")
            return
        
        # 导出数据
        include_zero = args.include_zero_fields
        print(f"正在导出工资明细数据到: {output_file}")
        print(f"字段过滤模式: {'包含所有字段' if include_zero else '仅包含有效字段（过滤全零字段）'}")
        
        success = export_payroll_details(conn, period_info, output_file, include_zero)
        
        if success:
            print(f"\n导出完成! 文件路径: {os.path.abspath(output_file)}")
            
            # 显示字段提示
            if not include_zero:
                print("\n提示: 已自动过滤掉在所有员工中都为0的工资项目字段")
                print("如需导出所有字段，请使用 --include-zero-fields 参数")
        else:
            print("导出失败!")
            sys.exit(1)
            
    finally:
        conn.close()

if __name__ == '__main__':
    main()