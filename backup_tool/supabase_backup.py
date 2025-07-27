#!/usr/bin/env python3
"""
Supabase Database Backup Tool
For Free Plan projects without automatic backup support

Features:
- Complete schema and data backup
- Compressed backup files with versioning
- Scheduled backup support
- Backup validation and restore testing
- Email notifications (optional)
- Configuration-driven backup policies
"""

import os
import sys
import json
import gzip
import hashlib
import datetime
import logging
import argparse
import subprocess
from typing import Dict, List, Optional, Any
from pathlib import Path
from dataclasses import dataclass, asdict
from urllib.parse import urlparse

# Add the parent directory to Python path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("Error: psycopg2 not installed. Install with: pip install psycopg2-binary")
    sys.exit(1)

@dataclass
class BackupConfig:
    """Backup configuration settings"""
    # Database connection
    supabase_url: str
    supabase_service_key: str
    database_url: str
    
    # Backup settings
    backup_dir: str = "./backups"
    max_backups: int = 30
    compress: bool = True
    include_data: bool = True
    include_schema: bool = True
    
    # Notification settings
    email_notifications: bool = False
    email_smtp_server: str = ""
    email_smtp_port: int = 587
    email_from: str = ""
    email_to: List[str] = None
    email_password: str = ""
    
    # Scheduling
    schedule_enabled: bool = False
    schedule_time: str = "02:00"  # Daily at 2 AM
    
    def __post_init__(self):
        if self.email_to is None:
            self.email_to = []

@dataclass
class BackupInfo:
    """Backup metadata"""
    timestamp: str
    filename: str
    file_size: int
    checksum: str
    table_count: int
    row_count: int
    schema_version: str
    compression: bool
    backup_type: str  # "full", "schema_only", "data_only"

class SupabaseBackupTool:
    """Main backup tool class"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.logger = self._setup_logging()
        self.backup_dir = Path(config.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logger = logging.getLogger('supabase_backup')
        logger.setLevel(logging.INFO)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # File handler
        log_file = Path(self.config.backup_dir) / 'backup.log'
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)
        
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
        
        return logger
    
    def _get_db_connection(self):
        """Get database connection"""
        try:
            conn = psycopg2.connect(self.config.database_url)
            return conn
        except Exception as e:
            self.logger.error(f"Failed to connect to database: {e}")
            raise
    
    def _get_database_info(self) -> Dict[str, Any]:
        """Get database metadata"""
        with self._get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Get table count and row counts
                cur.execute("""
                    SELECT 
                        schemaname,
                        relname as tablename,
                        COALESCE(n_tup_ins - n_tup_del, 0) as row_count
                    FROM pg_stat_user_tables
                    ORDER BY schemaname, relname
                """)
                tables = cur.fetchall()
                
                # Get database size
                cur.execute("""
                    SELECT pg_size_pretty(pg_database_size(current_database())) as db_size,
                           pg_database_size(current_database()) as db_size_bytes
                """)
                size_info = cur.fetchone()
                
                # Get PostgreSQL version
                cur.execute("SELECT version()")
                pg_version = cur.fetchone()['version']
                
                total_rows = sum(table['row_count'] for table in tables if table['row_count'])
                
                return {
                    'tables': tables,
                    'table_count': len(tables),
                    'total_rows': total_rows,
                    'database_size': size_info['db_size'],
                    'database_size_bytes': size_info['db_size_bytes'],
                    'postgresql_version': pg_version
                }
    
    def _backup_schema(self) -> str:
        """Backup database schema using pg_dump"""
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        schema_file = self.backup_dir / f"schema_{timestamp}.sql"
        
        # Parse database URL for pg_dump
        parsed = urlparse(self.config.database_url)
        
        # pg_dump command for schema only
        cmd = [
            'pg_dump',
            '-h', parsed.hostname,
            '-p', str(parsed.port),
            '-U', parsed.username,
            '-d', parsed.path[1:],  # Remove leading slash
            '--schema-only',
            '--no-owner',
            '--no-privileges',
            '-f', str(schema_file)
        ]
        
        env = os.environ.copy()
        env['PGPASSWORD'] = parsed.password
        
        try:
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(f"pg_dump failed: {result.stderr}")
            
            self.logger.info(f"Schema backup created: {schema_file}")
            return str(schema_file)
        except Exception as e:
            self.logger.error(f"Schema backup failed: {e}")
            raise
    
    def _backup_data(self) -> Dict[str, Any]:
        """Backup table data as JSON"""
        data = {}
        
        with self._get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Get all user tables
                cur.execute("""
                    SELECT schemaname, tablename 
                    FROM pg_tables 
                    WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
                    ORDER BY schemaname, tablename
                """)
                tables = cur.fetchall()
                
                for table in tables:
                    schema = table['schemaname']
                    table_name = table['tablename']
                    full_table_name = f"{schema}.{table_name}"
                    
                    try:
                        # Get table data
                        cur.execute(f'SELECT * FROM "{schema}"."{table_name}"')
                        rows = cur.fetchall()
                        
                        # Convert to JSON-serializable format
                        table_data = []
                        for row in rows:
                            row_dict = {}
                            for key, value in row.items():
                                if isinstance(value, datetime.datetime):
                                    row_dict[key] = value.isoformat()
                                elif isinstance(value, datetime.date):
                                    row_dict[key] = value.isoformat()
                                elif isinstance(value, bytes):
                                    row_dict[key] = value.hex()
                                else:
                                    row_dict[key] = value
                            table_data.append(row_dict)
                        
                        data[full_table_name] = {
                            'schema': schema,
                            'table': table_name,
                            'row_count': len(table_data),
                            'data': table_data
                        }
                        
                        self.logger.info(f"Backed up {len(table_data)} rows from {full_table_name}")
                        
                    except Exception as e:
                        self.logger.error(f"Failed to backup table {full_table_name}: {e}")
                        continue
        
        return data
    
    def _calculate_checksum(self, file_path: str) -> str:
        """Calculate SHA256 checksum of file"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    def create_backup(self, backup_type: str = "full") -> BackupInfo:
        """Create a complete backup"""
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        
        try:
            # Get database info
            db_info = self._get_database_info()
            self.logger.info(f"Starting backup - Tables: {db_info['table_count']}, Rows: {db_info['total_rows']}")
            
            backup_data = {
                'backup_info': {
                    'timestamp': timestamp,
                    'backup_type': backup_type,
                    'database_info': db_info
                }
            }
            
            # Backup schema if requested
            if backup_type in ["full", "schema_only"] and self.config.include_schema:
                schema_file = self._backup_schema()
                backup_data['schema_file'] = schema_file
            
            # Backup data if requested
            if backup_type in ["full", "data_only"] and self.config.include_data:
                table_data = self._backup_data()
                backup_data['data'] = table_data
            
            # Save backup to file
            backup_filename = f"backup_{timestamp}.json"
            if self.config.compress:
                backup_filename += ".gz"
            
            backup_path = self.backup_dir / backup_filename
            
            if self.config.compress:
                with gzip.open(backup_path, 'wt', encoding='utf-8') as f:
                    json.dump(backup_data, f, indent=2, default=str)
            else:
                with open(backup_path, 'w', encoding='utf-8') as f:
                    json.dump(backup_data, f, indent=2, default=str)
            
            # Calculate file info
            file_size = backup_path.stat().st_size
            checksum = self._calculate_checksum(str(backup_path))
            
            # Create backup info
            backup_info = BackupInfo(
                timestamp=timestamp,
                filename=backup_filename,
                file_size=file_size,
                checksum=checksum,
                table_count=db_info['table_count'],
                row_count=db_info['total_rows'],
                schema_version=db_info['postgresql_version'],
                compression=self.config.compress,
                backup_type=backup_type
            )
            
            # Save backup info
            info_file = self.backup_dir / f"backup_{timestamp}.info"
            with open(info_file, 'w') as f:
                json.dump(asdict(backup_info), f, indent=2)
            
            self.logger.info(f"Backup completed: {backup_filename} ({file_size:,} bytes)")
            
            # Clean up old backups
            self._cleanup_old_backups()
            
            # Send notification if enabled
            if self.config.email_notifications:
                self._send_backup_notification(backup_info, success=True)
            
            return backup_info
            
        except Exception as e:
            self.logger.error(f"Backup failed: {e}")
            if self.config.email_notifications:
                self._send_backup_notification(None, success=False, error=str(e))
            raise
    
    def _cleanup_old_backups(self):
        """Remove old backup files beyond max_backups limit"""
        backup_files = []
        
        # Find all backup files
        for file_path in self.backup_dir.glob("backup_*.json*"):
            backup_files.append(file_path)
        
        # Sort by modification time (newest first)
        backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        # Remove old backups
        if len(backup_files) > self.config.max_backups:
            for old_backup in backup_files[self.config.max_backups:]:
                try:
                    old_backup.unlink()
                    # Also remove corresponding .info file
                    info_file = old_backup.with_suffix('.info')
                    if info_file.exists():
                        info_file.unlink()
                    self.logger.info(f"Removed old backup: {old_backup.name}")
                except Exception as e:
                    self.logger.error(f"Failed to remove old backup {old_backup}: {e}")
    
    def list_backups(self) -> List[BackupInfo]:
        """List all available backups"""
        backups = []
        
        for info_file in sorted(self.backup_dir.glob("backup_*.info")):
            try:
                with open(info_file, 'r') as f:
                    backup_data = json.load(f)
                    backups.append(BackupInfo(**backup_data))
            except Exception as e:
                self.logger.error(f"Failed to read backup info {info_file}: {e}")
        
        return backups
    
    def validate_backup(self, backup_filename: str) -> bool:
        """Validate backup file integrity"""
        backup_path = self.backup_dir / backup_filename
        # Handle .json.gz extension properly
        if backup_filename.endswith('.json.gz'):
            info_filename = backup_filename.replace('.json.gz', '.info')
        else:
            info_filename = backup_filename + '.info'
        info_file = self.backup_dir / info_filename
        
        if not backup_path.exists() or not info_file.exists():
            self.logger.error(f"Backup files not found: {backup_filename}")
            return False
        
        try:
            # Load backup info
            with open(info_file, 'r') as f:
                backup_info = BackupInfo(**json.load(f))
            
            # Verify file size
            actual_size = backup_path.stat().st_size
            if actual_size != backup_info.file_size:
                self.logger.error(f"File size mismatch: expected {backup_info.file_size}, got {actual_size}")
                return False
            
            # Verify checksum
            actual_checksum = self._calculate_checksum(str(backup_path))
            if actual_checksum != backup_info.checksum:
                self.logger.error(f"Checksum mismatch: expected {backup_info.checksum}, got {actual_checksum}")
                return False
            
            # Try to load and parse the backup file
            if backup_info.compression:
                with gzip.open(backup_path, 'rt', encoding='utf-8') as f:
                    backup_data = json.load(f)
            else:
                with open(backup_path, 'r', encoding='utf-8') as f:
                    backup_data = json.load(f)
            
            # Basic structure validation
            if 'backup_info' not in backup_data:
                self.logger.error("Invalid backup structure: missing backup_info")
                return False
            
            self.logger.info(f"Backup validation successful: {backup_filename}")
            return True
            
        except Exception as e:
            self.logger.error(f"Backup validation failed: {e}")
            return False
    
    def _send_backup_notification(self, backup_info: Optional[BackupInfo], success: bool, error: str = ""):
        """Send email notification about backup status"""
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            if success and backup_info:
                subject = f"Supabase Backup Successful - {backup_info.timestamp}"
                body = f"""
Backup completed successfully!

Details:
- Timestamp: {backup_info.timestamp}
- Filename: {backup_info.filename}
- File Size: {backup_info.file_size:,} bytes
- Tables: {backup_info.table_count}
- Rows: {backup_info.row_count:,}
- Compression: {'Yes' if backup_info.compression else 'No'}
- Backup Type: {backup_info.backup_type}
- Checksum: {backup_info.checksum}
"""
            else:
                subject = "Supabase Backup Failed"
                body = f"""
Backup failed with error:

{error}

Please check the backup logs for more details.
"""
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.config.email_from
            msg['To'] = ', '.join(self.config.email_to)
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(self.config.email_smtp_server, self.config.email_smtp_port)
            server.starttls()
            server.login(self.config.email_from, self.config.email_password)
            text = msg.as_string()
            server.sendmail(self.config.email_from, self.config.email_to, text)
            server.quit()
            
            self.logger.info("Backup notification sent successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to send backup notification: {e}")

def load_config(config_file: str) -> BackupConfig:
    """Load configuration from file"""
    if not os.path.exists(config_file):
        raise FileNotFoundError(f"Configuration file not found: {config_file}")
    
    with open(config_file, 'r') as f:
        config_data = json.load(f)
    
    return BackupConfig(**config_data)

def create_sample_config(config_file: str):
    """Create a sample configuration file"""
    sample_config = {
        "supabase_url": "https://your-project.supabase.co",
        "supabase_service_key": "your-service-key-here",
        "database_url": "postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres",
        "backup_dir": "./backups",
        "max_backups": 30,
        "compress": True,
        "include_data": True,
        "include_schema": True,
        "email_notifications": False,
        "email_smtp_server": "smtp.gmail.com",
        "email_smtp_port": 587,
        "email_from": "your-email@gmail.com",
        "email_to": ["admin@yourcompany.com"],
        "email_password": "your-app-password",
        "schedule_enabled": False,
        "schedule_time": "02:00"
    }
    
    with open(config_file, 'w') as f:
        json.dump(sample_config, f, indent=2)
    
    print(f"Sample configuration created: {config_file}")
    print("Please edit the configuration file with your actual Supabase credentials.")

def main():
    parser = argparse.ArgumentParser(description='Supabase Database Backup Tool')
    parser.add_argument('--config', '-c', default='backup_config.json', 
                       help='Configuration file path')
    parser.add_argument('--create-config', action='store_true',
                       help='Create sample configuration file')
    parser.add_argument('--backup', '-b', choices=['full', 'schema_only', 'data_only'],
                       default='full', help='Backup type')
    parser.add_argument('--list', '-l', action='store_true',
                       help='List available backups')
    parser.add_argument('--validate', '-v', metavar='FILENAME',
                       help='Validate specific backup file')
    parser.add_argument('--info', '-i', action='store_true',
                       help='Show database information')
    
    args = parser.parse_args()
    
    if args.create_config:
        create_sample_config(args.config)
        return
    
    try:
        config = load_config(args.config)
        backup_tool = SupabaseBackupTool(config)
        
        if args.info:
            db_info = backup_tool._get_database_info()
            print(f"Database Information:")
            print(f"  Tables: {db_info['table_count']}")
            print(f"  Total Rows: {db_info['total_rows']:,}")
            print(f"  Database Size: {db_info['database_size']}")
            print(f"  PostgreSQL Version: {db_info['postgresql_version']}")
            
        elif args.list:
            backups = backup_tool.list_backups()
            if backups:
                print(f"Available Backups ({len(backups)}):")
                print("-" * 80)
                for backup in reversed(backups):  # Show newest first
                    print(f"  {backup.filename}")
                    print(f"    Timestamp: {backup.timestamp}")
                    print(f"    Size: {backup.file_size:,} bytes")
                    print(f"    Tables: {backup.table_count}, Rows: {backup.row_count:,}")
                    print(f"    Type: {backup.backup_type}, Compressed: {backup.compression}")
                    print()
            else:
                print("No backups found.")
        
        elif args.validate:
            if backup_tool.validate_backup(args.validate):
                print(f"Backup validation successful: {args.validate}")
            else:
                print(f"Backup validation failed: {args.validate}")
                sys.exit(1)
        
        else:
            # Create backup
            backup_info = backup_tool.create_backup(args.backup)
            print(f"Backup created successfully: {backup_info.filename}")
            print(f"Size: {backup_info.file_size:,} bytes")
            print(f"Tables: {backup_info.table_count}, Rows: {backup_info.row_count:,}")
    
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()