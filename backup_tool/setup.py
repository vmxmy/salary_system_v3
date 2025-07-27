#!/usr/bin/env python3
"""
Supabase Backup Tool Setup Script
Automated setup for backup tool configuration
"""

import os
import json
import getpass
import subprocess
import sys
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    print("检查依赖项...")
    
    # Check Python packages
    try:
        import psycopg2
        print("✅ psycopg2 已安装")
    except ImportError:
        print("❌ psycopg2 未安装，正在安装...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
        print("✅ psycopg2 安装完成")
    
    try:
        import schedule
        print("✅ schedule 已安装")
    except ImportError:
        print("❌ schedule 未安装，正在安装...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "schedule"])
        print("✅ schedule 安装完成")
    
    # Check pg_dump
    try:
        subprocess.run(['pg_dump', '--version'], capture_output=True, check=True)
        print("✅ pg_dump 已安装")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ pg_dump 未安装")
        print("请安装 PostgreSQL 客户端:")
        print("  macOS: brew install postgresql")
        print("  Ubuntu: sudo apt install postgresql-client")
        print("  CentOS: sudo yum install postgresql")
        return False
    
    return True

def collect_supabase_info():
    """收集 Supabase 项目信息"""
    print("\n配置 Supabase 连接信息")
    print("请在 Supabase 项目设置中找到以下信息:")
    print("- Project Settings → API → Project URL")
    print("- Project Settings → API → service_role key")
    print("- Project Settings → Database → Connection string")
    print()
    
    config = {}
    
    # Supabase URL
    config['supabase_url'] = input("Supabase 项目 URL: ").strip()
    if not config['supabase_url'].startswith('https://'):
        config['supabase_url'] = 'https://' + config['supabase_url']
    
    # Service key
    config['supabase_service_key'] = getpass.getpass("Service Role Key (隐藏输入): ").strip()
    
    # Database URL
    print("\n数据库连接字符串示例:")
    print("postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres")
    config['database_url'] = getpass.getpass("数据库连接字符串 (隐藏输入): ").strip()
    
    return config

def collect_backup_settings():
    """收集备份设置"""
    print("\n配置备份设置")
    
    settings = {}
    
    # Backup directory
    default_dir = "./backups"
    backup_dir = input(f"备份目录 [{default_dir}]: ").strip() or default_dir
    settings['backup_dir'] = backup_dir
    
    # Max backups
    default_max = 30
    try:
        max_backups = int(input(f"最大备份数量 [{default_max}]: ").strip() or default_max)
    except ValueError:
        max_backups = default_max
    settings['max_backups'] = max_backups
    
    # Compression
    compress = input("启用压缩? [Y/n]: ").strip().lower()
    settings['compress'] = compress != 'n'
    
    # Include data and schema
    settings['include_data'] = True
    settings['include_schema'] = True
    
    return settings

def collect_schedule_settings():
    """收集调度设置"""
    print("\n配置备份调度")
    
    schedule_enabled = input("启用自动备份调度? [Y/n]: ").strip().lower()
    if schedule_enabled == 'n':
        return {
            'schedule_enabled': False,
            'schedule_time': "02:00"
        }
    
    default_time = "02:00"
    schedule_time = input(f"每日备份时间 (HH:MM) [{default_time}]: ").strip() or default_time
    
    return {
        'schedule_enabled': True,
        'schedule_time': schedule_time
    }

def collect_email_settings():
    """收集邮件通知设置"""
    print("\n配置邮件通知 (可选)")
    
    email_enabled = input("启用邮件通知? [y/N]: ").strip().lower()
    if email_enabled != 'y':
        return {
            'email_notifications': False,
            'email_smtp_server': "",
            'email_smtp_port': 587,
            'email_from': "",
            'email_to': [],
            'email_password': ""
        }
    
    settings = {'email_notifications': True}
    
    # SMTP settings
    print("\n常用 SMTP 服务器:")
    print("1. Gmail: smtp.gmail.com:587")
    print("2. Outlook: smtp.live.com:587")
    print("3. QQ: smtp.qq.com:587")
    print("4. 163: smtp.163.com:587")
    
    smtp_server = input("SMTP 服务器: ").strip()
    settings['email_smtp_server'] = smtp_server
    
    try:
        smtp_port = int(input("SMTP 端口 [587]: ").strip() or "587")
    except ValueError:
        smtp_port = 587
    settings['email_smtp_port'] = smtp_port
    
    # Email addresses
    settings['email_from'] = input("发送邮箱: ").strip()
    
    email_to = input("接收邮箱 (多个用逗号分隔): ").strip()
    settings['email_to'] = [email.strip() for email in email_to.split(',') if email.strip()]
    
    settings['email_password'] = getpass.getpass("邮箱密码/应用密码 (隐藏输入): ").strip()
    
    return settings

def test_connection(config):
    """测试数据库连接"""
    print("\n测试数据库连接...")
    
    try:
        import psycopg2
        conn = psycopg2.connect(config['database_url'])
        with conn.cursor() as cur:
            cur.execute("SELECT version()")
            version = cur.fetchone()[0]
        conn.close()
        
        print(f"✅ 数据库连接成功")
        print(f"PostgreSQL 版本: {version}")
        return True
        
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False

def create_directories(backup_dir):
    """创建必要的目录"""
    Path(backup_dir).mkdir(parents=True, exist_ok=True)
    print(f"✅ 创建备份目录: {backup_dir}")

def save_config(config, config_file):
    """保存配置文件"""
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    # Set restrictive permissions on config file
    os.chmod(config_file, 0o600)
    print(f"✅ 配置文件已保存: {config_file}")

def create_sample_scripts(config):
    """创建示例脚本"""
    backup_dir = Path(config['backup_dir'])
    scripts_dir = backup_dir / 'scripts'
    scripts_dir.mkdir(exist_ok=True)
    
    # Daily backup script
    daily_script = scripts_dir / 'daily_backup.sh'
    with open(daily_script, 'w') as f:
        f.write(f"""#!/bin/bash
# 每日备份脚本
cd {os.path.dirname(os.path.abspath(__file__))}
python supabase_backup.py --config production_config.json --backup full
""")
    daily_script.chmod(0o755)
    
    # Crontab example
    cron_example = scripts_dir / 'crontab_example.txt'
    with open(cron_example, 'w') as f:
        f.write(f"""# 添加到 crontab 的示例 (crontab -e)
# 每天凌晨 2:00 执行备份
0 2 * * * {daily_script.absolute()}

# 每周日凌晨 1:00 执行 schema 备份
0 1 * * 0 {os.path.dirname(os.path.abspath(__file__))}/supabase_backup.py --config production_config.json --backup schema_only
""")
    
    print(f"✅ 创建示例脚本: {scripts_dir}")

def main():
    print("Supabase 数据库备份工具安装向导")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        print("请安装缺失的依赖项后重新运行安装程序")
        sys.exit(1)
    
    # Collect configuration
    supabase_config = collect_supabase_info()
    backup_settings = collect_backup_settings()
    schedule_settings = collect_schedule_settings()
    email_settings = collect_email_settings()
    
    # Combine all settings
    config = {
        **supabase_config,
        **backup_settings,
        **schedule_settings,
        **email_settings
    }
    
    # Test connection
    if not test_connection(config):
        retry = input("连接失败，是否重新配置? [y/N]: ").strip().lower()
        if retry == 'y':
            main()
            return
        else:
            print("跳过连接测试，继续安装...")
    
    # Create directories
    create_directories(config['backup_dir'])
    
    # Save configuration
    config_file = "production_config.json"
    save_config(config, config_file)
    
    # Create sample scripts
    create_sample_scripts(config)
    
    print("\n安装完成! 🎉")
    print("\n后续步骤:")
    print(f"1. 测试备份: python supabase_backup.py --config {config_file} --info")
    print(f"2. 创建备份: python supabase_backup.py --config {config_file}")
    print(f"3. 启动调度器: python backup_scheduler.py --config {config_file} --start")
    print(f"4. 查看备份: python supabase_backup.py --config {config_file} --list")
    
    if schedule_settings.get('schedule_enabled'):
        print(f"\n⏰ 自动备份已配置为每天 {schedule_settings['schedule_time']} 执行")
        print("可以通过以下方式启动调度器:")
        print(f"   前台运行: python backup_scheduler.py --config {config_file} --start")
        print(f"   后台运行: nohup python backup_scheduler.py --config {config_file} --start &")
        print(f"   系统服务: python backup_scheduler.py --config {config_file} --create-service")

if __name__ == "__main__":
    main()