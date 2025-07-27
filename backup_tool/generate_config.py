#!/usr/bin/env python3
"""
直接从 .env 文件生成备份配置（不依赖外部库）
Generate backup config directly from .env files (no external dependencies)
"""

import os
import json
import re
from pathlib import Path

def parse_env_file(env_file_path: Path) -> dict:
    """解析 .env 文件"""
    env_vars = {}
    
    if not env_file_path.exists():
        return env_vars
    
    with open(env_file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            
            # 跳过空行和注释
            if not line or line.startswith('#'):
                continue
            
            # 匹配 KEY=VALUE 或 KEY="VALUE"
            match = re.match(r'^([A-Z_][A-Z0-9_]*)=(.*)$', line)
            if match:
                key, value = match.groups()
                
                # 移除引号
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                
                env_vars[key] = value
    
    return env_vars

def load_env_configs() -> dict:
    """从项目的 .env 文件加载配置"""
    
    # 项目根目录
    project_root = Path(__file__).parent.parent
    
    # 加载后端和前端的 .env 文件
    backend_env = project_root / "backend" / ".env"
    frontend_env = project_root / "frontend" / ".env"
    
    config = {}
    
    # 加载后端配置
    if backend_env.exists():
        backend_vars = parse_env_file(backend_env)
        print(f"✅ 加载后端配置: {backend_env}")
        
        config.update({
            "supabase_url": backend_vars.get("SUPABASE_URL"),
            "supabase_service_key": backend_vars.get("SUPABASE_SERVICE_KEY") or backend_vars.get("SUPABASE_KEY"),
            "database_url": backend_vars.get("DATABASE_URL"),
            "supabase_jwt_secret": backend_vars.get("SUPABASE_JWT_SECRET"),
            "supabase_access_token": backend_vars.get("SUPABASE_ACCESS_TOKEN")
        })
    else:
        print(f"⚠️  后端 .env 文件不存在: {backend_env}")
    
    # 加载前端配置（补充信息）
    if frontend_env.exists():
        frontend_vars = parse_env_file(frontend_env)
        print(f"✅ 加载前端配置: {frontend_env}")
        
        # 如果后端没有设置，使用前端的配置
        if not config.get("supabase_url"):
            config["supabase_url"] = frontend_vars.get("VITE_SUPABASE_URL")
        
        if not config.get("supabase_service_key"):
            config["supabase_service_key"] = frontend_vars.get("VITE_SUPABASE_ANON_KEY")
    else:
        print(f"⚠️  前端 .env 文件不存在: {frontend_env}")
    
    return config

def create_backup_config_from_env(output_file: str = "production_config.json") -> str:
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

def show_config_info(env_config: dict):
    """显示配置信息"""
    print("🔧 环境配置信息:")
    for key, value in env_config.items():
        if key in ['supabase_service_key', 'database_url', 'supabase_jwt_secret']:
            # 敏感信息只显示前后几位
            if value:
                if len(value) > 16:
                    masked = f"{value[:8]}...{value[-8:]}"
                else:
                    masked = "***"
                print(f"  {key}: {masked}")
            else:
                print(f"  {key}: (未设置)")
        else:
            print(f"  {key}: {value}")

def main():
    print("🚀 从 .env 文件生成 Supabase 备份配置")
    print("="*50)
    
    try:
        # 加载并显示环境配置
        env_config = load_env_configs()
        print()
        show_config_info(env_config)
        print()
        
        # 生成配置文件
        config_file = create_backup_config_from_env("production_config.json")
        
        if not config_file:
            return
        
        print(f"\n🎉 配置完成!")
        print(f"生成的配置文件: {config_file}")
        print(f"\n现在可以使用以下命令:")
        print(f"  python3 supabase_backup.py --config production_config.json --info")
        print(f"  python3 supabase_backup.py --config production_config.json")
        print(f"  python3 backup_scheduler.py --config production_config.json --start")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        return

if __name__ == "__main__":
    main()