#!/usr/bin/env python3
"""
Supabase Backup Scheduler
Handles scheduled backups for Free Plan projects

Features:
- Cron-like scheduling
- Multiple backup schedules
- Retry mechanism for failed backups
- Health monitoring
- Systemd service integration
"""

import os
import sys
import time
import json
import logging
import schedule
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

# Import our backup tool
from supabase_backup import SupabaseBackupTool, BackupConfig, load_config

class BackupScheduler:
    """Manages scheduled backup operations"""
    
    def __init__(self, config_file: str):
        self.config_file = config_file
        self.config = load_config(config_file)
        self.backup_tool = SupabaseBackupTool(self.config)
        self.logger = self._setup_logging()
        self.running = False
        self.last_backup_time = None
        self.backup_count = 0
        self.failed_count = 0
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for scheduler"""
        logger = logging.getLogger('backup_scheduler')
        logger.setLevel(logging.INFO)
        
        # File handler for scheduler logs
        log_file = Path(self.config.backup_dir) / 'scheduler.log'
        handler = logging.FileHandler(log_file)
        handler.setLevel(logging.INFO)
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        return logger
    
    def _perform_backup(self, backup_type: str = "full"):
        """Perform scheduled backup with error handling"""
        try:
            self.logger.info(f"Starting scheduled backup ({backup_type})")
            backup_info = self.backup_tool.create_backup(backup_type)
            
            self.last_backup_time = datetime.now()
            self.backup_count += 1
            
            self.logger.info(f"Scheduled backup completed: {backup_info.filename}")
            
            # Update status file
            self._update_status()
            
        except Exception as e:
            self.failed_count += 1
            self.logger.error(f"Scheduled backup failed: {e}")
            self._update_status()
            
            # Retry logic
            self._schedule_retry()
    
    def _schedule_retry(self):
        """Schedule backup retry after failure"""
        retry_delay = 30  # 30 minutes
        retry_time = datetime.now() + timedelta(minutes=retry_delay)
        
        self.logger.info(f"Scheduling backup retry at {retry_time}")
        
        def retry_backup():
            time.sleep(retry_delay * 60)
            if self.running:
                self._perform_backup()
        
        retry_thread = threading.Thread(target=retry_backup)
        retry_thread.daemon = True
        retry_thread.start()
    
    def _update_status(self):
        """Update scheduler status file"""
        status = {
            'last_run': datetime.now().isoformat(),
            'last_backup_time': self.last_backup_time.isoformat() if self.last_backup_time else None,
            'backup_count': self.backup_count,
            'failed_count': self.failed_count,
            'running': self.running,
            'config_file': self.config_file
        }
        
        status_file = Path(self.config.backup_dir) / 'scheduler_status.json'
        with open(status_file, 'w') as f:
            json.dump(status, f, indent=2)
    
    def setup_schedules(self):
        """Setup backup schedules based on configuration"""
        if not self.config.schedule_enabled:
            self.logger.info("Scheduling is disabled in configuration")
            return
        
        # Daily full backup
        schedule.every().day.at(self.config.schedule_time).do(
            self._perform_backup, "full"
        )
        self.logger.info(f"Scheduled daily full backup at {self.config.schedule_time}")
        
        # Weekly schema-only backup (for quick recovery testing)
        schedule.every().sunday.at("01:00").do(
            self._perform_backup, "schema_only"
        )
        self.logger.info("Scheduled weekly schema backup on Sunday at 01:00")
        
        # Monthly verification (validate latest backup)
        schedule.every().month.do(self._verify_backups)
        self.logger.info("Scheduled monthly backup verification")
    
    def _verify_backups(self):
        """Verify integrity of recent backups"""
        try:
            backups = self.backup_tool.list_backups()
            if not backups:
                self.logger.warning("No backups found for verification")
                return
            
            # Verify the most recent backup
            latest_backup = backups[-1]
            if self.backup_tool.validate_backup(latest_backup.filename):
                self.logger.info(f"Backup verification successful: {latest_backup.filename}")
            else:
                self.logger.error(f"Backup verification failed: {latest_backup.filename}")
                # Trigger immediate backup if verification fails
                self._perform_backup()
                
        except Exception as e:
            self.logger.error(f"Backup verification failed: {e}")
    
    def start(self):
        """Start the scheduler"""
        self.logger.info("Starting backup scheduler")
        self.running = True
        self.setup_schedules()
        self._update_status()
        
        try:
            while self.running:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            self.logger.info("Scheduler stopped by user")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the scheduler"""
        self.logger.info("Stopping backup scheduler")
        self.running = False
        self._update_status()
    
    def status(self) -> Dict:
        """Get scheduler status"""
        status_file = Path(self.config.backup_dir) / 'scheduler_status.json'
        if status_file.exists():
            with open(status_file, 'r') as f:
                return json.load(f)
        return {'status': 'not_running'}

def create_systemd_service(config_file: str, service_name: str = "supabase-backup"):
    """Create systemd service file for backup scheduler"""
    
    service_content = f"""[Unit]
Description=Supabase Database Backup Scheduler
After=network.target

[Service]
Type=simple
User=backup
Group=backup
WorkingDirectory={os.path.dirname(os.path.abspath(__file__))}
ExecStart=/usr/bin/python3 {os.path.abspath(__file__)} --start --config {config_file}
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""
    
    service_file = f"/etc/systemd/system/{service_name}.service"
    
    print(f"Systemd service configuration:")
    print(service_content)
    print(f"\nTo install:")
    print(f"1. Save the above content to {service_file}")
    print(f"2. sudo systemctl daemon-reload")
    print(f"3. sudo systemctl enable {service_name}")
    print(f"4. sudo systemctl start {service_name}")
    print(f"5. sudo systemctl status {service_name}")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Supabase Backup Scheduler')
    parser.add_argument('--config', '-c', default='backup_config.json',
                       help='Configuration file path')
    parser.add_argument('--start', action='store_true',
                       help='Start the scheduler')
    parser.add_argument('--status', action='store_true',
                       help='Show scheduler status')
    parser.add_argument('--backup-now', choices=['full', 'schema_only', 'data_only'],
                       help='Run immediate backup')
    parser.add_argument('--verify', action='store_true',
                       help='Verify recent backups')
    parser.add_argument('--create-service', action='store_true',
                       help='Create systemd service configuration')
    
    args = parser.parse_args()
    
    try:
        if args.create_service:
            create_systemd_service(args.config)
            return
        
        scheduler = BackupScheduler(args.config)
        
        if args.status:
            status = scheduler.status()
            print(f"Scheduler Status:")
            for key, value in status.items():
                print(f"  {key}: {value}")
        
        elif args.backup_now:
            scheduler._perform_backup(args.backup_now)
        
        elif args.verify:
            scheduler._verify_backups()
        
        elif args.start:
            scheduler.start()
        
        else:
            print("No action specified. Use --help for options.")
    
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()