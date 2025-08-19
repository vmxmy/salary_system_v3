export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      audit_deletion_log: {
        Row: {
          deleted_at: string | null
          deleted_by: string | null
          deleted_data: Json | null
          id: string
          reason: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_data?: Json | null
          id?: string
          reason?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_data?: Json | null
          id?: string
          reason?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      backup_category_assignments_dates: {
        Row: {
          backup_time: string | null
          effective_end_date: string | null
          effective_start_date: string | null
          id: string | null
          period_id: string | null
        }
        Insert: {
          backup_time?: string | null
          effective_end_date?: string | null
          effective_start_date?: string | null
          id?: string | null
          period_id?: string | null
        }
        Update: {
          backup_time?: string | null
          effective_end_date?: string | null
          effective_start_date?: string | null
          id?: string | null
          period_id?: string | null
        }
        Relationships: []
      }
      backup_contribution_bases_dates: {
        Row: {
          backup_time: string | null
          effective_end_date: string | null
          effective_start_date: string | null
          id: string | null
          period_id: string | null
        }
        Insert: {
          backup_time?: string | null
          effective_end_date?: string | null
          effective_start_date?: string | null
          id?: string | null
          period_id?: string | null
        }
        Update: {
          backup_time?: string | null
          effective_end_date?: string | null
          effective_start_date?: string | null
          id?: string | null
          period_id?: string | null
        }
        Relationships: []
      }
      backup_job_history_dates: {
        Row: {
          backup_time: string | null
          effective_end_date: string | null
          effective_start_date: string | null
          id: string | null
          period_id: string | null
        }
        Insert: {
          backup_time?: string | null
          effective_end_date?: string | null
          effective_start_date?: string | null
          id?: string | null
          period_id?: string | null
        }
        Update: {
          backup_time?: string | null
          effective_end_date?: string | null
          effective_start_date?: string | null
          id?: string | null
          period_id?: string | null
        }
        Relationships: []
      }
      backup_payrolls_dates: {
        Row: {
          backup_time: string | null
          id: string | null
          pay_date: string | null
          pay_period_end: string | null
          pay_period_start: string | null
          period_id: string | null
        }
        Insert: {
          backup_time?: string | null
          id?: string | null
          pay_date?: string | null
          pay_period_end?: string | null
          pay_period_start?: string | null
          period_id?: string | null
        }
        Update: {
          backup_time?: string | null
          id?: string | null
          pay_date?: string | null
          pay_period_end?: string | null
          pay_period_start?: string | null
          period_id?: string | null
        }
        Relationships: []
      }
      backup_special_deductions_dates: {
        Row: {
          backup_time: string | null
          effective_end_date: string | null
          effective_start_date: string | null
          id: string | null
          period_id: string | null
        }
        Insert: {
          backup_time?: string | null
          effective_end_date?: string | null
          effective_start_date?: string | null
          id?: string | null
          period_id?: string | null
        }
        Update: {
          backup_time?: string | null
          effective_end_date?: string | null
          effective_start_date?: string | null
          id?: string | null
          period_id?: string | null
        }
        Relationships: []
      }
      department_id_mapping: {
        Row: {
          new_id: string
          old_id: number
        }
        Insert: {
          new_id: string
          old_id: number
        }
        Update: {
          new_id?: string
          old_id?: number
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_department_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "view_department_payroll_statistics"
            referencedColumns: ["department_id"]
          },
        ]
      }
      deprecated_functions: {
        Row: {
          deprecated_date: string | null
          function_name: string
          id: number
          is_removed: boolean | null
          notes: string | null
          reason: string | null
          removal_target_date: string | null
          removed_date: string | null
          replacement_function: string | null
          schema_name: string
        }
        Insert: {
          deprecated_date?: string | null
          function_name: string
          id?: number
          is_removed?: boolean | null
          notes?: string | null
          reason?: string | null
          removal_target_date?: string | null
          removed_date?: string | null
          replacement_function?: string | null
          schema_name?: string
        }
        Update: {
          deprecated_date?: string | null
          function_name?: string
          id?: number
          is_removed?: boolean | null
          notes?: string | null
          reason?: string | null
          removal_target_date?: string | null
          removed_date?: string | null
          replacement_function?: string | null
          schema_name?: string
        }
        Relationships: []
      }
      employee_bank_accounts: {
        Row: {
          account_holder_name: string
          account_number: string
          bank_name: string
          branch_name: string | null
          created_at: string | null
          effective_end_date: string | null
          effective_start_date: string
          employee_id: string
          id: string
          is_primary: boolean | null
          updated_at: string | null
        }
        Insert: {
          account_holder_name: string
          account_number: string
          bank_name: string
          branch_name?: string | null
          created_at?: string | null
          effective_end_date?: string | null
          effective_start_date: string
          employee_id: string
          id?: string
          is_primary?: boolean | null
          updated_at?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          bank_name?: string
          branch_name?: string | null
          created_at?: string | null
          effective_end_date?: string | null
          effective_start_date?: string
          employee_id?: string
          id?: string
          is_primary?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_bank_accounts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_bank_accounts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_bank_accounts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_bank_accounts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_bank_accounts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_category_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_category_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "employee_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_category_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          employee_category_id: string
          employee_id: string
          id: string
          notes: string | null
          period_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_category_id: string
          employee_id: string
          id?: string
          notes?: string | null
          period_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_category_id?: string
          employee_id?: string
          id?: string
          notes?: string | null
          period_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_category_assignments_employee_category_id_fkey"
            columns: ["employee_category_id"]
            isOneToOne: false
            referencedRelation: "employee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_category_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_category_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_category_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_category_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_category_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_category_assignments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_category_assignments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "employee_category_assignments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "employee_category_assignments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
        ]
      }
      employee_contacts: {
        Row: {
          contact_details: string
          contact_type: Database["public"]["Enums"]["contact_method_type"]
          created_at: string | null
          employee_id: string
          id: string
          is_primary: boolean | null
          updated_at: string | null
        }
        Insert: {
          contact_details: string
          contact_type: Database["public"]["Enums"]["contact_method_type"]
          created_at?: string | null
          employee_id: string
          id?: string
          is_primary?: boolean | null
          updated_at?: string | null
        }
        Update: {
          contact_details?: string
          contact_type?: Database["public"]["Enums"]["contact_method_type"]
          created_at?: string | null
          employee_id?: string
          id?: string
          is_primary?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_contacts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contacts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_contacts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contacts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_contacts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_contribution_bases: {
        Row: {
          contribution_base: number
          created_at: string
          employee_id: string
          id: string
          insurance_type_id: string
          period_id: string | null
        }
        Insert: {
          contribution_base: number
          created_at?: string
          employee_id: string
          id?: string
          insurance_type_id: string
          period_id?: string | null
        }
        Update: {
          contribution_base?: number
          created_at?: string
          employee_id?: string
          id?: string
          insurance_type_id?: string
          period_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_contribution_bases_insurance_type_id_fkey"
            columns: ["insurance_type_id"]
            isOneToOne: false
            referencedRelation: "insurance_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contribution_bases_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contribution_bases_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "employee_contribution_bases_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "employee_contribution_bases_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
          {
            foreignKeyName: "fk_employee_contribution_bases_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_contribution_bases_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_employee_contribution_bases_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_contribution_bases_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_employee_contribution_bases_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          description: string | null
          document_type: string
          employee_id: string
          id: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          description?: string | null
          document_type: string
          employee_id: string
          id?: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          description?: string | null
          document_type?: string
          employee_id?: string
          id?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_employee_documents_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_documents_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_employee_documents_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_documents_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_employee_documents_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_education: {
        Row: {
          created_at: string
          degree: string
          employee_id: string
          field_of_study: string | null
          graduation_date: string | null
          id: string
          institution_name: string | null
          notes: string | null
        }
        Insert: {
          created_at?: string
          degree: string
          employee_id: string
          field_of_study?: string | null
          graduation_date?: string | null
          id?: string
          institution_name?: string | null
          notes?: string | null
        }
        Update: {
          created_at?: string
          degree?: string
          employee_id?: string
          field_of_study?: string | null
          graduation_date?: string | null
          id?: string
          institution_name?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_employee_education_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_education_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_employee_education_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_education_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_employee_education_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_id_mapping: {
        Row: {
          new_id: string
          old_id: number
        }
        Insert: {
          new_id: string
          old_id: number
        }
        Update: {
          new_id?: string
          old_id?: number
        }
        Relationships: []
      }
      employee_job_history: {
        Row: {
          created_at: string
          department_id: string
          employee_id: string
          id: string
          notes: string | null
          period_id: string | null
          position_id: string
          rank_id: string | null
        }
        Insert: {
          created_at?: string
          department_id: string
          employee_id: string
          id?: string
          notes?: string | null
          period_id?: string | null
          position_id: string
          rank_id?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string
          employee_id?: string
          id?: string
          notes?: string | null
          period_id?: string | null
          position_id?: string
          rank_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_job_history_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_job_history_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "view_department_payroll_statistics"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "employee_job_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_job_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_job_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_job_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_job_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_job_history_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_job_history_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "employee_job_history_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "employee_job_history_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
          {
            foreignKeyName: "employee_job_history_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_job_history_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "view_positions_with_details"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "employee_job_history_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "job_ranks"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_special_deductions: {
        Row: {
          claimed_monthly_amount: number
          created_at: string
          deduction_type_id: string
          employee_id: string
          id: string
          period_id: string | null
        }
        Insert: {
          claimed_monthly_amount: number
          created_at?: string
          deduction_type_id: string
          employee_id: string
          id?: string
          period_id?: string | null
        }
        Update: {
          claimed_monthly_amount?: number
          created_at?: string
          deduction_type_id?: string
          employee_id?: string
          id?: string
          period_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_special_deductions_deduction_type_id_fkey"
            columns: ["deduction_type_id"]
            isOneToOne: false
            referencedRelation: "special_deduction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_special_deductions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_special_deductions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "employee_special_deductions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "employee_special_deductions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
          {
            foreignKeyName: "fk_employee_special_deductions_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_special_deductions_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_employee_special_deductions_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_special_deductions_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_employee_special_deductions_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          employee_name: string | null
          employment_status: string
          gender: string | null
          hire_date: string
          id: string
          id_number: string | null
          manager_id: string | null
          termination_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          employee_name?: string | null
          employment_status?: string
          gender?: string | null
          hire_date: string
          id?: string
          id_number?: string | null
          manager_id?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          employee_name?: string | null
          employment_status?: string
          gender?: string | null
          hire_date?: string
          id?: string
          id_number?: string | null
          manager_id?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          config: Json | null
          created_at: string | null
          flag_name: string
          is_enabled: boolean | null
          rollout_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          flag_name: string
          is_enabled?: boolean | null
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          flag_name?: string
          is_enabled?: boolean | null
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      function_cache: {
        Row: {
          cached_data: Json
          created_at: string | null
          data_type: string
          expires_at: string
          hit_count: number | null
          key: string
          last_accessed_at: string | null
        }
        Insert: {
          cached_data: Json
          created_at?: string | null
          data_type?: string
          expires_at: string
          hit_count?: number | null
          key: string
          last_accessed_at?: string | null
        }
        Update: {
          cached_data?: Json
          created_at?: string | null
          data_type?: string
          expires_at?: string
          hit_count?: number | null
          key?: string
          last_accessed_at?: string | null
        }
        Relationships: []
      }
      function_cleanup_log: {
        Row: {
          cleanup_action: string
          cleanup_at: string | null
          cleanup_status: string
          function_name: string
          function_size: string | null
          id: string
          notes: string | null
        }
        Insert: {
          cleanup_action: string
          cleanup_at?: string | null
          cleanup_status: string
          function_name: string
          function_size?: string | null
          id?: string
          notes?: string | null
        }
        Update: {
          cleanup_action?: string
          cleanup_at?: string | null
          cleanup_status?: string
          function_name?: string
          function_size?: string | null
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      function_migration_control: {
        Row: {
          created_at: string | null
          enabled_for_users: string[] | null
          feature_name: string
          is_active: boolean | null
          metadata: Json | null
          rollback_count: number | null
          rollout_percentage: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          enabled_for_users?: string[] | null
          feature_name: string
          is_active?: boolean | null
          metadata?: Json | null
          rollback_count?: number | null
          rollout_percentage?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          enabled_for_users?: string[] | null
          feature_name?: string
          is_active?: boolean | null
          metadata?: Json | null
          rollback_count?: number | null
          rollout_percentage?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      function_performance_log: {
        Row: {
          affected_rows: number | null
          cache_hit: boolean | null
          cache_misses: number | null
          cpu_time_ms: number | null
          error_message: string | null
          error_occurred: boolean | null
          executed_at: string | null
          execution_context: Json | null
          execution_time_ms: number
          function_name: string
          id: string
          input_size: number | null
          memory_usage: number | null
          output_size: number | null
          parameters: Json | null
          result: Json | null
        }
        Insert: {
          affected_rows?: number | null
          cache_hit?: boolean | null
          cache_misses?: number | null
          cpu_time_ms?: number | null
          error_message?: string | null
          error_occurred?: boolean | null
          executed_at?: string | null
          execution_context?: Json | null
          execution_time_ms: number
          function_name: string
          id?: string
          input_size?: number | null
          memory_usage?: number | null
          output_size?: number | null
          parameters?: Json | null
          result?: Json | null
        }
        Update: {
          affected_rows?: number | null
          cache_hit?: boolean | null
          cache_misses?: number | null
          cpu_time_ms?: number | null
          error_message?: string | null
          error_occurred?: boolean | null
          executed_at?: string | null
          execution_context?: Json | null
          execution_time_ms?: number
          function_name?: string
          id?: string
          input_size?: number | null
          memory_usage?: number | null
          output_size?: number | null
          parameters?: Json | null
          result?: Json | null
        }
        Relationships: []
      }
      function_performance_stats: {
        Row: {
          avg_execution_time_ms: number | null
          avg_memory_usage: number | null
          cache_hit_rate: number | null
          created_at: string | null
          failed_calls: number | null
          function_name: string
          id: string
          max_execution_time_ms: number | null
          min_execution_time_ms: number | null
          p50_execution_time_ms: number | null
          p95_execution_time_ms: number | null
          p99_execution_time_ms: number | null
          period_end: string
          period_start: string
          successful_calls: number | null
          total_affected_rows: number | null
          total_cache_hits: number | null
          total_cache_misses: number | null
          total_calls: number | null
        }
        Insert: {
          avg_execution_time_ms?: number | null
          avg_memory_usage?: number | null
          cache_hit_rate?: number | null
          created_at?: string | null
          failed_calls?: number | null
          function_name: string
          id?: string
          max_execution_time_ms?: number | null
          min_execution_time_ms?: number | null
          p50_execution_time_ms?: number | null
          p95_execution_time_ms?: number | null
          p99_execution_time_ms?: number | null
          period_end: string
          period_start: string
          successful_calls?: number | null
          total_affected_rows?: number | null
          total_cache_hits?: number | null
          total_cache_misses?: number | null
          total_calls?: number | null
        }
        Update: {
          avg_execution_time_ms?: number | null
          avg_memory_usage?: number | null
          cache_hit_rate?: number | null
          created_at?: string | null
          failed_calls?: number | null
          function_name?: string
          id?: string
          max_execution_time_ms?: number | null
          min_execution_time_ms?: number | null
          p50_execution_time_ms?: number | null
          p95_execution_time_ms?: number | null
          p99_execution_time_ms?: number | null
          period_end?: string
          period_start?: string
          successful_calls?: number | null
          total_affected_rows?: number | null
          total_cache_hits?: number | null
          total_cache_misses?: number | null
          total_calls?: number | null
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_count: number | null
          error_details: Json | null
          file_name: string | null
          id: string
          import_type: string
          imported_by: string | null
          period_id: string | null
          status: string | null
          success_count: number | null
          total_records: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_count?: number | null
          error_details?: Json | null
          file_name?: string | null
          id?: string
          import_type: string
          imported_by?: string | null
          period_id?: string | null
          status?: string | null
          success_count?: number | null
          total_records?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_count?: number | null
          error_details?: Json | null
          file_name?: string | null
          id?: string
          import_type?: string
          imported_by?: string | null
          period_id?: string | null
          status?: string | null
          success_count?: number | null
          total_records?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_logs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "import_logs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "import_logs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
        ]
      }
      import_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          field_mappings: Json
          id: string
          is_active: boolean
          sample_data: Json | null
          template_name: string
          template_type: string
          template_version: string
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          field_mappings: Json
          id?: string
          is_active?: boolean
          sample_data?: Json | null
          template_name: string
          template_type: string
          template_version?: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          field_mappings?: Json
          id?: string
          is_active?: boolean
          sample_data?: Json | null
          template_name?: string
          template_type?: string
          template_version?: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: []
      }
      insurance_type_category_rules: {
        Row: {
          base_ceiling: number | null
          base_floor: number | null
          created_at: string
          description: string | null
          effective_date: string | null
          employee_category_id: string
          employee_rate: number | null
          employer_rate: number | null
          end_date: string | null
          id: string
          insurance_type_id: string
          is_applicable: boolean
          updated_at: string
        }
        Insert: {
          base_ceiling?: number | null
          base_floor?: number | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          employee_category_id: string
          employee_rate?: number | null
          employer_rate?: number | null
          end_date?: string | null
          id?: string
          insurance_type_id: string
          is_applicable?: boolean
          updated_at?: string
        }
        Update: {
          base_ceiling?: number | null
          base_floor?: number | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          employee_category_id?: string
          employee_rate?: number | null
          employer_rate?: number | null
          end_date?: string | null
          id?: string
          insurance_type_id?: string
          is_applicable?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_type_category_rules_employee_category_id_fkey"
            columns: ["employee_category_id"]
            isOneToOne: false
            referencedRelation: "employee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_type_category_rules_insurance_type_id_fkey"
            columns: ["insurance_type_id"]
            isOneToOne: false
            referencedRelation: "insurance_types"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          system_key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          system_key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          system_key?: string
        }
        Relationships: []
      }
      job_rank_id_mapping: {
        Row: {
          new_id: string
          old_id: number
        }
        Insert: {
          new_id: string
          old_id: number
        }
        Update: {
          new_id?: string
          old_id?: number
        }
        Relationships: []
      }
      job_ranks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      migration_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: number
          operation_type: string
          period: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: number
          operation_type: string
          period: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: number
          operation_type?: string
          period?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payroll_approval_logs: {
        Row: {
          action: string
          comments: string | null
          created_at: string | null
          from_status: string
          id: string
          operator_id: string | null
          operator_name: string | null
          payroll_id: string
          to_status: string
        }
        Insert: {
          action: string
          comments?: string | null
          created_at?: string | null
          from_status: string
          id?: string
          operator_id?: string | null
          operator_name?: string | null
          payroll_id: string
          to_status: string
        }
        Update: {
          action?: string
          comments?: string | null
          created_at?: string | null
          from_status?: string
          id?: string
          operator_id?: string | null
          operator_name?: string | null
          payroll_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_approval_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_approval_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_approval_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "payroll_approval_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "payroll_approval_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["payroll_id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          amount: number
          component_id: string
          created_at: string
          id: string
          notes: string | null
          payroll_id: string
          period_id: string | null
        }
        Insert: {
          amount: number
          component_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payroll_id: string
          period_id?: string | null
        }
        Update: {
          amount?: number
          component_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payroll_id?: string
          period_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "view_salary_component_fields_statistics"
            referencedColumns: ["component_id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_approval_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "payroll_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "payroll_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "payroll_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          employee_count: number | null
          id: string
          locked_at: string | null
          locked_by: string | null
          new_status: Database["public"]["Enums"]["unified_status"] | null
          pay_date: string
          period_code: string
          period_end: string
          period_month: number
          period_name: string
          period_start: string
          period_year: number
          status: string
          total_gross_pay: number | null
          total_net_pay: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          employee_count?: number | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          new_status?: Database["public"]["Enums"]["unified_status"] | null
          pay_date: string
          period_code: string
          period_end: string
          period_month: number
          period_name: string
          period_start: string
          period_year: number
          status?: string
          total_gross_pay?: number | null
          total_net_pay?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          employee_count?: number | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          new_status?: Database["public"]["Enums"]["unified_status"] | null
          pay_date?: string
          period_code?: string
          period_end?: string
          period_month?: number
          period_name?: string
          period_start?: string
          period_year?: number
          status?: string
          total_gross_pay?: number | null
          total_net_pay?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payrolls: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          gross_pay: number
          id: string
          net_pay: number
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          pay_date: string
          period_id: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["payroll_status"]
          submitted_at: string | null
          total_deductions: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          gross_pay?: number
          id?: string
          net_pay?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          pay_date: string
          period_id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payroll_status"]
          submitted_at?: string | null
          total_deductions?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          gross_pay?: number
          id?: string
          net_pay?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          pay_date?: string
          period_id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payroll_status"]
          submitted_at?: string | null
          total_deductions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
        ]
      }
      personal_income_tax_calculation_logs: {
        Row: {
          calculation_details: Json | null
          calculation_method: string | null
          created_at: string
          effective_tax_rate: number
          employee_id: string
          id: string
          notes: string | null
          payroll_id: string
          period_id: string | null
          personal_allowance: number
          pre_tax_deductions: number
          special_deductions: number
          tax_amount: number
          taxable_income: number
          updated_at: string
        }
        Insert: {
          calculation_details?: Json | null
          calculation_method?: string | null
          created_at?: string
          effective_tax_rate?: number
          employee_id: string
          id?: string
          notes?: string | null
          payroll_id: string
          period_id?: string | null
          personal_allowance?: number
          pre_tax_deductions?: number
          special_deductions?: number
          tax_amount?: number
          taxable_income?: number
          updated_at?: string
        }
        Update: {
          calculation_details?: Json | null
          calculation_method?: string | null
          created_at?: string
          effective_tax_rate?: number
          employee_id?: string
          id?: string
          notes?: string | null
          payroll_id?: string
          period_id?: string | null
          personal_allowance?: number
          pre_tax_deductions?: number
          special_deductions?: number
          tax_amount?: number
          taxable_income?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_income_tax_calculation_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_approval_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
        ]
      }
      policy_rules: {
        Row: {
          created_at: string
          id: string
          insurance_type_id: string
          notes: string | null
          policy_description: string | null
          policy_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insurance_type_id: string
          notes?: string | null
          policy_description?: string | null
          policy_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insurance_type_id?: string
          notes?: string | null
          policy_description?: string | null
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_rules_insurance_type_id_fkey"
            columns: ["insurance_type_id"]
            isOneToOne: false
            referencedRelation: "insurance_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_rules_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "social_insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      position_id_mapping: {
        Row: {
          new_id: string
          old_id: number
        }
        Insert: {
          new_id: string
          old_id: number
        }
        Update: {
          new_id?: string
          old_id?: number
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      salary_components: {
        Row: {
          base_dependency: boolean | null
          category: Database["public"]["Enums"]["salary_category"] | null
          copy_notes: string | null
          copy_strategy: string | null
          created_at: string
          description: string | null
          id: string
          is_taxable: boolean
          name: string
          stability_level: string | null
          type: Database["public"]["Enums"]["component_type"]
        }
        Insert: {
          base_dependency?: boolean | null
          category?: Database["public"]["Enums"]["salary_category"] | null
          copy_notes?: string | null
          copy_strategy?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_taxable?: boolean
          name: string
          stability_level?: string | null
          type: Database["public"]["Enums"]["component_type"]
        }
        Update: {
          base_dependency?: boolean | null
          category?: Database["public"]["Enums"]["salary_category"] | null
          copy_notes?: string | null
          copy_strategy?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_taxable?: boolean
          name?: string
          stability_level?: string | null
          type?: Database["public"]["Enums"]["component_type"]
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          details: Json | null
          event_type: string | null
          id: number
          ip_address: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          details?: Json | null
          event_type?: string | null
          id?: number
          ip_address?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          details?: Json | null
          event_type?: string | null
          id?: number
          ip_address?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      social_insurance_policies: {
        Row: {
          created_at: string
          effective_end_date: string | null
          effective_start_date: string
          id: string
          name: string
          region: string
        }
        Insert: {
          created_at?: string
          effective_end_date?: string | null
          effective_start_date: string
          id?: string
          name: string
          region: string
        }
        Update: {
          created_at?: string
          effective_end_date?: string | null
          effective_start_date?: string
          id?: string
          name?: string
          region?: string
        }
        Relationships: []
      }
      social_insurance_policy_applicable_categories: {
        Row: {
          created_at: string | null
          employee_category_id: string
          policy_id: string
        }
        Insert: {
          created_at?: string | null
          employee_category_id: string
          policy_id: string
        }
        Update: {
          created_at?: string | null
          employee_category_id?: string
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_insurance_policy_applicable_ca_employee_category_id_fkey"
            columns: ["employee_category_id"]
            isOneToOne: false
            referencedRelation: "employee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_insurance_policy_applicable_categories_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "social_insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      special_deduction_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          policy_id: string
          standard_monthly_amount: number
          system_key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          policy_id: string
          standard_monthly_amount: number
          system_key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          policy_id?: string
          standard_monthly_amount?: number
          system_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_deduction_types_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "tax_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_brackets: {
        Row: {
          annual_income_ceiling: number | null
          annual_income_floor: number
          bracket_level: number
          id: string
          policy_id: string
          quick_deduction: number
          rate: number
        }
        Insert: {
          annual_income_ceiling?: number | null
          annual_income_floor: number
          bracket_level: number
          id?: string
          policy_id: string
          quick_deduction: number
          rate: number
        }
        Update: {
          annual_income_ceiling?: number | null
          annual_income_floor?: number
          bracket_level?: number
          id?: string
          policy_id?: string
          quick_deduction?: number
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_brackets_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "tax_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_jurisdictions: {
        Row: {
          country_code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          country_code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tax_policies: {
        Row: {
          created_at: string
          effective_end_date: string | null
          effective_start_date: string
          id: string
          jurisdiction_id: string
          name: string
          standard_monthly_threshold: number
        }
        Insert: {
          created_at?: string
          effective_end_date?: string | null
          effective_start_date: string
          id?: string
          jurisdiction_id: string
          name: string
          standard_monthly_threshold: number
        }
        Update: {
          created_at?: string
          effective_end_date?: string | null
          effective_start_date?: string
          id?: string
          jurisdiction_id?: string
          name?: string
          standard_monthly_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_policies_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "tax_jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      temp_january_2025_salary_import: {
        Row: {
          id: number
          一次性补扣发: number | null
          个人所得税: number | null
          个人缴住房公积金: number | null
          个人缴养老保险费: number | null
          个人缴医疗保险费: number | null
          个人缴失业保险费: number | null
          个人缴职业年金: number | null
          人员姓名: string | null
          人员编号: string | null
          人员职级: string | null
          人员身份: string | null
          信访工作人员岗位津贴: number | null
          公务交通补贴: number | null
          公务员规范性津贴补贴: number | null
          基础绩效奖: number | null
          奖励绩效补扣发: number | null
          实发工资: number | null
          岗位工资: number | null
          岗位职务补贴: number | null
          工改保留补贴: number | null
          工资统发: string | null
          序号: number | null
          应发工资: number | null
          扣发合计: number | null
          月基础绩效: number | null
          月奖励绩效: number | null
          独生子女父母奖励金: number | null
          级别岗位级别工资: number | null
          绩效奖金补扣发: number | null
          职务技术等级工资: number | null
          薪级工资: number | null
          补扣社保: number | null
          见习试用期工资: number | null
          财政供养: string | null
          身份证: string | null
          部门: string | null
        }
        Insert: {
          id?: number
          一次性补扣发?: number | null
          个人所得税?: number | null
          个人缴住房公积金?: number | null
          个人缴养老保险费?: number | null
          个人缴医疗保险费?: number | null
          个人缴失业保险费?: number | null
          个人缴职业年金?: number | null
          人员姓名?: string | null
          人员编号?: string | null
          人员职级?: string | null
          人员身份?: string | null
          信访工作人员岗位津贴?: number | null
          公务交通补贴?: number | null
          公务员规范性津贴补贴?: number | null
          基础绩效奖?: number | null
          奖励绩效补扣发?: number | null
          实发工资?: number | null
          岗位工资?: number | null
          岗位职务补贴?: number | null
          工改保留补贴?: number | null
          工资统发?: string | null
          序号?: number | null
          应发工资?: number | null
          扣发合计?: number | null
          月基础绩效?: number | null
          月奖励绩效?: number | null
          独生子女父母奖励金?: number | null
          级别岗位级别工资?: number | null
          绩效奖金补扣发?: number | null
          职务技术等级工资?: number | null
          薪级工资?: number | null
          补扣社保?: number | null
          见习试用期工资?: number | null
          财政供养?: string | null
          身份证?: string | null
          部门?: string | null
        }
        Update: {
          id?: number
          一次性补扣发?: number | null
          个人所得税?: number | null
          个人缴住房公积金?: number | null
          个人缴养老保险费?: number | null
          个人缴医疗保险费?: number | null
          个人缴失业保险费?: number | null
          个人缴职业年金?: number | null
          人员姓名?: string | null
          人员编号?: string | null
          人员职级?: string | null
          人员身份?: string | null
          信访工作人员岗位津贴?: number | null
          公务交通补贴?: number | null
          公务员规范性津贴补贴?: number | null
          基础绩效奖?: number | null
          奖励绩效补扣发?: number | null
          实发工资?: number | null
          岗位工资?: number | null
          岗位职务补贴?: number | null
          工改保留补贴?: number | null
          工资统发?: string | null
          序号?: number | null
          应发工资?: number | null
          扣发合计?: number | null
          月基础绩效?: number | null
          月奖励绩效?: number | null
          独生子女父母奖励金?: number | null
          级别岗位级别工资?: number | null
          绩效奖金补扣发?: number | null
          职务技术等级工资?: number | null
          薪级工资?: number | null
          补扣社保?: number | null
          见习试用期工资?: number | null
          财政供养?: string | null
          身份证?: string | null
          部门?: string | null
        }
        Relationships: []
      }
      temp_january_salary_import: {
        Row: {
          "93年工改保留补贴": number | null
          id_number: string
          一次性补扣发: number | null
          信访工作人员岗位津贴: number | null
          公务交通补贴: number | null
          公务员规范性津贴补贴: number | null
          基础绩效奖: number | null
          奖励绩效补扣发: number | null
          岗位工资: number | null
          岗位职务补贴: number | null
          月基础绩效: number | null
          月奖励绩效: number | null
          独生子女父母奖励金: number | null
          "级别/岗位级别 工资": number | null
          绩效奖金补扣发: number | null
          "职务/技术等级 工资": number | null
          薪级工资: number | null
          补扣社保: number | null
          见习试用期工资: number | null
        }
        Insert: {
          "93年工改保留补贴"?: number | null
          id_number: string
          一次性补扣发?: number | null
          信访工作人员岗位津贴?: number | null
          公务交通补贴?: number | null
          公务员规范性津贴补贴?: number | null
          基础绩效奖?: number | null
          奖励绩效补扣发?: number | null
          岗位工资?: number | null
          岗位职务补贴?: number | null
          月基础绩效?: number | null
          月奖励绩效?: number | null
          独生子女父母奖励金?: number | null
          "级别/岗位级别 工资"?: number | null
          绩效奖金补扣发?: number | null
          "职务/技术等级 工资"?: number | null
          薪级工资?: number | null
          补扣社保?: number | null
          见习试用期工资?: number | null
        }
        Update: {
          "93年工改保留补贴"?: number | null
          id_number?: string
          一次性补扣发?: number | null
          信访工作人员岗位津贴?: number | null
          公务交通补贴?: number | null
          公务员规范性津贴补贴?: number | null
          基础绩效奖?: number | null
          奖励绩效补扣发?: number | null
          岗位工资?: number | null
          岗位职务补贴?: number | null
          月基础绩效?: number | null
          月奖励绩效?: number | null
          独生子女父母奖励金?: number | null
          "级别/岗位级别 工资"?: number | null
          绩效奖金补扣发?: number | null
          "职务/技术等级 工资"?: number | null
          薪级工资?: number | null
          补扣社保?: number | null
          见习试用期工资?: number | null
        }
        Relationships: []
      }
      time_slice_migration_log: {
        Row: {
          closed_records_generated: number | null
          completed_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          migration_step: string
          open_records_count: number | null
          started_at: string | null
          status: string | null
          table_name: string
        }
        Insert: {
          closed_records_generated?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          migration_step: string
          open_records_count?: number | null
          started_at?: string | null
          status?: string | null
          table_name: string
        }
        Update: {
          closed_records_generated?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          migration_step?: string
          open_records_count?: number | null
          started_at?: string | null
          status?: string | null
          table_name?: string
        }
        Relationships: []
      }
      trigger_backup: {
        Row: {
          disabled_at: string | null
          function_name: string | null
          id: number
          reason: string | null
          table_name: string | null
          trigger_name: string | null
          was_enabled: boolean | null
        }
        Insert: {
          disabled_at?: string | null
          function_name?: string | null
          id?: number
          reason?: string | null
          table_name?: string | null
          trigger_name?: string | null
          was_enabled?: boolean | null
        }
        Update: {
          disabled_at?: string | null
          function_name?: string | null
          id?: number
          reason?: string | null
          table_name?: string | null
          trigger_name?: string | null
          was_enabled?: boolean | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          employee_id: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          employee_id?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          employee_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "user_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "user_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      view_approval_history: {
        Row: {
          action: string | null
          comments: string | null
          created_at: string | null
          employee_name: string | null
          from_status: string | null
          gross_pay: number | null
          id: string | null
          id_number: string | null
          net_pay: number | null
          operator_id: string | null
          operator_name: string | null
          pay_date: string | null
          pay_month: string | null
          pay_month_string: string | null
          payroll_id: string | null
          period_id: string | null
          period_name: string | null
          to_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_approval_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_approval_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_approval_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "payroll_approval_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "payroll_approval_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
        ]
      }
      view_dashboard_stats: {
        Row: {
          active_employees: number | null
          days_until_next_payroll: number | null
          last_payroll_date: string | null
          last_payroll_employee_count: number | null
          last_payroll_total: number | null
          new_departments_this_month: number | null
          new_employees_this_month: number | null
          next_payroll_date: string | null
          terminated_employees: number | null
          total_departments: number | null
          total_employees: number | null
          total_positions: number | null
        }
        Relationships: []
      }
      view_department_hierarchy: {
        Row: {
          full_path: string | null
          id: string | null
          level: number | null
          name: string | null
          parent_department_id: string | null
        }
        Relationships: []
      }
      view_department_payroll_statistics: {
        Row: {
          avg_gross_pay: number | null
          avg_net_pay: number | null
          department_id: string | null
          department_name: string | null
          employee_count: number | null
          max_gross_pay: number | null
          min_gross_pay: number | null
          pay_month: number | null
          pay_year: number | null
          period_code: string | null
          period_name: string | null
          total_deductions: number | null
          total_gross_pay: number | null
          total_net_pay: number | null
        }
        Relationships: []
      }
      view_employee_basic_info: {
        Row: {
          bank_account_number: string | null
          bank_name: string | null
          branch_name: string | null
          category_id: string | null
          category_name: string | null
          category_start_date: string | null
          created_at: string | null
          date_of_birth: string | null
          department_id: string | null
          department_name: string | null
          email: string | null
          employee_id: string | null
          employee_name: string | null
          employment_status: string | null
          gender: string | null
          has_occupational_pension: boolean | null
          hire_date: string | null
          id_number: string | null
          is_active: boolean | null
          job_start_date: string | null
          latest_degree: string | null
          latest_field_of_study: string | null
          latest_graduation_date: string | null
          latest_institution: string | null
          manager_id: string | null
          mobile_phone: string | null
          personal_email: string | null
          position_id: string | null
          position_name: string | null
          primary_bank_account: string | null
          rank_id: string | null
          rank_name: string | null
          status_display: string | null
          termination_date: string | null
          updated_at: string | null
          work_email: string | null
          years_of_service: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_category_assignments_employee_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "employee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_job_history_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_job_history_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "view_department_payroll_statistics"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "employee_job_history_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_job_history_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "view_positions_with_details"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "employee_job_history_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "job_ranks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      view_employee_category_hierarchy: {
        Row: {
          full_path: string | null
          id: string | null
          level: number | null
          name: string | null
          parent_category_id: string | null
        }
        Relationships: []
      }
      view_employee_contribution_bases_by_period: {
        Row: {
          base_ceiling: number | null
          base_floor: number | null
          base_last_updated: string | null
          base_period_display: string | null
          base_period_month: number | null
          base_period_year: number | null
          employee_id: string | null
          employee_name: string | null
          employee_rate: number | null
          employer_rate: number | null
          employment_status: string | null
          id: string | null
          id_number: string | null
          insurance_type_id: string | null
          insurance_type_key: string | null
          insurance_type_name: string | null
          latest_contribution_base: number | null
          period_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_contribution_bases_insurance_type_id_fkey"
            columns: ["insurance_type_id"]
            isOneToOne: false
            referencedRelation: "insurance_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contribution_bases_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contribution_bases_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "employee_contribution_bases_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "employee_contribution_bases_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
          {
            foreignKeyName: "fk_employee_contribution_bases_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_contribution_bases_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_employee_contribution_bases_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_contribution_bases_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_employee_contribution_bases_employee_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      view_employees_active: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          employee_name: string | null
          employment_status: string | null
          gender: string | null
          hire_date: string | null
          id: string | null
          id_number: string | null
          manager_id: string | null
          termination_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          employee_name?: string | null
          employment_status?: string | null
          gender?: string | null
          hire_date?: string | null
          id?: string | null
          id_number?: string | null
          manager_id?: string | null
          termination_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          employee_name?: string | null
          employment_status?: string | null
          gender?: string | null
          hire_date?: string | null
          id?: string | null
          id_number?: string | null
          manager_id?: string | null
          termination_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      view_employees_all: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          employee_id: string | null
          employee_name: string | null
          employment_status: string | null
          gender: string | null
          hire_date: string | null
          id_number: string | null
          status_display: string | null
          termination_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          employee_id?: string | null
          employee_name?: string | null
          employment_status?: string | null
          gender?: string | null
          hire_date?: string | null
          id_number?: string | null
          status_display?: never
          termination_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          employee_id?: string | null
          employee_name?: string | null
          employment_status?: string | null
          gender?: string | null
          hire_date?: string | null
          id_number?: string | null
          status_display?: never
          termination_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      view_employees_deleted: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          employee_id: string | null
          employee_name: string | null
          employment_status: string | null
          gender: string | null
          hire_date: string | null
          id_number: string | null
          termination_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          employee_id?: string | null
          employee_name?: string | null
          employment_status?: string | null
          gender?: string | null
          hire_date?: string | null
          id_number?: string | null
          termination_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          employee_id?: string | null
          employee_name?: string | null
          employment_status?: string | null
          gender?: string | null
          hire_date?: string | null
          id_number?: string | null
          termination_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      view_metadata: {
        Row: {
          active_count: number | null
          category_description: string | null
          last_updated: string | null
          metadata_category: string | null
          metadata_description: string | null
          metadata_key: string | null
          status: string | null
          success_count: number | null
          total_count: number | null
        }
        Relationships: []
      }
      view_monthly_payroll_trend: {
        Row: {
          avg_gross_pay: number | null
          avg_net_pay: number | null
          employee_count: number | null
          employee_count_change: number | null
          employee_count_yoy_change: number | null
          gross_pay_stddev: number | null
          is_recent_12_months: boolean | null
          max_gross_pay: number | null
          min_gross_pay: number | null
          mom_growth_rate: number | null
          month_code: string | null
          month_display: string | null
          period_code: string | null
          period_month: number | null
          period_name: string | null
          period_year: number | null
          quarter: string | null
          total_deductions: number | null
          total_gross_pay: number | null
          total_net_pay: number | null
          trend_direction: string | null
          yoy_growth_rate: number | null
          ytd_avg_employee_count: number | null
          ytd_total_gross_pay: number | null
        }
        Relationships: []
      }
      view_payroll_approval_summary: {
        Row: {
          approval_count: number | null
          can_operate: boolean | null
          created_at: string | null
          employee_id: string | null
          employee_name: string | null
          gross_pay: number | null
          last_action: string | null
          last_action_at: string | null
          last_comments: string | null
          last_operator: string | null
          net_pay: number | null
          next_action: string | null
          notes: string | null
          pay_date: string | null
          pay_month: string | null
          payroll_id: string | null
          period_id: string | null
          status: Database["public"]["Enums"]["payroll_status"] | null
          status_label: string | null
          total_deductions: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
        ]
      }
      view_payroll_period_completeness: {
        Row: {
          bases_count: number | null
          bases_percentage: number | null
          bases_status: string | null
          category_count: number | null
          category_percentage: number | null
          category_status: string | null
          complete_employees_count: number | null
          earnings_count: number | null
          earnings_percentage: number | null
          earnings_status: string | null
          job_count: number | null
          job_percentage: number | null
          job_status: string | null
          metadata_status: string | null
          overall_completeness_percentage: number | null
          period_id: string | null
          period_month: number | null
          period_name: string | null
          period_status: string | null
          period_year: number | null
          total_employees: number | null
        }
        Relationships: []
      }
      view_payroll_period_estimation: {
        Row: {
          data_points_count: number | null
          days_until_estimated_pay: number | null
          employee_count_change: number | null
          estimated_avg_gross_pay: number | null
          estimated_change_rate: number | null
          estimated_employee_count: number | null
          estimated_month: number | null
          estimated_pay_date: string | null
          estimated_period_name: string | null
          estimated_total_gross_pay: number | null
          estimated_total_net_pay: number | null
          estimated_variance_range: string | null
          estimated_year: number | null
          estimation_confidence: string | null
          estimation_generated_at: string | null
          last_actual_employee_count: number | null
          last_actual_period: string | null
          last_actual_total_gross_pay: number | null
        }
        Relationships: []
      }
      view_payroll_summary: {
        Row: {
          actual_pay_date: string | null
          created_at: string | null
          department_name: string | null
          employee_id: string | null
          employee_name: string | null
          gross_pay: number | null
          id_number: string | null
          net_pay: number | null
          payroll_id: string | null
          payroll_status: Database["public"]["Enums"]["payroll_status"] | null
          period_code: string | null
          period_end: string | null
          period_id: string | null
          period_name: string | null
          period_start: string | null
          period_status: string | null
          position_name: string | null
          scheduled_pay_date: string | null
          total_deductions: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
        ]
      }
      view_payroll_trend_unified: {
        Row: {
          avg_gross_pay: number | null
          avg_net_pay: number | null
          employee_count: number | null
          employee_count_last_month: number | null
          employee_count_last_year: number | null
          is_current_month: boolean | null
          is_current_year: boolean | null
          is_recent_12_months: boolean | null
          max_gross_pay: number | null
          min_gross_pay: number | null
          pay_date: string | null
          pay_month: string | null
          pay_month_string: string | null
          period_code: string | null
          period_end: string | null
          period_id: string | null
          period_month: number | null
          period_name: string | null
          period_start: string | null
          period_status: string | null
          period_year: number | null
          total_deductions: number | null
          total_gross_pay: number | null
          total_gross_pay_last_month: number | null
          total_gross_pay_last_year: number | null
          total_net_pay: number | null
        }
        Relationships: []
      }
      view_payroll_unified: {
        Row: {
          amount: number | null
          category: Database["public"]["Enums"]["salary_category"] | null
          component_id: string | null
          component_name: string | null
          component_type: Database["public"]["Enums"]["component_type"] | null
          employee_id: string | null
          employee_name: string | null
          gross_pay: number | null
          insurance_type_key: string | null
          is_employer_contribution: boolean | null
          item_id: string | null
          item_notes: string | null
          net_pay: number | null
          payroll_id: string | null
          period_code: string | null
          period_end: string | null
          period_name: string | null
          period_start: string | null
          total_deductions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "view_salary_component_fields_statistics"
            referencedColumns: ["component_id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_approval_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      view_positions_with_details: {
        Row: {
          created_at: string | null
          current_employee_count: number | null
          department_count: number | null
          description: string | null
          last_assigned_date: string | null
          position_id: string | null
          position_name: string | null
          total_employee_count: number | null
        }
        Insert: {
          created_at?: string | null
          current_employee_count?: never
          department_count?: never
          description?: string | null
          last_assigned_date?: never
          position_id?: string | null
          position_name?: string | null
          total_employee_count?: never
        }
        Update: {
          created_at?: string | null
          current_employee_count?: never
          department_count?: never
          description?: string | null
          last_assigned_date?: never
          position_id?: string | null
          position_name?: string | null
          total_employee_count?: never
        }
        Relationships: []
      }
      view_recent_activities: {
        Row: {
          activity_date: string | null
          activity_type: string | null
          additional_info: string | null
          entity_name: string | null
        }
        Relationships: []
      }
      view_salary_component_fields_statistics: {
        Row: {
          activity_level: string | null
          amount_stability: string | null
          amount_stddev: number | null
          avg_amount: number | null
          base_dependency: boolean | null
          category: string | null
          category_amount_share: number | null
          category_avg_amount: number | null
          category_total_amount: number | null
          category_total_usage: number | null
          component_id: string | null
          component_name: string | null
          component_type: string | null
          components_in_category: number | null
          components_in_type: number | null
          copy_strategy: string | null
          employee_penetration_rate: number | null
          first_used_date: string | null
          importance_score: number | null
          is_taxable: boolean | null
          last_used_date: string | null
          max_amount: number | null
          min_amount: number | null
          recent_avg_amount: number | null
          recent_usage_count: number | null
          stability_level: string | null
          total_amount: number | null
          total_usage_count: number | null
          type_amount_share: number | null
          type_avg_amount: number | null
          type_total_amount: number | null
          type_total_usage: number | null
          unique_employee_count: number | null
          unique_payroll_count: number | null
          unique_period_count: number | null
          usage_density: number | null
          usage_span_days: number | null
        }
        Relationships: []
      }
      view_unified_status_mapping: {
        Row: {
          employee_id: string | null
          original_payroll_status: string | null
          original_period_status: string | null
          payroll_id: string | null
          period_id: string | null
          period_id_ref: string | null
          status_consistency: string | null
          unified_payroll_status: string | null
          unified_period_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_all"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employees_deleted"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_unified_status_mapping"
            referencedColumns: ["period_id_ref"]
          },
        ]
      }
    }
    Functions: {
      analyze_function_performance: {
        Args: {
          p_end_date?: string
          p_function_name?: string
          p_start_date?: string
        }
        Returns: {
          avg_execution_ms: number
          cache_hit_rate: number
          function_name: string
          last_called: string
          max_execution_ms: number
          p95_execution_ms: number
          performance_grade: string
          success_rate: number
          total_calls: number
        }[]
      }
      api_system_health: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      apply_base_limits: {
        Args: {
          p_auto_adjust?: boolean
          p_employee_id: string
          p_region: string
          p_year_month: string
        }
        Returns: Json
      }
      apply_housing_fund_rounding: {
        Args: { p_amount: number }
        Returns: number
      }
      batch_mark_as_paid: {
        Args: { p_comments?: string; p_payroll_ids: string[] }
        Returns: {
          message: string
          payroll_id: string
          success: boolean
        }[]
      }
      benchmark_function: {
        Args: {
          p_function_name: string
          p_iterations?: number
          p_test_params: Json
        }
        Returns: {
          error_message: string
          execution_time_ms: number
          iteration: number
          success: boolean
        }[]
      }
      bulk_update_employee_status: {
        Args: {
          employee_ids: string[]
          new_status: string
          updated_by?: string
        }
        Returns: number
      }
      calc_all_employees_insurance: {
        Args: { p_period_id: string }
        Returns: {
          employee_id: string
          employee_name: string
          message: string
          success: boolean
          total_employee_amount: number
          total_employer_amount: number
        }[]
      }
      calc_employee_all_insurance: {
        Args: { p_employee_id: string; p_period_id: string }
        Returns: {
          details: Json
          message: string
          success: boolean
          total_employee_amount: number
          total_employer_amount: number
        }[]
      }
      calc_housing_fund_new: {
        Args:
          | {
              p_employee_id: string
              p_is_employer?: boolean
              p_period_id: string
            }
          | { p_employee_id: string; p_period_id: string }
        Returns: {
          employee_amount: number
          employer_amount: number
          message: string
          success: boolean
        }[]
      }
      calc_insurance_component_new: {
        Args: {
          p_employee_id: string
          p_insurance_type_key: string
          p_is_employer: boolean
          p_period_id: string
        }
        Returns: Database["public"]["CompositeTypes"]["calculation_result"]
      }
      calc_medical_insurance_new: {
        Args:
          | {
              p_employee_id: string
              p_is_employer?: boolean
              p_period_id: string
            }
          | { p_employee_id: string; p_period_id: string }
        Returns: {
          employee_amount: number
          employer_amount: number
          message: string
          success: boolean
        }[]
      }
      calc_occupational_pension_new: {
        Args: {
          p_employee_id: string
          p_is_employer?: boolean
          p_period_id: string
        }
        Returns: Database["public"]["CompositeTypes"]["calculation_result"]
      }
      calc_payroll_summary: {
        Args: { p_payroll_id: string }
        Returns: Json
      }
      calc_payroll_summary_batch: {
        Args:
          | { p_employee_ids?: string[]; p_period_id?: string }
          | { p_payroll_ids: string[] }
          | { p_period_id: string }
        Returns: {
          calculation_success: boolean
          employee_id: string
          employee_name: string
          error_message: string
          gross_pay: number
          net_pay: number
          payroll_id: string
          total_deductions: number
        }[]
      }
      calc_pension_insurance_new: {
        Args:
          | {
              p_employee_id: string
              p_is_employer?: boolean
              p_period_id: string
            }
          | { p_employee_id: string; p_period_id: string }
        Returns: {
          employee_amount: number
          employer_amount: number
          message: string
          success: boolean
        }[]
      }
      calc_unemployment_insurance_new: {
        Args:
          | {
              p_employee_id: string
              p_is_employer?: boolean
              p_period_id: string
            }
          | { p_employee_id: string; p_period_id: string }
        Returns: Database["public"]["CompositeTypes"]["calculation_result"]
      }
      calc_work_injury_insurance_new: {
        Args:
          | {
              p_employee_id: string
              p_is_employer?: boolean
              p_period_id: string
            }
          | { p_employee_id: string; p_period_id: string }
        Returns: Database["public"]["CompositeTypes"]["calculation_result"]
      }
      can_access_all_data: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_access_employee: {
        Args: { p_employee_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_sensitive_data: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_assignment_overlap: {
        Args: { p_employee_id: string; p_period_id: string }
        Returns: boolean
      }
      check_payroll_calculation_permissions: {
        Args: { p_payroll_id: string }
        Returns: boolean
      }
      check_payroll_calculation_permissions_unified: {
        Args: { p_payroll_id: string }
        Returns: boolean
      }
      check_period_status_for_calculation: {
        Args: { p_period_id: string }
        Returns: boolean
      }
      check_rls_coverage: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      cleanup_change_log: {
        Args: { p_days_to_keep?: number }
        Returns: Json
      }
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_logs: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      create_admin_user: {
        Args: { p_role?: string; p_user_id: string }
        Returns: Json
      }
      create_employee_transaction: {
        Args: {
          p_account_number?: string
          p_bank_name?: string
          p_created_by?: string
          p_department_id?: string
          p_email?: string
          p_employee_code?: string
          p_gender?: string
          p_hire_date?: string
          p_id_number?: string
          p_name: string
          p_phone?: string
          p_position_id?: string
        }
        Returns: Json
      }
      create_next_month_bases: {
        Args: { p_created_by?: string; p_current_month: string }
        Returns: number
      }
      dblink: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      dblink_cancel_query: {
        Args: { "": string }
        Returns: string
      }
      dblink_close: {
        Args: { "": string }
        Returns: string
      }
      dblink_connect: {
        Args: { "": string }
        Returns: string
      }
      dblink_connect_u: {
        Args: { "": string }
        Returns: string
      }
      dblink_current_query: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      dblink_disconnect: {
        Args: Record<PropertyKey, never> | { "": string }
        Returns: string
      }
      dblink_error_message: {
        Args: { "": string }
        Returns: string
      }
      dblink_exec: {
        Args: { "": string }
        Returns: string
      }
      dblink_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      dblink_get_connections: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      dblink_get_notify: {
        Args: Record<PropertyKey, never> | { conname: string }
        Returns: Record<string, unknown>[]
      }
      dblink_get_pkey: {
        Args: { "": string }
        Returns: Database["public"]["CompositeTypes"]["dblink_pkey_results"][]
      }
      dblink_get_result: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      dblink_is_busy: {
        Args: { "": string }
        Returns: number
      }
      decode_bank_account: {
        Args: { employee_uuid: string }
        Returns: {
          decoded_account: string
        }[]
      }
      decrypt_employee_id_number: {
        Args: { p_employee_code: string; p_mask_output?: boolean }
        Returns: string
      }
      decrypt_sensitive_data: {
        Args: { encrypted_data: string }
        Returns: string
      }
      encrypt_sensitive_data: {
        Args: { data: string }
        Returns: string
      }
      evaluate_rule_condition: {
        Args: { p_condition_id: string; p_employee_id: string }
        Returns: boolean
      }
      gbt_bit_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bool_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bool_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bpchar_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bytea_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_cash_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_cash_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_date_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_date_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_enum_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_enum_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float4_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float4_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_inet_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int2_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int2_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int4_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int4_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_numeric_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_oid_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_oid_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_text_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_time_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_time_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_timetz_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_ts_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_ts_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_tstz_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_uuid_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_uuid_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_var_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_var_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey_var_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey_var_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey16_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey16_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey2_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey2_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey32_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey32_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey4_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey4_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey8_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey8_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      generate_employee_code: {
        Args: { department_code?: string }
        Returns: string
      }
      generate_monthly_periods: {
        Args: { end_date?: string; start_date: string }
        Returns: {
          period_end: string
          period_month: string
          period_start: string
        }[]
      }
      generate_performance_report: {
        Args: { p_period?: unknown }
        Returns: Json
      }
      get_accessible_employee_ids: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_applicable_deductions: {
        Args: {
          p_check_date?: string
          p_employee_id: string
          p_personnel_category: string
          p_region: string
        }
        Returns: {
          base_config: Json
          code: string
          deduction_id: string
          name: string
          priority: number
          rates: Json
          type: string
        }[]
      }
      get_applicable_policy: {
        Args: {
          p_context: Database["public"]["CompositeTypes"]["employee_calculation_context"]
          p_insurance_type: string
        }
        Returns: {
          limits: Json
          rates: Json
        }[]
      }
      get_batch_employee_contexts: {
        Args:
          | { p_effective_date?: string; p_employee_ids: string[] }
          | {
              p_effective_date?: string
              p_employee_ids: string[]
              p_use_cache?: boolean
            }
        Returns: {
          context_data: Json
          employee_id: string
        }[]
      }
      get_change_tracking_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_current_user_employee_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_department_ancestors: {
        Args: { p_department_id: string }
        Returns: {
          code: string
          id: string
          level: number
          name: string
        }[]
      }
      get_department_children: {
        Args: { p_department_id: string }
        Returns: {
          code: string
          full_path_name: string
          id: string
          level: number
          name: string
        }[]
      }
      get_department_full_path_name: {
        Args: { p_department_id: string }
        Returns: string
      }
      get_department_tree: {
        Args: { p_parent_id?: string }
        Returns: Json
      }
      get_effective_contribution_base: {
        Args: {
          p_effective_date: string
          p_employee_id: string
          p_insurance_type_id: string
        }
        Returns: number
      }
      get_employee_applicable_deductions: {
        Args: { p_employee_id: string; p_include_metadata?: boolean }
        Returns: {
          deduction_code: string
          deduction_config_id: string
          deduction_name: string
          deduction_type: string
          match_metadata: Json
          match_priority: number
          matched_conditions: string[]
        }[]
      }
      get_employee_bases: {
        Args: { p_employee_id: string; p_year_month: string }
        Returns: {
          housing_fund_base: number
          occupational_pension_base: number
          social_insurance_base: number
          status: string
        }[]
      }
      get_employee_current_department: {
        Args: { p_employee_id: string }
        Returns: string
      }
      get_employee_current_position: {
        Args: { p_employee_id: string }
        Returns: string
      }
      get_employee_details: {
        Args: { employee_uuid: string }
        Returns: Json
      }
      get_employee_encryption_key: {
        Args: { p_employee_code: string }
        Returns: string
      }
      get_employee_history: {
        Args: { p_employee_id: string }
        Returns: {
          category_name: string
          created_at: string
          department_name: string
          period_code: string
          period_id: string
          period_name: string
          position_name: string
        }[]
      }
      get_employee_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_employee_id_number: {
        Args: { p_employee_id: string; p_mask_output?: boolean }
        Returns: string
      }
      get_employee_stats_by_category: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_count: number
          category_key: string
          display_name_zh: string
          employee_count: number
          inactive_count: number
        }[]
      }
      get_employee_status_at_date: {
        Args: { p_date: string; p_employee_id: string }
        Returns: {
          category_name: string
          department_id: string
          department_name: string
          employee_category_id: string
          full_name: string
          has_occupational_pension: boolean
          id: string
          position_id: string
          position_name: string
          rank_id: string
          rank_name: string
        }[]
      }
      get_employee_with_category_info: {
        Args: { employee_id: string }
        Returns: Json
      }
      get_import_history: {
        Args: { p_import_type?: string; p_limit?: number }
        Returns: Json
      }
      get_mapping_coverage_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_migration_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: Json
          entity_type: string
          total_count: number
        }[]
      }
      get_optimization_suggestions: {
        Args: Record<PropertyKey, never>
        Returns: {
          estimated_impact: string
          function_name: string
          issue: string
          priority: string
          suggestion: string
        }[]
      }
      get_permissions_overview: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_personnel_categories_config: {
        Args: Record<PropertyKey, never>
        Returns: {
          business_rules: Json
          category_key: string
          description: string
          display_name_en: string
          display_name_zh: string
          is_active: boolean
          sort_order: number
        }[]
      }
      get_personnel_category_display: {
        Args: { category_key: string; lang?: string }
        Returns: string
      }
      get_realtime_performance_metrics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_table_columns: {
        Args: { schema_name_param?: string; table_name_param: string }
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
          ordinal_position: number
        }[]
      }
      get_upcoming_birthdays: {
        Args: { days_ahead?: number }
        Returns: {
          date_of_birth: string
          days_until_birthday: number
          employee_id: string
          employee_name: string
        }[]
      }
      get_user_departments: {
        Args: { p_user_id?: string }
        Returns: string[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_roles: {
        Args: { p_user_id?: string }
        Returns: string[]
      }
      has_department_access: {
        Args: { p_operation?: string }
        Returns: boolean
      }
      has_permission: {
        Args: { p_permission_code: string; p_user_id?: string }
        Returns: boolean
      }
      hash_sensitive_data: {
        Args: { plain_text: string }
        Returns: string
      }
      health_check_change_tracking: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      import_employees_batch: {
        Args: { p_data: Json; p_user_id: string }
        Returns: Json
      }
      insert_department: {
        Args: {
          p_code: string
          p_is_active?: boolean
          p_meta?: Json
          p_name: string
          p_parent_code?: string
          p_sort_order?: number
        }
        Returns: string
      }
      insert_department_secure: {
        Args: {
          p_code: string
          p_is_active?: boolean
          p_meta?: Json
          p_name: string
          p_parent_code?: string
          p_sort_order?: number
        }
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_dev_environment: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_hr_manager: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_function_performance: {
        Args: {
          p_context?: Json
          p_error?: string
          p_function_name: string
          p_parameters?: Json
          p_result?: Json
          p_start_time: string
        }
        Returns: undefined
      }
      manage_period_status: {
        Args: { p_lock?: boolean; p_new_status: string; p_period_id: string }
        Returns: Json
      }
      map_pgs_personnel_category: {
        Args: { pgs_category: string }
        Returns: string
      }
      map_to_unified_status: {
        Args: { status_value: string; table_name: string }
        Returns: Database["public"]["Enums"]["unified_status"]
      }
      mask_account_number: {
        Args: { account_number: string }
        Returns: string
      }
      move_department: {
        Args: { p_department_id: string; p_new_parent_id?: string }
        Returns: boolean
      }
      save_insurance_calculation_new: {
        Args:
          | {
              p_amount: number
              p_employee_id: string
              p_insurance_type_key: string
              p_is_employer: boolean
              p_period_id: string
            }
          | {
              p_amount: number
              p_employee_id: string
              p_insurance_type_key: string
              p_is_employer?: boolean
              p_period_id: string
            }
        Returns: Json
      }
      save_insurance_calculation_with_status_check: {
        Args: {
          p_amount: number
          p_employee_id: string
          p_insurance_type_key: string
          p_is_employer?: boolean
          p_period_id: string
        }
        Returns: Json
      }
      schedule_mapping_refresh: {
        Args: { p_interval_seconds?: number }
        Returns: string
      }
      search_employees: {
        Args: { limit_count?: number; search_term: string }
        Returns: {
          current_status: Database["public"]["Enums"]["employee_status_enum"]
          department_name: string
          employee_code: string
          full_name: string
          id: string
        }[]
      }
      soft_delete_department: {
        Args: { p_deleted_by?: string; p_department_id: string }
        Returns: number
      }
      sync_all_period_statuses: {
        Args: Record<PropertyKey, never>
        Returns: {
          new_status: string
          old_status: string
          period_id: string
          period_name: string
          updated: boolean
        }[]
      }
      transfer_employee: {
        Args: {
          p_effective_date?: string
          p_employee_id: string
          p_new_position_id?: string
          p_operated_by?: string
          p_reason?: string
          p_target_department_id: string
        }
        Returns: undefined
      }
      transform_personnel_category_rules: {
        Args: { p_dry_run?: boolean }
        Returns: Json
      }
      transform_social_security_rates: {
        Args: { p_dry_run?: boolean }
        Returns: Json
      }
      trigger_mapping_refresh_for_employee: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      update_payroll_insurance_items: {
        Args: { p_period_id: string }
        Returns: {
          employee_name: string
          items_updated: number
          payroll_id: string
          status: string
        }[]
      }
      update_payroll_insurance_items_v2: {
        Args: { p_period_id: string }
        Returns: {
          out_employee_name: string
          out_items_created: number
          out_items_updated: number
          out_payroll_id: string
          out_status: string
          out_total_employee_amount: number
          out_total_employer_amount: number
        }[]
      }
      update_performance_stats: {
        Args: { p_period_hours?: number }
        Returns: undefined
      }
      validate_infrastructure: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      validate_migration_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      validate_personnel_category: {
        Args: { category_key: string }
        Returns: boolean
      }
    }
    Enums: {
      component_type: "earning" | "deduction"
      contact_method_type:
        | "personal_email"
        | "work_email"
        | "mobile_phone"
        | "home_phone"
        | "address"
      contact_type_enum: "personal" | "work" | "emergency"
      employee_gender_enum:
        | "male"
        | "female"
        | "other"
        | "prefer_not_to_say"
        | "男"
        | "女"
      employee_status_enum:
        | "active"
        | "inactive"
        | "on_leave"
        | "terminated"
        | "retired"
      employment_type_enum:
        | "full_time"
        | "part_time"
        | "contract"
        | "intern"
        | "consultant"
      payroll_status:
        | "draft"
        | "approved"
        | "paid"
        | "calculating"
        | "calculated"
        | "cancelled"
      personnel_category_chinese:
        | "公务员"
        | "参照公务员管理"
        | "事业管理人员"
        | "执业类专技人员"
        | "管理类专技人员"
        | "事业技术工人"
        | "机关工勤"
        | "项目经理"
        | "项目服务专员"
        | "专项人员"
        | "综合类"
      personnel_category_cn_enum:
        | "公务员"
        | "公务员参照"
        | "事业管理"
        | "事业技术"
        | "事业工勤"
        | "项目管理"
        | "项目技术"
        | "综合管理"
      salary_category:
        | "basic_salary"
        | "benefits"
        | "personal_insurance"
        | "employer_insurance"
        | "personal_tax"
        | "other_deductions"
      unified_status:
        | "draft"
        | "processing"
        | "calculating"
        | "calculated"
        | "approved"
        | "paid"
        | "completed"
        | "cancelled"
        | "archived"
    }
    CompositeTypes: {
      batch_processing_result: {
        processed_count: number | null
        success_count: number | null
        error_count: number | null
        individual_results: Json[] | null
        processing_metadata: Json | null
      }
      calculation_result: {
        component_name: string | null
        amount: number | null
        details: Json | null
        success: boolean | null
        error_message: string | null
      }
      dblink_pkey_results: {
        position: number | null
        colname: string | null
      }
      employee_calculation_context: {
        employee_id: string | null
        employee_info: Json | null
        payroll_config: Json | null
        insurance_bases: Json | null
        policy_context: Json | null
        effective_date: string | null
        cache_timestamp: string | null
      }
      insurance_calculation_result: {
        insurance_type: string | null
        calculation_base: number | null
        employee_rate: number | null
        employer_rate: number | null
        employee_amount: number | null
        employer_amount: number | null
        applicable: boolean | null
        calculation_metadata: Json | null
      }
      payroll_processing_result: {
        employee_id: string | null
        period_id: string | null
        gross_salary: number | null
        total_deductions: number | null
        net_salary: number | null
        insurance_components:
          | Database["public"]["CompositeTypes"]["insurance_calculation_result"][]
          | null
        tax_components: Json | null
        processing_metadata: Json | null
      }
      social_insurance_component: {
        insurance_type: string | null
        insurance_name: string | null
        calculation_base: number | null
        employee_rate: number | null
        employer_rate: number | null
        employee_amount: number | null
        employer_amount: number | null
        min_base: number | null
        max_base: number | null
        is_applicable: boolean | null
        rounding_rule: string | null
        calculation_metadata: Json | null
      }
      social_insurance_result: {
        employee_id: string | null
        period_id: string | null
        calculation_date: string | null
        components:
          | Database["public"]["CompositeTypes"]["social_insurance_component"][]
          | null
        total_employee_amount: number | null
        total_employer_amount: number | null
        applied_rules: string[] | null
        unapplied_rules: string[] | null
        calculation_steps: Json[] | null
        warnings: string[] | null
        errors: string[] | null
        calculation_metadata: Json | null
      }
      validation_report: {
        is_consistent: boolean | null
        differences: Json[] | null
        validation_metadata: Json | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      component_type: ["earning", "deduction"],
      contact_method_type: [
        "personal_email",
        "work_email",
        "mobile_phone",
        "home_phone",
        "address",
      ],
      contact_type_enum: ["personal", "work", "emergency"],
      employee_gender_enum: [
        "male",
        "female",
        "other",
        "prefer_not_to_say",
        "男",
        "女",
      ],
      employee_status_enum: [
        "active",
        "inactive",
        "on_leave",
        "terminated",
        "retired",
      ],
      employment_type_enum: [
        "full_time",
        "part_time",
        "contract",
        "intern",
        "consultant",
      ],
      payroll_status: [
        "draft",
        "approved",
        "paid",
        "calculating",
        "calculated",
        "cancelled",
      ],
      personnel_category_chinese: [
        "公务员",
        "参照公务员管理",
        "事业管理人员",
        "执业类专技人员",
        "管理类专技人员",
        "事业技术工人",
        "机关工勤",
        "项目经理",
        "项目服务专员",
        "专项人员",
        "综合类",
      ],
      personnel_category_cn_enum: [
        "公务员",
        "公务员参照",
        "事业管理",
        "事业技术",
        "事业工勤",
        "项目管理",
        "项目技术",
        "综合管理",
      ],
      salary_category: [
        "basic_salary",
        "benefits",
        "personal_insurance",
        "employer_insurance",
        "personal_tax",
        "other_deductions",
      ],
      unified_status: [
        "draft",
        "processing",
        "calculating",
        "calculated",
        "approved",
        "paid",
        "completed",
        "cancelled",
        "archived",
      ],
    },
  },
} as const
