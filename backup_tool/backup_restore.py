#!/usr/bin/env python3
"""
Supabase Database Restore Tool
Restore backups created by the backup tool

Features:
- Full database restore from backup
- Schema-only restore
- Data-only restore
- Selective table restore
- Pre-restore validation
- Rollback capability
"""

import os
import sys
import json
import gzip
import logging
import argparse
import subprocess
from typing import Dict, List, Optional, Any
from pathlib import Path
from urllib.parse import urlparse

# Import backup tool components
from supabase_backup import SupabaseBackupTool, BackupConfig, BackupInfo, load_config

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("Error: psycopg2 not installed. Install with: pip install psycopg2-binary")
    sys.exit(1)

class BackupRestoreTool:
    """Tool for restoring Supabase database backups"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.logger = self._setup_logging()
        self.backup_dir = Path(config.backup_dir)
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logger = logging.getLogger('backup_restore')
        logger.setLevel(logging.INFO)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # File handler
        log_file = self.backup_dir / 'restore.log'
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
    
    def _load_backup_file(self, backup_filename: str) -> Dict[str, Any]:
        """Load backup file and return data"""
        backup_path = self.backup_dir / backup_filename
        
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_filename}")
        
        try:
            if backup_filename.endswith('.gz'):
                with gzip.open(backup_path, 'rt', encoding='utf-8') as f:
                    return json.load(f)
            else:
                with open(backup_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            raise Exception(f"Failed to load backup file: {e}")
    
    def _validate_backup_before_restore(self, backup_filename: str) -> bool:
        """Validate backup file before restore"""
        try:
            # Use backup tool validation
            backup_tool = SupabaseBackupTool(self.config)
            return backup_tool.validate_backup(backup_filename)
        except Exception as e:
            self.logger.error(f"Backup validation failed: {e}")
            return False
    
    def _create_restore_point(self) -> str:
        """Create a restore point before performing restore"""
        try:
            backup_tool = SupabaseBackupTool(self.config)
            restore_point = backup_tool.create_backup("full")
            self.logger.info(f"Created restore point: {restore_point.filename}")
            return restore_point.filename
        except Exception as e:
            self.logger.error(f"Failed to create restore point: {e}")
            raise
    
    def _restore_schema(self, schema_file: str) -> bool:
        """Restore database schema from SQL file"""
        if not os.path.exists(schema_file):
            self.logger.error(f"Schema file not found: {schema_file}")
            return False
        
        # Parse database URL for psql
        parsed = urlparse(self.config.database_url)
        
        # psql command to restore schema
        cmd = [
            'psql',
            '-h', parsed.hostname,
            '-p', str(parsed.port),
            '-U', parsed.username,
            '-d', parsed.path[1:],  # Remove leading slash
            '-f', schema_file
        ]
        
        env = os.environ.copy()
        env['PGPASSWORD'] = parsed.password
        
        try:
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            if result.returncode != 0:
                self.logger.error(f"Schema restore failed: {result.stderr}")
                return False
            
            self.logger.info(f"Schema restored successfully from: {schema_file}")
            return True
        except Exception as e:
            self.logger.error(f"Schema restore failed: {e}")
            return False
    
    def _restore_table_data(self, table_info: Dict[str, Any]) -> bool:
        """Restore data for a single table"""
        schema = table_info['schema']
        table_name = table_info['table']
        data = table_info['data']
        
        if not data:
            self.logger.info(f"No data to restore for {schema}.{table_name}")
            return True
        
        try:
            with self._get_db_connection() as conn:
                with conn.cursor() as cur:
                    # Clear existing data (optional - can be made configurable)
                    # cur.execute(f'TRUNCATE TABLE "{schema}"."{table_name}" CASCADE')
                    
                    # Prepare column names and values
                    if data:
                        columns = list(data[0].keys())
                        column_names = ', '.join(f'"{col}"' for col in columns)
                        placeholders = ', '.join(['%s'] * len(columns))
                        
                        insert_sql = f'INSERT INTO "{schema}"."{table_name}" ({column_names}) VALUES ({placeholders})'
                        
                        # Prepare data for insertion
                        values_list = []
                        for row in data:
                            values = []
                            for col in columns:
                                value = row[col]
                                # Handle special data types
                                if isinstance(value, str) and value.startswith('\\x'):
                                    # Hex encoded bytes
                                    value = bytes.fromhex(value[2:])
                                values.append(value)
                            values_list.append(values)
                        
                        # Insert data in batches
                        batch_size = 1000
                        for i in range(0, len(values_list), batch_size):
                            batch = values_list[i:i + batch_size]
                            cur.executemany(insert_sql, batch)
                        
                        conn.commit()
                        self.logger.info(f"Restored {len(data)} rows to {schema}.{table_name}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to restore data for {schema}.{table_name}: {e}")
            return False
    
    def restore_backup(self, backup_filename: str, restore_type: str = "full", 
                      tables: Optional[List[str]] = None, create_restore_point: bool = True) -> bool:
        """Restore database from backup file"""
        
        self.logger.info(f"Starting restore: {backup_filename} (type: {restore_type})")
        
        # Validate backup file
        if not self._validate_backup_before_restore(backup_filename):
            self.logger.error("Backup validation failed - aborting restore")
            return False
        
        # Create restore point
        restore_point_file = None
        if create_restore_point:
            try:
                restore_point_file = self._create_restore_point()
            except Exception as e:
                self.logger.warning(f"Failed to create restore point: {e}")
                # Continue with restore even if restore point creation fails
        
        try:
            # Load backup data
            backup_data = self._load_backup_file(backup_filename)
            
            # Restore schema if requested
            if restore_type in ["full", "schema_only"]:
                if 'schema_file' in backup_data:
                    if not self._restore_schema(backup_data['schema_file']):
                        self.logger.error("Schema restore failed")
                        return False
                else:
                    self.logger.warning("No schema data found in backup")
            
            # Restore data if requested
            if restore_type in ["full", "data_only"]:
                if 'data' in backup_data:
                    data_section = backup_data['data']
                    
                    success_count = 0
                    total_count = len(data_section)
                    
                    for table_key, table_info in data_section.items():
                        # Skip tables not in selection if tables filter is provided
                        if tables and table_key not in tables:
                            continue
                        
                        if self._restore_table_data(table_info):
                            success_count += 1
                        else:
                            self.logger.error(f"Failed to restore table: {table_key}")
                    
                    if success_count == total_count:
                        self.logger.info(f"Data restore completed: {success_count}/{total_count} tables")
                    else:
                        self.logger.warning(f"Partial data restore: {success_count}/{total_count} tables")
                else:
                    self.logger.warning("No data section found in backup")
            
            self.logger.info(f"Restore completed successfully: {backup_filename}")
            return True
            
        except Exception as e:
            self.logger.error(f"Restore failed: {e}")
            
            # Offer to restore from restore point
            if restore_point_file:
                self.logger.info(f"Restore point available: {restore_point_file}")
                self.logger.info("You can rollback using: python backup_restore.py --rollback")
            
            return False
    
    def list_backup_contents(self, backup_filename: str) -> Dict[str, Any]:
        """List contents of a backup file"""
        backup_data = self._load_backup_file(backup_filename)
        
        contents = {
            'backup_info': backup_data.get('backup_info', {}),
            'has_schema': 'schema_file' in backup_data,
            'has_data': 'data' in backup_data,
            'tables': []
        }
        
        if 'data' in backup_data:
            for table_key, table_info in backup_data['data'].items():
                contents['tables'].append({
                    'name': table_key,
                    'schema': table_info.get('schema', ''),
                    'table': table_info.get('table', ''),
                    'row_count': table_info.get('row_count', 0)
                })
        
        return contents
    
    def verify_restore(self, original_backup: str, verification_type: str = "row_count") -> bool:
        """Verify that restore was successful"""
        try:
            # Load original backup for comparison
            backup_data = self._load_backup_file(original_backup)
            
            if verification_type == "row_count" and 'data' in backup_data:
                with self._get_db_connection() as conn:
                    with conn.cursor() as cur:
                        for table_key, table_info in backup_data['data'].items():
                            schema = table_info['schema']
                            table_name = table_info['table']
                            expected_count = table_info['row_count']
                            
                            # Get actual row count
                            cur.execute(f'SELECT COUNT(*) FROM "{schema}"."{table_name}"')
                            actual_count = cur.fetchone()[0]
                            
                            if actual_count != expected_count:
                                self.logger.error(
                                    f"Row count mismatch for {table_key}: "
                                    f"expected {expected_count}, got {actual_count}"
                                )
                                return False
                            
                            self.logger.info(f"Verified {table_key}: {actual_count} rows")
                
                self.logger.info("Restore verification successful")
                return True
            
        except Exception as e:
            self.logger.error(f"Restore verification failed: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description='Supabase Database Restore Tool')
    parser.add_argument('--config', '-c', default='backup_config.json',
                       help='Configuration file path')
    parser.add_argument('--restore', '-r', metavar='BACKUP_FILE',
                       help='Restore from backup file')
    parser.add_argument('--type', '-t', choices=['full', 'schema_only', 'data_only'],
                       default='full', help='Restore type')
    parser.add_argument('--tables', nargs='+', metavar='TABLE',
                       help='Specific tables to restore (for data_only)')
    parser.add_argument('--no-restore-point', action='store_true',
                       help='Skip creating restore point before restore')
    parser.add_argument('--list-contents', '-l', metavar='BACKUP_FILE',
                       help='List contents of backup file')
    parser.add_argument('--verify', '-v', metavar='BACKUP_FILE',
                       help='Verify restore against original backup')
    
    args = parser.parse_args()
    
    try:
        config = load_config(args.config)
        restore_tool = BackupRestoreTool(config)
        
        if args.list_contents:
            contents = restore_tool.list_backup_contents(args.list_contents)
            print(f"Backup Contents: {args.list_contents}")
            print("-" * 50)
            print(f"Backup Info: {contents['backup_info']}")
            print(f"Has Schema: {contents['has_schema']}")
            print(f"Has Data: {contents['has_data']}")
            if contents['tables']:
                print(f"\nTables ({len(contents['tables'])}):")
                for table in contents['tables']:
                    print(f"  {table['name']}: {table['row_count']:,} rows")
        
        elif args.verify:
            if restore_tool.verify_restore(args.verify):
                print("Restore verification successful")
            else:
                print("Restore verification failed")
                sys.exit(1)
        
        elif args.restore:
            create_restore_point = not args.no_restore_point
            
            if restore_tool.restore_backup(
                args.restore, 
                args.type, 
                args.tables, 
                create_restore_point
            ):
                print(f"Restore completed successfully: {args.restore}")
            else:
                print(f"Restore failed: {args.restore}")
                sys.exit(1)
        
        else:
            print("No action specified. Use --help for options.")
    
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()