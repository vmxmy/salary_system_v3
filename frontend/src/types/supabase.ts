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
      access_logs: {
        Row: {
          created_at: string | null
          data_size_bytes: number | null
          event_type: string
          execution_time_ms: number | null
          id: string
          ip_address: unknown | null
          operation: string
          query_details: Json | null
          record_id: string | null
          request_path: string | null
          response_status: string | null
          risk_level: string | null
          sensitive_data_accessed: boolean | null
          session_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_size_bytes?: number | null
          event_type: string
          execution_time_ms?: number | null
          id?: string
          ip_address?: unknown | null
          operation: string
          query_details?: Json | null
          record_id?: string | null
          request_path?: string | null
          response_status?: string | null
          risk_level?: string | null
          sensitive_data_accessed?: boolean | null
          session_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_size_bytes?: number | null
          event_type?: string
          execution_time_ms?: number | null
          id?: string
          ip_address?: unknown | null
          operation?: string
          query_details?: Json | null
          record_id?: string | null
          request_path?: string | null
          response_status?: string | null
          risk_level?: string | null
          sensitive_data_accessed?: boolean | null
          session_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      insurance_component_mapping: {
        Row: {
          component_id: string | null
          created_at: string | null
          id: string
          insurance_type: Database["public"]["Enums"]["insurance_type_enum"]
          payer_type: Database["public"]["Enums"]["payer_type_enum"]
          standard_name: string
        }
        Insert: {
          component_id?: string | null
          created_at?: string | null
          id?: string
          insurance_type: Database["public"]["Enums"]["insurance_type_enum"]
          payer_type: Database["public"]["Enums"]["payer_type_enum"]
          standard_name: string
        }
        Update: {
          component_id?: string | null
          created_at?: string | null
          id?: string
          insurance_type?: Database["public"]["Enums"]["insurance_type_enum"]
          payer_type?: Database["public"]["Enums"]["payer_type_enum"]
          standard_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_component_mapping_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_component_mapping_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "view_salary_component_fields_statistics"
            referencedColumns: ["component_id"]
          },
        ]
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
      monitoring_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          id: string
          rule_config: Json
          rule_name: string
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          rule_config: Json
          rule_name: string
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          rule_config?: Json
          rule_name?: string
          rule_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          approval_deadline: boolean
          created_at: string
          email_notifications: boolean
          in_app_notifications: boolean
          new_pending_requests: boolean
          permission_expiring: boolean
          request_approved: boolean
          request_denied: boolean
          request_expired: boolean
          request_submitted: boolean
          sms_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_deadline?: boolean
          created_at?: string
          email_notifications?: boolean
          in_app_notifications?: boolean
          new_pending_requests?: boolean
          permission_expiring?: boolean
          request_approved?: boolean
          request_denied?: boolean
          request_expired?: boolean
          request_submitted?: boolean
          sms_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_deadline?: boolean
          created_at?: string
          email_notifications?: boolean
          in_app_notifications?: boolean
          new_pending_requests?: boolean
          permission_expiring?: boolean
          request_approved?: boolean
          request_denied?: boolean
          request_expired?: boolean
          request_submitted?: boolean
          sms_notifications?: boolean
          updated_at?: string
          user_id?: string
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
          status: Database["public"]["Enums"]["period_status_enum"]
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
          status?: Database["public"]["Enums"]["period_status_enum"]
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
          status?: Database["public"]["Enums"]["period_status_enum"]
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
        ]
      }
      permission_approval_logs: {
        Row: {
          action_type: string
          changes: Json | null
          comments: string | null
          created_at: string | null
          id: string
          new_status: string
          old_status: string | null
          operator_email: string
          operator_id: string
          request_id: string
        }
        Insert: {
          action_type: string
          changes?: Json | null
          comments?: string | null
          created_at?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          operator_email: string
          operator_id: string
          request_id: string
        }
        Update: {
          action_type?: string
          changes?: Json | null
          comments?: string | null
          created_at?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          operator_email?: string
          operator_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_approval_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "permission_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_approval_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "view_user_permission_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_backup_20250823: {
        Row: {
          backup_data: Json | null
          backup_timestamp: string | null
          source_table: string | null
        }
        Insert: {
          backup_data?: Json | null
          backup_timestamp?: string | null
          source_table?: string | null
        }
        Update: {
          backup_data?: Json | null
          backup_timestamp?: string | null
          source_table?: string | null
        }
        Relationships: []
      }
      permission_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          conditions: Json | null
          created_at: string | null
          data_scope: string
          duration_days: number
          effective_from: string | null
          expires_at: string | null
          id: string
          reason: string
          rejection_reason: string | null
          requested_permission: string
          requester_email: string
          requester_id: string
          resource_id: string | null
          resource_type: string | null
          status: string
          updated_at: string | null
          urgency_level: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          conditions?: Json | null
          created_at?: string | null
          data_scope?: string
          duration_days?: number
          effective_from?: string | null
          expires_at?: string | null
          id?: string
          reason: string
          rejection_reason?: string | null
          requested_permission: string
          requester_email: string
          requester_id: string
          resource_id?: string | null
          resource_type?: string | null
          status?: string
          updated_at?: string | null
          urgency_level?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          conditions?: Json | null
          created_at?: string | null
          data_scope?: string
          duration_days?: number
          effective_from?: string | null
          expires_at?: string | null
          id?: string
          reason?: string
          rejection_reason?: string | null
          requested_permission?: string
          requester_email?: string
          requester_id?: string
          resource_id?: string | null
          resource_type?: string | null
          status?: string
          updated_at?: string | null
          urgency_level?: string
        }
        Relationships: []
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
      report_fields: {
        Row: {
          created_at: string | null
          data_source: string
          default_visible: boolean | null
          field_key: string
          field_name: string
          field_type: string
          format_config: Json | null
          id: string
          is_required: boolean | null
          is_system_field: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_source: string
          default_visible?: boolean | null
          field_key: string
          field_name: string
          field_type: string
          format_config?: Json | null
          id?: string
          is_required?: boolean | null
          is_system_field?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_source?: string
          default_visible?: boolean | null
          field_key?: string
          field_name?: string
          field_type?: string
          format_config?: Json | null
          id?: string
          is_required?: boolean | null
          is_system_field?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      report_history: {
        Row: {
          downloaded_count: number | null
          file_format: string | null
          file_path: string | null
          file_size: number | null
          generated_at: string | null
          generated_by: string | null
          id: string
          job_id: string | null
          last_downloaded_at: string | null
          period_name: string | null
          record_count: number | null
          report_name: string
          template_id: string | null
        }
        Insert: {
          downloaded_count?: number | null
          file_format?: string | null
          file_path?: string | null
          file_size?: number | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          job_id?: string | null
          last_downloaded_at?: string | null
          period_name?: string | null
          record_count?: number | null
          report_name: string
          template_id?: string | null
        }
        Update: {
          downloaded_count?: number | null
          file_format?: string | null
          file_path?: string | null
          file_size?: number | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          job_id?: string | null
          last_downloaded_at?: string | null
          period_name?: string | null
          record_count?: number | null
          report_name?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "report_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          data_filters: Json | null
          error_message: string | null
          file_path: string | null
          file_size: number | null
          id: string
          job_name: string
          period_id: string | null
          progress: number | null
          result_data: Json | null
          started_at: string | null
          status: string | null
          template_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          data_filters?: Json | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          job_name: string
          period_id?: string | null
          progress?: number | null
          result_data?: Json | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          data_filters?: Json | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          job_name?: string
          period_id?: string | null
          progress?: number | null
          result_data?: Json | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_jobs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_jobs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_period_completeness"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "report_jobs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_trend_unified"
            referencedColumns: ["period_id"]
          },
          {
            foreignKeyName: "report_jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          category: string
          config: Json
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          description: string | null
          field_mappings: Json
          id: string
          is_active: boolean | null
          is_scheduled: boolean | null
          output_formats: string[] | null
          schedule_config: Json | null
          template_key: string
          template_name: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          config?: Json
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          field_mappings?: Json
          id?: string
          is_active?: boolean | null
          is_scheduled?: boolean | null
          output_formats?: string[] | null
          schedule_config?: Json | null
          template_key: string
          template_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          field_mappings?: Json
          id?: string
          is_active?: boolean | null
          is_scheduled?: boolean | null
          output_formats?: string[] | null
          schedule_config?: Json | null
          template_key?: string
          template_name?: string
          updated_at?: string | null
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
      security_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          rule_id: string | null
          severity: string
          title: string
          triggered_by_event: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          rule_id?: string | null
          severity: string
          title: string
          triggered_by_event?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          rule_id?: string | null
          severity?: string
          title?: string
          triggered_by_event?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "monitoring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          auto_detected: boolean | null
          created_at: string | null
          event_category: string
          event_details: Json
          event_severity: string
          id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          source_ip: unknown | null
          threat_indicators: Json | null
          user_id: string | null
        }
        Insert: {
          auto_detected?: boolean | null
          created_at?: string | null
          event_category: string
          event_details: Json
          event_severity: string
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_ip?: unknown | null
          threat_indicators?: Json | null
          user_id?: string | null
        }
        Update: {
          auto_detected?: boolean | null
          created_at?: string | null
          event_category?: string
          event_details?: Json
          event_severity?: string
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_ip?: unknown | null
          threat_indicators?: Json | null
          user_id?: string | null
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
      system_monitoring: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          expires_at: string | null
          function_name: string | null
          id: string
          metrics: Json
          resource_key: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          expires_at?: string | null
          function_name?: string | null
          id?: string
          metrics?: Json
          resource_key?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          expires_at?: string | null
          function_name?: string | null
          id?: string
          metrics?: Json
          resource_key?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
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
      unified_permission_config: {
        Row: {
          created_at: string | null
          effective_from: string | null
          effective_until: string | null
          id: string
          is_active: boolean | null
          permission_rules: Json
          role_code: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          permission_rules?: Json
          role_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          permission_rules?: Json
          role_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_permission_config_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
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
      monitoring_dashboard: {
        Row: {
          accessed_tables: number | null
          active_users: number | null
          critical_alerts: number | null
          critical_events: number | null
          generated_at: string | null
          high_risk_accesses: number | null
          security_events: number | null
          sensitive_accesses: number | null
          total_accesses: number | null
          total_alerts: number | null
          unacknowledged_alerts: number | null
          unresolved_events: number | null
        }
        Relationships: []
      }
      permission_matrix_mv: {
        Row: {
          effective_data_scope: string | null
          has_page_permissions: boolean | null
          last_refreshed: string | null
          permission_code: string | null
          permission_sources: string[] | null
          source_details: string[] | null
          user_id: string | null
        }
        Relationships: []
      }
      rls_performance_summary: {
        Row: {
          metric: string | null
          unit: string | null
          value: string | null
        }
        Relationships: []
      }
      v_standard_insurance_components: {
        Row: {
          category: Database["public"]["Enums"]["salary_category"] | null
          component_id: string | null
          component_type: Database["public"]["Enums"]["component_type"] | null
          description: string | null
          insurance_type:
            | Database["public"]["Enums"]["insurance_type_enum"]
            | null
          insurance_type_cn: string | null
          payer_type: Database["public"]["Enums"]["payer_type_enum"] | null
          payer_type_cn: string | null
          standard_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_component_mapping_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_component_mapping_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "view_salary_component_fields_statistics"
            referencedColumns: ["component_id"]
          },
        ]
      }
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
        ]
      }
      view_auth_debug: {
        Row: {
          active_roles: number | null
          current_email: string | null
          current_role: string | null
          current_user_id: string | null
          info_type: string | null
          total_profiles: number | null
          total_users: number | null
        }
        Relationships: []
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
          dept_employee_percentage: number | null
          dept_gross_pay_percentage: number | null
          employee_count: number | null
          max_gross_pay: number | null
          min_gross_pay: number | null
          pay_month: number | null
          pay_month_string: string | null
          pay_period_end: string | null
          pay_period_start: string | null
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
          period_status:
            | Database["public"]["Enums"]["period_status_enum"]
            | null
          period_year: number | null
          total_employees: number | null
        }
        Relationships: []
      }
      view_payroll_summary: {
        Row: {
          actual_pay_date: string | null
          category_name: string | null
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
          period_status:
            | Database["public"]["Enums"]["period_status_enum"]
            | null
          position_name: string | null
          root_category_name: string | null
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
          period_status:
            | Database["public"]["Enums"]["period_status_enum"]
            | null
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
          root_category_name: string | null
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
      view_permission_request_stats: {
        Row: {
          avg_processing_hours: number | null
          month: string | null
          request_count: number | null
          requested_permission: string | null
          status: string | null
          urgency_level: string | null
        }
        Relationships: []
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
      view_user_management_unified: {
        Row: {
          category_name: string | null
          config_active: boolean | null
          config_role: string | null
          data_scope: string | null
          department_name: string | null
          effective_from: string | null
          effective_until: string | null
          email: string | null
          employee_active: boolean | null
          employee_id: string | null
          employee_name: string | null
          employment_status: string | null
          last_sign_in_at: string | null
          page_permissions: Json | null
          permission_rules: Json | null
          permissions: Json | null
          position_name: string | null
          role_active: boolean | null
          role_assigned_at: string | null
          role_metadata: Json | null
          user_created_at: string | null
          user_id: string | null
          user_role: string | null
          user_updated_at: string | null
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
      view_user_permission_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver_email: string | null
          created_at: string | null
          data_scope: string | null
          duration_days: number | null
          effective_from: string | null
          expires_at: string | null
          id: string | null
          reason: string | null
          rejection_reason: string | null
          remaining_hours: number | null
          requested_permission: string | null
          requester_email: string | null
          requester_id: string | null
          resource_id: string | null
          resource_type: string | null
          status: string | null
          status_display: string | null
          updated_at: string | null
          urgency_level: string | null
        }
        Relationships: []
      }
      view_user_permissions: {
        Row: {
          config_active: boolean | null
          config_role: string | null
          data_scope: string | null
          effective_from: string | null
          effective_until: string | null
          email: string | null
          page_permissions: Json | null
          permission_rules: Json | null
          permissions: Json | null
          role_active: boolean | null
          role_assigned_at: string | null
          role_metadata: Json | null
          user_id: string | null
          user_role: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      acknowledge_security_alert: {
        Args: { p_alert_id: string; p_notes?: string }
        Returns: boolean
      }
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
      assign_user_role_by_rules: {
        Args: { user_email: string; user_id_param?: string }
        Returns: string
      }
      auth_debug_info: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      calculate_risk_level: {
        Args: {
          p_operation: string
          p_query_details: Json
          p_table_name: string
        }
        Returns: string
      }
      can_access_all_data: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_access_all_data_cached: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_access_employee: {
        Args: { p_employee_id: string; p_user_id: string }
        Returns: boolean
      }
      can_access_employee_data_cached: {
        Args: { target_employee_id: string }
        Returns: boolean
      }
      can_access_payroll_data_cached: {
        Args: { target_employee_id: string }
        Returns: boolean
      }
      can_access_user_management: {
        Args: Record<PropertyKey, never>
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
      check_monitoring_system_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          component: string
          details: Json
          last_check: string
          status: string
        }[]
      }
      check_multiple_permissions: {
        Args: { p_permission_codes: string[]; p_user_id: string }
        Returns: Json
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
      check_permission_cache_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          metric: string
          recommendation: string
          status: string
          value: string
        }[]
      }
      check_permission_version: {
        Args: { p_client_version?: number }
        Returns: boolean
      }
      check_rls_coverage: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_rls_optimization_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          cached_policies: number
          optimization_rate: number
          status: string
          table_name: string
          total_policies: number
        }[]
      }
      check_suspicious_activity: {
        Args: {
          p_log_id: string
          p_operation: string
          p_table_name: string
          p_user_id: string
        }
        Returns: undefined
      }
      cleanup_change_log: {
        Args: { p_days_to_keep?: number }
        Returns: Json
      }
      cleanup_expired_cache_v2: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_monitoring_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_logs: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      clear_user_permission_cache: {
        Args: { target_user_id?: string }
        Returns: undefined
      }
      clear_user_permission_cache_enhanced: {
        Args: { notify_other_sessions?: boolean; target_user_id?: string }
        Returns: undefined
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
      create_security_alert: {
        Args: {
          p_alert_type: string
          p_description?: string
          p_metadata?: Json
          p_rule_id?: string
          p_severity: string
          p_title: string
          p_triggered_by_event?: string
        }
        Returns: string
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
      evaluate_anomaly_rule: {
        Args: { p_rule_config: Json }
        Returns: boolean
      }
      evaluate_monitoring_rules: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      evaluate_pattern_rule: {
        Args: { p_rule_config: Json }
        Returns: boolean
      }
      evaluate_rule_condition: {
        Args: { p_condition_id: string; p_employee_id: string }
        Returns: boolean
      }
      evaluate_threshold_rule: {
        Args: { p_rule_config: Json }
        Returns: boolean
      }
      expire_permissions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      generate_frontend_claims: {
        Args: { p_user_id: string }
        Returns: Json
      }
      generate_monitoring_test_data: {
        Args: Record<PropertyKey, never>
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
      generate_security_report: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          metric_name: string
          metric_value: string
          recommendations: string
          report_section: string
          risk_level: string
        }[]
      }
      get_access_logs: {
        Args: {
          p_end_time?: string
          p_page?: number
          p_page_size?: number
          p_risk_level?: string
          p_start_time?: string
          p_table_name?: string
          p_user_id?: string
        }
        Returns: {
          created_at: string
          event_type: string
          execution_time_ms: number
          id: string
          operation: string
          risk_level: string
          sensitive_data_accessed: boolean
          table_name: string
          total_count: number
          user_id: string
        }[]
      }
      get_accessible_employee_ids: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_all_enum_types: {
        Args: Record<PropertyKey, never>
        Returns: {
          enum_count: number
          enum_name: string
        }[]
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
      get_current_permission_version: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_current_user_employee_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_database_objects: {
        Args: Record<PropertyKey, never>
        Returns: {
          comment: string
          name: string
          schema: string
          type: string
        }[]
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
      get_employee_id_cached: {
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
      get_enum_typid: {
        Args: { enum_name: string }
        Returns: unknown
      }
      get_enum_values: {
        Args: { p_enum_names: string[] }
        Returns: {
          enum_name: string
          enum_value: string
          sort_order: number
        }[]
      }
      get_import_history: {
        Args: { p_import_type?: string; p_limit?: number }
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
      get_monitoring_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          accessed_tables: number
          active_users: number
          critical_alerts: number
          critical_events: number
          generated_at: string
          high_risk_accesses: number
          security_events: number
          sensitive_accesses: number
          total_accesses: number
          total_alerts: number
          unacknowledged_alerts: number
          unresolved_events: number
        }[]
      }
      get_new_user_default_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_optimization_suggestions_v2: {
        Args: Record<PropertyKey, never>
        Returns: {
          function_name: string
          metrics: Json
          priority: string
          suggestion: string
          suggestion_type: string
        }[]
      }
      get_performance_metrics_v2: {
        Args: { p_function_name?: string; p_hours_back?: number }
        Returns: {
          avg_execution_time: number
          error_count: number
          function_name: string
          max_execution_time: number
          min_execution_time: number
          success_rate: number
          total_executions: number
        }[]
      }
      get_permission_cache_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_time: number
          cache_hit_info: string
          function_name: string
          total_calls: number
          total_time: number
        }[]
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
      get_salary_component_category_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          count: number
          type: string
        }[]
      }
      get_salary_component_type_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
          type: string
        }[]
      }
      get_security_events: {
        Args: {
          p_event_category?: string
          p_event_severity?: string
          p_page?: number
          p_page_size?: number
          p_resolved?: boolean
        }
        Returns: {
          created_at: string
          event_category: string
          event_details: Json
          event_severity: string
          id: string
          resolved: boolean
          source_ip: unknown
          total_count: number
          user_id: string
        }[]
      }
      get_standard_insurance_component_id: {
        Args: {
          p_insurance_type: Database["public"]["Enums"]["insurance_type_enum"]
          p_payer_type: Database["public"]["Enums"]["payer_type_enum"]
        }
        Returns: string
      }
      get_system_setting: {
        Args: { setting_key_param: string }
        Returns: Json
      }
      get_table_columns: {
        Args:
          | { schema_name_param?: string; table_name_param: string }
          | { table_name: string }
        Returns: {
          character_maximum_length: number
          column_default: string
          column_name: string
          data_type: string
          is_nullable: boolean
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
      get_user_data_scope: {
        Args: { p_permission_code: string; p_user_id: string }
        Returns: string
      }
      get_user_departments: {
        Args: { p_user_id?: string }
        Returns: string[]
      }
      get_user_permission_context: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
        Args: { p_permission_code: string }
        Returns: boolean
      }
      has_resource_permission: {
        Args: {
          p_context?: Json
          p_permission_code: string
          p_resource_id: string
          p_user_id: string
        }
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
      initialize_monitoring_system: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      is_admin_cached: {
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
      is_hr_manager_cached: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_sensitive_table: {
        Args: { p_table_name: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_user_admin: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      log_access_event: {
        Args: {
          p_data_size_bytes?: number
          p_event_type: string
          p_execution_time_ms?: number
          p_operation?: string
          p_query_details?: Json
          p_record_id?: string
          p_table_name: string
        }
        Returns: string
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
      log_function_performance_v2: {
        Args: {
          p_error_message?: string
          p_execution_time_ms: number
          p_function_name: string
          p_metrics?: Json
        }
        Returns: string
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
      refresh_all_period_statuses: {
        Args: Record<PropertyKey, never>
        Returns: {
          new_status: string
          old_status: string
          payroll_counts: string
          period_id: string
          period_name: string
          updated: boolean
        }[]
      }
      refresh_all_permission_caches: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      resolve_security_event: {
        Args: { p_event_id: string; p_resolution_notes?: string }
        Returns: boolean
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
      test_user_management_access: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      unified_permission_check: {
        Args: {
          p_context?: Json
          p_permission_code: string
          p_resource_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      update_performance_stats: {
        Args: { p_period_hours?: number }
        Returns: undefined
      }
      update_period_employee_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          new_count: number
          old_count: number
          period_id: string
          period_name: string
        }[]
      }
      user_can_access_data: {
        Args: { data_scope?: string }
        Returns: boolean
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
      contact_type_enum:
        | "personal"
        | "work"
        | "emergency"
        | "mobile_phone"
        | "work_email"
        | "personal_email"
      employee_gender_enum:
        | "male"
        | "female"
        | "other"
        | "prefer_not_to_say"
        | "男"
        | "女"
      employee_gender_simple: "male" | "female"
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
      insurance_type_enum:
        | "pension"
        | "medical"
        | "unemployment"
        | "work_injury"
        | "maternity"
        | "housing_fund"
        | "serious_illness"
        | "occupational_pension"
      payer_type_enum: "employee" | "employer"
      payroll_status:
        | "draft"
        | "approved"
        | "paid"
        | "calculating"
        | "calculated"
        | "cancelled"
        | "pending"
      period_status_enum:
        | "preparing"
        | "ready"
        | "processing"
        | "review"
        | "approved"
        | "completed"
        | "closed"
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
      contact_type_enum: [
        "personal",
        "work",
        "emergency",
        "mobile_phone",
        "work_email",
        "personal_email",
      ],
      employee_gender_enum: [
        "male",
        "female",
        "other",
        "prefer_not_to_say",
        "男",
        "女",
      ],
      employee_gender_simple: ["male", "female"],
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
      insurance_type_enum: [
        "pension",
        "medical",
        "unemployment",
        "work_injury",
        "maternity",
        "housing_fund",
        "serious_illness",
        "occupational_pension",
      ],
      payer_type_enum: ["employee", "employer"],
      payroll_status: [
        "draft",
        "approved",
        "paid",
        "calculating",
        "calculated",
        "cancelled",
        "pending",
      ],
      period_status_enum: [
        "preparing",
        "ready",
        "processing",
        "review",
        "approved",
        "completed",
        "closed",
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
