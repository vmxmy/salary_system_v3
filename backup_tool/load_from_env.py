#!/usr/bin/env python3
"""
从 .env 文件加载 Supabase 配置并生成备份配置
Load Supabase configuration from .env files and generate backup config
"""

import os
import json
import sys
from pathlib import Path
from typing import Dict, Any

try:
    from dotenv import load_dotenv
except ImportError:
    print("Installing python-dotenv...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "python-dotenv"])
    from dotenv import load_dotenv

def load_env_configs() -> Dict[str, Any]:
    """从项目的 .env 文件加载配置"""
    
    # 项目根目录
    project_root = Path(__file__).parent.parent
    
    # 加载后端和前端的 .env 文件
    backend_env = project_root / "backend" / ".env"
    frontend_env = project_root / "frontend" / ".env"
    
    config = {}
    
    # 加载后端配置
    if backend_env.exists():
        load_dotenv(backend_env)
        print(f"✅ 加载后端配置: {backend_env}")
        
        config.update({
            "supabase_url": os.getenv("SUPABASE_URL"),
            "supabase_service_key": os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_KEY")),
            "database_url": os.getenv("DATABASE_URL"),
            "supabase_jwt_secret": os.getenv("SUPABASE_JWT_SECRET"),
            "supabase_access_token": os.getenv("SUPABASE_ACCESS_TOKEN")
        })
    else:
        print(f"⚠️  后端 .env 文件不存在: {backend_env}")
    
    # 加载前端配置（补充信息）
    if frontend_env.exists():
        load_dotenv(frontend_env)
        print(f"✅ 加载前端配置: {frontend_env}")
        
        # 如果后端没有设置，使用前端的配置
        if not config.get("supabase_url"):
            config["supabase_url"] = os.getenv("VITE_SUPABASE_URL")
        
        if not config.get("supabase_service_key"):
            config["supabase_service_key"] = os.getenv("VITE_SUPABASE_ANON_KEY")
    else:
        print(f"⚠️  前端 .env 文件不存在: {frontend_env}")
    
    return config

def create_backup_config_from_env(output_file: str = "backup_config_from_env.json") -> str:
    """从环境变量创建备份配置文件"""
    
    # 加载环境配置
    env_config = load_env_configs()
    
    # 验证必要的配置
    required_fields = ["supabase_url", "supabase_service_key", "database_url"]
    missing_fields = [field for field in required_fields if not env_config.get(field)]
    
    if missing_fields:
        print(f"❌ 缺少必要的配置字段: {missing_fields}")
        print("请检查 .env 文件中的以下配置:")
        for field in missing_fields:
            print(f"  - {field}")
        return None
    
    # 创建完整的备份配置
    backup_config = {
        # Supabase 连接配置
        "supabase_url": env_config["supabase_url"],
        "supabase_service_key": env_config["supabase_service_key"],
        "database_url": env_config["database_url"],
        
        # 备份配置
        "backup_dir": "./backups",
        "max_backups": 30,
        "compress": True,
        "include_data": True,
        "include_schema": True,
        
        # 邮件通知配置（默认关闭）
        "email_notifications": False,
        "email_smtp_server": "smtp.gmail.com",
        "email_smtp_port": 587,
        "email_from": "",
        "email_to": [],
        "email_password": "",
        
        # 调度配置
        "schedule_enabled": True,
        "schedule_time": "02:00"
    }
    
    # 保存配置文件
    output_path = Path(__file__).parent / output_file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(backup_config, f, indent=2, ensure_ascii=False)
    
    # 设置安全权限
    os.chmod(output_path, 0o600)
    
    print(f"✅ 备份配置文件已生成: {output_path}")
    print(f"🔒 文件权限已设置为 600 (仅所有者可读写)")
    
    return str(output_path)

def validate_connection(config_file: str) -> bool:
    """验证数据库连接"""
    try:
        import psycopg2
        
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        print("🔍 测试数据库连接...")
        conn = psycopg2.connect(config['database_url'])
        
        with conn.cursor() as cur:
            cur.execute("SELECT version()")
            version = cur.fetchone()[0]
            
            # 获取数据库基本信息
            cur.execute("""
                SELECT 
                    COUNT(*) as table_count
                FROM information_schema.tables 
                WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            """)
            table_count = cur.fetchone()[0]
            
            cur.execute("SELECT pg_size_pretty(pg_database_size(current_database()))")
            db_size = cur.fetchone()[0]
        
        conn.close()
        
        print(f"✅ 数据库连接成功!")
        print(f"📊 PostgreSQL 版本: {version}")
        print(f"📊 数据表数量: {table_count}")
        print(f"📊 数据库大小: {db_size}")
        
        return True
        
    except ImportError:
        print("❌ psycopg2 未安装，请运行: pip install psycopg2-binary")
        return False
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='从 .env 文件生成备份配置')
    parser.add_argument('--output', '-o', default='backup_config_from_env.json',
                       help='输出配置文件名')
    parser.add_argument('--test-connection', '-t', action='store_true',
                       help='测试数据库连接')
    parser.add_argument('--show-config', '-s', action='store_true',
                       help='显示加载的环境配置')
    
    args = parser.parse_args()
    
    try:
        if args.show_config:
            env_config = load_env_configs()
            print("🔧 环境配置信息:")
            for key, value in env_config.items():
                if key in ['supabase_service_key', 'database_url', 'supabase_jwt_secret']:
                    # 敏感信息只显示前后几位
                    if value:
                        masked = f"{value[:8]}...{value[-8:]}" if len(value) > 16 else "***"
                        print(f"  {key}: {masked}")
                    else:
                        print(f"  {key}: (未设置)")
                else:
                    print(f"  {key}: {value}")
            return
        
        # 生成配置文件
        config_file = create_backup_config_from_env(args.output)
        
        if not config_file:
            sys.exit(1)
        
        # 测试连接
        if args.test_connection:
            if not validate_connection(config_file):
                sys.exit(1)
        
        print(f"\n🎉 配置完成!")
        print(f"现在可以使用以下命令进行备份:")
        print(f"  python supabase_backup.py --config {args.output} --info")
        print(f"  python supabase_backup.py --config {args.output}")
        print(f"  python backup_scheduler.py --config {args.output} --start")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()