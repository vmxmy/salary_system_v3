#!/usr/bin/env python3
"""
Script to analyze the payroll.employee_salary_configs table from the old PostgreSQL database.
This will help understand the contribution base structure for migration.
"""

import psycopg2
import pandas as pd
from datetime import datetime
import json
from decimal import Decimal

# Database connection string
DATABASE_URL = "postgresql+psycopg2://salary_system:caijing123!@8.137.160.207:5432/salary_system"

# Parse the connection string for psycopg2
# Format: postgresql+psycopg2://user:password@host:port/database
parts = DATABASE_URL.replace("postgresql+psycopg2://", "").split("@")
user_pass = parts[0].split(":")
host_port_db = parts[1].split("/")
host_port = host_port_db[0].split(":")

connection_params = {
    'dbname': host_port_db[1],
    'user': user_pass[0],
    'password': user_pass[1],
    'host': host_port[0],
    'port': host_port[1]
}

def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization."""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def analyze_employee_salary_configs():
    """Analyze the payroll.employee_salary_configs table."""
    
    try:
        # Connect to the database
        print("Connecting to database...")
        conn = psycopg2.connect(**connection_params)
        cursor = conn.cursor()
        
        print("\n" + "="*80)
        print("ANALYZING payroll.employee_salary_configs TABLE")
        print("="*80)
        
        # 1. Get column information
        print("\n1. COLUMN INFORMATION:")
        print("-" * 80)
        
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = 'payroll' 
            AND table_name = 'employee_salary_configs'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        
        print(f"{'Column Name':<30} {'Data Type':<20} {'Max Length':<12} {'Nullable':<10} {'Default'}")
        print("-" * 100)
        
        for col in columns:
            col_name, data_type, max_length, nullable, default = col
            max_length_str = str(max_length) if max_length else "N/A"
            default_str = str(default)[:30] if default else "None"
            print(f"{col_name:<30} {data_type:<20} {max_length_str:<12} {nullable:<10} {default_str}")
        
        # 2. Get sample data
        print("\n\n2. SAMPLE DATA (5 rows):")
        print("-" * 80)
        
        cursor.execute("""
            SELECT * FROM payroll.employee_salary_configs 
            ORDER BY employee_id 
            LIMIT 5;
        """)
        
        sample_rows = cursor.fetchall()
        
        # Get column names for display
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns
            WHERE table_schema = 'payroll' 
            AND table_name = 'employee_salary_configs'
            ORDER BY ordinal_position;
        """)
        
        column_names = [col[0] for col in cursor.fetchall()]
        
        # Display sample data
        for i, row in enumerate(sample_rows, 1):
            print(f"\nRow {i}:")
            for j, (col_name, value) in enumerate(zip(column_names, row)):
                # Handle different data types for display
                if value is None:
                    display_value = "NULL"
                elif isinstance(value, (datetime,)):
                    display_value = value.strftime('%Y-%m-%d %H:%M:%S')
                elif isinstance(value, (int, float, Decimal)):
                    display_value = str(value)
                else:
                    display_value = str(value)[:100]  # Truncate long strings
                
                print(f"  {col_name}: {display_value}")
        
        # 3. Get total count
        print("\n\n3. TOTAL RECORD COUNT:")
        print("-" * 80)
        
        cursor.execute("SELECT COUNT(*) FROM payroll.employee_salary_configs;")
        total_count = cursor.fetchone()[0]
        print(f"Total records in payroll.employee_salary_configs: {total_count}")
        
        # 4. Additional analysis - check for contribution base related columns
        print("\n\n4. CONTRIBUTION BASE ANALYSIS:")
        print("-" * 80)
        
        # Look for columns that might contain contribution base data
        contribution_columns = []
        for col in column_names:
            if any(keyword in col.lower() for keyword in ['base', 'contribution', 'social', 'insurance', 'pension', 'medical', 'housing']):
                contribution_columns.append(col)
        
        if contribution_columns:
            print(f"Found {len(contribution_columns)} potential contribution base columns:")
            for col in contribution_columns:
                print(f"  - {col}")
            
            # Get statistics for these columns
            print("\n  Statistics for contribution base columns:")
            for col in contribution_columns:
                cursor.execute(f"""
                    SELECT 
                        MIN({col}) as min_value,
                        MAX({col}) as max_value,
                        AVG({col}) as avg_value,
                        COUNT(DISTINCT {col}) as distinct_values,
                        COUNT({col}) as non_null_count
                    FROM payroll.employee_salary_configs
                    WHERE {col} IS NOT NULL;
                """)
                
                stats = cursor.fetchone()
                if stats and stats[0] is not None:
                    print(f"\n  {col}:")
                    print(f"    Min: {stats[0]}")
                    print(f"    Max: {stats[1]}")
                    print(f"    Avg: {stats[2]:.2f}" if stats[2] else "    Avg: N/A")
                    print(f"    Distinct values: {stats[3]}")
                    print(f"    Non-null count: {stats[4]}")
        else:
            print("No obvious contribution base columns found. Manual inspection needed.")
        
        # 5. Export full schema to JSON for reference
        print("\n\n5. EXPORTING SCHEMA TO JSON:")
        print("-" * 80)
        
        schema_data = {
            'table': 'payroll.employee_salary_configs',
            'columns': [],
            'total_records': total_count,
            'sample_data': []
        }
        
        for col in columns:
            schema_data['columns'].append({
                'name': col[0],
                'type': col[1],
                'max_length': col[2],
                'nullable': col[3],
                'default': str(col[4]) if col[4] else None
            })
        
        # Add sample data
        for row in sample_rows[:3]:  # Just first 3 rows for JSON
            row_dict = {}
            for col_name, value in zip(column_names, row):
                if isinstance(value, datetime):
                    row_dict[col_name] = value.isoformat()
                elif isinstance(value, Decimal):
                    row_dict[col_name] = float(value)
                else:
                    row_dict[col_name] = value
            schema_data['sample_data'].append(row_dict)
        
        # Save to JSON file
        with open('employee_salary_configs_schema.json', 'w', encoding='utf-8') as f:
            json.dump(schema_data, f, indent=2, ensure_ascii=False)
        
        print("Schema exported to employee_salary_configs_schema.json")
        
        # Close connection
        cursor.close()
        conn.close()
        
        print("\n" + "="*80)
        print("Analysis complete!")
        print("="*80)
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    analyze_employee_salary_configs()