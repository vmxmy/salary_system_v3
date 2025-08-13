Using workdir /Users/xumingyang/app/高新区工资信息管理/salary_system/webapp/v3
Initialising cli_login_postgres role...
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
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
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_bank_accounts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
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
          effective_end_date: string | null
          effective_start_date: string
          employee_category_id: string
          employee_id: string
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_end_date?: string | null
          effective_start_date: string
          employee_category_id: string
          employee_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_end_date?: string | null
          effective_start_date?: string
          employee_category_id?: string
          employee_id?: string
          id?: string
          notes?: string | null
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
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_category_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
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
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_contacts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_contribution_bases: {
        Row: {
          contribution_base: number
          created_at: string
          effective_end_date: string | null
          effective_start_date: string
          employee_id: string
          id: string
          insurance_type_id: string
        }
        Insert: {
          contribution_base: number
          created_at?: string
          effective_end_date?: string | null
          effective_start_date: string
          employee_id: string
          id?: string
          insurance_type_id: string
        }
        Update: {
          contribution_base?: number
          created_at?: string
          effective_end_date?: string | null
          effective_start_date?: string
          employee_id?: string
          id?: string
          insurance_type_id?: string
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
            foreignKeyName: "employee_contribution_bases_insurance_type_id_fkey"
            columns: ["insurance_type_id"]
            isOneToOne: false
            referencedRelation: "view_insurance_category_applicability"
            referencedColumns: ["insurance_type_id"]
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
        Relationships: []
      }
      employee_education: {
        Row: {
          created_at: string
          degree: string
          employee_id: string
          field_of_study: string
          graduation_date: string | null
          id: string
          institution_name: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          degree: string
          employee_id: string
          field_of_study: string
          graduation_date?: string | null
          id?: string
          institution_name: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          degree?: string
          employee_id?: string
          field_of_study?: string
          graduation_date?: string | null
          id?: string
          institution_name?: string
          notes?: string | null
        }
        Relationships: []
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
          effective_end_date: string | null
          effective_start_date: string
          employee_id: string
          id: string
          notes: string | null
          position_id: string
          rank_id: string | null
        }
        Insert: {
          created_at?: string
          department_id: string
          effective_end_date?: string | null
          effective_start_date: string
          employee_id: string
          id?: string
          notes?: string | null
          position_id: string
          rank_id?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string
          effective_end_date?: string | null
          effective_start_date?: string
          employee_id?: string
          id?: string
          notes?: string | null
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
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_job_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_job_history_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
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
          effective_end_date: string | null
          effective_start_date: string
          employee_id: string
          id: string
        }
        Insert: {
          claimed_monthly_amount: number
          created_at?: string
          deduction_type_id: string
          effective_end_date?: string | null
          effective_start_date: string
          employee_id: string
          id?: string
        }
        Update: {
          claimed_monthly_amount?: number
          created_at?: string
          deduction_type_id?: string
          effective_end_date?: string | null
          effective_start_date?: string
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_special_deductions_deduction_type_id_fkey"
            columns: ["deduction_type_id"]
            isOneToOne: false
            referencedRelation: "special_deduction_types"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          date_of_birth: string | null
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
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_calculation_logs: {
        Row: {
          adjusted_base: number | null
          calculation_date: string | null
          contribution_base: number | null
          created_at: string | null
          employee_amount: number | null
          employee_id: string
          employee_rate: number | null
          employer_amount: number | null
          employer_rate: number | null
          id: string
          insurance_type_id: string | null
          is_applicable: boolean
          payroll_id: string
          skip_reason: string | null
        }
        Insert: {
          adjusted_base?: number | null
          calculation_date?: string | null
          contribution_base?: number | null
          created_at?: string | null
          employee_amount?: number | null
          employee_id: string
          employee_rate?: number | null
          employer_amount?: number | null
          employer_rate?: number | null
          id?: string
          insurance_type_id?: string | null
          is_applicable: boolean
          payroll_id: string
          skip_reason?: string | null
        }
        Update: {
          adjusted_base?: number | null
          calculation_date?: string | null
          contribution_base?: number | null
          created_at?: string | null
          employee_amount?: number | null
          employee_id?: string
          employee_rate?: number | null
          employer_amount?: number | null
          employer_rate?: number | null
          id?: string
          insurance_type_id?: string | null
          is_applicable?: boolean
          payroll_id?: string
          skip_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_insurance_calculation_logs_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_insurance_calculation_logs_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_basic_info"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_insurance_calculation_logs_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_insurance_calculation_logs_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_insurance_calculation_logs_insurance_type"
            columns: ["insurance_type_id"]
            isOneToOne: false
            referencedRelation: "insurance_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_insurance_calculation_logs_insurance_type"
            columns: ["insurance_type_id"]
            isOneToOne: false
            referencedRelation: "view_insurance_category_applicability"
            referencedColumns: ["insurance_type_id"]
          },
          {
            foreignKeyName: "fk_insurance_calculation_logs_payroll"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_insurance_calculation_logs_payroll"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "fk_insurance_calculation_logs_payroll"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_unified"
            referencedColumns: ["payroll_id"]
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
          {
            foreignKeyName: "insurance_type_category_rules_insurance_type_id_fkey"
            columns: ["insurance_type_id"]
            isOneToOne: false
            referencedRelation: "view_insurance_category_applicability"
            referencedColumns: ["insurance_type_id"]
          },
        ]
      }
      insurance_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          system_key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          system_key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
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
      payroll_items: {
        Row: {
          amount: number
          component_id: string
          created_at: string
          id: string
          notes: string | null
          payroll_id: string
        }
        Insert: {
          amount: number
          component_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payroll_id: string
        }
        Update: {
          amount?: number
          component_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payroll_id?: string
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
            referencedRelation: "view_payroll_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_unified"
            referencedColumns: ["payroll_id"]
          },
        ]
      }
      payrolls: {
        Row: {
          created_at: string
          employee_id: string
          gross_pay: number
          id: string
          net_pay: number
          notes: string | null
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          status: Database["public"]["Enums"]["payroll_status"]
          total_deductions: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          gross_pay?: number
          id?: string
          net_pay?: number
          notes?: string | null
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          status?: Database["public"]["Enums"]["payroll_status"]
          total_deductions?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          gross_pay?: number
          id?: string
          net_pay?: number
          notes?: string | null
          pay_date?: string
          pay_period_end?: string
          pay_period_start?: string
          status?: Database["public"]["Enums"]["payroll_status"]
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
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
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
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
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
            referencedRelation: "view_payroll_summary"
            referencedColumns: ["payroll_id"]
          },
          {
            foreignKeyName: "personal_income_tax_calculation_logs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_unified"
            referencedColumns: ["payroll_id"]
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
            foreignKeyName: "policy_rules_insurance_type_id_fkey"
            columns: ["insurance_type_id"]
            isOneToOne: false
            referencedRelation: "view_insurance_category_applicability"
            referencedColumns: ["insurance_type_id"]
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
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "user_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
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
      employee_assignments: {
        Row: {
          created_at: string | null
          department_id: string | null
          employee_id: string | null
          end_date: string | null
          id: string | null
          is_active: boolean | null
          position_id: string | null
          start_date: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          employee_id?: string | null
          end_date?: string | null
          id?: string | null
          is_active?: never
          position_id?: string | null
          start_date?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          employee_id?: string | null
          end_date?: string | null
          id?: string | null
          is_active?: never
          position_id?: string | null
          start_date?: string | null
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
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_job_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_job_history_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_roles_active: {
        Row: {
          created_at: string | null
          email: string | null
          is_active: boolean | null
          role: string | null
          user_id: string | null
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
      view_employee_basic_info: {
        Row: {
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
          has_occupational_pension: string | null
          hire_date: string | null
          id_number: string | null
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
          termination_date: string | null
          updated_at: string | null
          work_email: string | null
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
            foreignKeyName: "employee_job_history_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
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
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
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
      view_employee_insurance_base_unified: {
        Row: {
          contribution_base: number | null
          effective_end_date: string | null
          effective_start_date: string | null
          employee_id: string | null
          employee_name: string | null
          employment_status: string | null
          has_explicit_base: boolean | null
          id_number: string | null
          insurance_type_id: string | null
          insurance_type_key: string | null
          insurance_type_name: string | null
          is_current_month: boolean | null
          is_current_year: boolean | null
          month: string | null
          month_number: number | null
          month_string: string | null
          rn: number | null
          year: number | null
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
            foreignKeyName: "employee_contribution_bases_insurance_type_id_fkey"
            columns: ["insurance_type_id"]
            isOneToOne: false
            referencedRelation: "view_insurance_category_applicability"
            referencedColumns: ["insurance_type_id"]
          },
        ]
      }
      view_employee_payroll_statistics: {
        Row: {
          employee_id: string | null
          employee_name: string | null
          employment_status: string | null
          id_number: string | null
          latest_deductions: number | null
          latest_gross_pay: number | null
          latest_net_pay: number | null
          latest_pay_period: string | null
        }
        Relationships: []
      }
      view_insurance_category_applicability: {
        Row: {
          description: string | null
          employee_category_full_path: string | null
          employee_category_id: string | null
          employee_category_name: string | null
          insurance_type_id: string | null
          insurance_type_name: string | null
          is_applicable: boolean | null
          rule_id: string | null
        }
        Relationships: []
      }
      view_payroll_cost_analysis: {
        Row: {
          avg_employee_cost: number | null
          avg_employer_cost: number | null
          avg_total_cost: number | null
          basic_salary_total: number | null
          benefits_total: number | null
          employee_cost: number | null
          employer_cost: number | null
          employer_insurance_total: number | null
          other_deductions_total: number | null
          pay_month: number | null
          pay_month_string: string | null
          pay_period_end: string | null
          pay_period_start: string | null
          pay_year: number | null
          personal_insurance_total: number | null
          personal_tax_total: number | null
          total_cost: number | null
          total_employees: number | null
        }
        Relationships: []
      }
      view_payroll_metadata: {
        Row: {
          id: string | null
          一次性补扣发: number | null
          九三年工改保留津补贴: number | null
          人员类别: string | null
          信访工作人员岗位工作津贴: number | null
          公务交通补贴: number | null
          公务员规范后津补贴: number | null
          发放日期: string | null
          员工姓名: string | null
          基本工资: number | null
          基础绩效: number | null
          基础绩效奖: number | null
          奖励绩效补扣发: number | null
          季度绩效考核薪酬: number | null
          岗位工资: number | null
          岗位职务补贴: number | null
          工资状态: Database["public"]["Enums"]["payroll_status"] | null
          年度: number | null
          乡镇工作补贴: number | null
          收入合计: number | null
          月份: number | null
          月奖励绩效: number | null
          津贴: number | null
          独生子女父母奖励金: number | null
          级别岗位级别工资: number | null
          绩效奖金补扣发: number | null
          绩效工资: number | null
          职务技术等级工资: number | null
          薪级工资: number | null
          补助: number | null
          试用期工资: number | null
          身份证号: string | null
          部门: string | null
        }
        Relationships: []
      }
      view_payroll_period_estimation: {
        Row: {
          avg_estimated_amount: number | null
          max_amount: number | null
          min_amount: number | null
          total_employees: number | null
          total_estimated_amount: number | null
        }
        Relationships: []
      }
      view_payroll_summary: {
        Row: {
          department_id: string | null
          department_name: string | null
          employee_id: string | null
          employee_name: string | null
          gross_pay: number | null
          id_number: string | null
          is_current_month: boolean | null
          is_current_year: boolean | null
          net_pay: number | null
          notes: string | null
          pay_date: string | null
          pay_month: string | null
          pay_month_number: number | null
          pay_month_string: string | null
          pay_period_end: string | null
          pay_period_start: string | null
          pay_year: number | null
          payroll_created_at: string | null
          payroll_id: string | null
          payroll_updated_at: string | null
          position_id: string | null
          position_name: string | null
          status: Database["public"]["Enums"]["payroll_status"] | null
          total_deductions: number | null
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
            foreignKeyName: "employee_job_history_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
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
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      view_payroll_unified: {
        Row: {
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          category_name: Database["public"]["Enums"]["salary_category"] | null
          category_sort_order: number | null
          component_category:
            | Database["public"]["Enums"]["salary_category"]
            | null
          component_id: string | null
          component_name: string | null
          component_type: Database["public"]["Enums"]["component_type"] | null
          department_id: string | null
          department_name: string | null
          employee_id: string | null
          employee_name: string | null
          gross_pay: number | null
          id_number: string | null
          is_current_month: boolean | null
          is_current_year: boolean | null
          is_recent_12_months: boolean | null
          item_amount: number | null
          item_notes: string | null
          net_pay: number | null
          notes: string | null
          pay_date: string | null
          pay_month: string | null
          pay_month_number: number | null
          pay_month_string: string | null
          pay_period_end: string | null
          pay_period_start: string | null
          pay_year: number | null
          payroll_created_at: string | null
          payroll_id: string | null
          payroll_item_id: string | null
          payroll_updated_at: string | null
          position_id: string | null
          position_name: string | null
          primary_bank_account: string | null
          status: Database["public"]["Enums"]["payroll_status"] | null
          total_deductions: number | null
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
            foreignKeyName: "employee_job_history_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
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
            referencedRelation: "view_employee_payroll_statistics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_payroll_metadata"
            referencedColumns: ["id"]
          },
        ]
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
      view_salary_component_categories: {
        Row: {
          category_key: string | null
          category_name: string | null
          component_count: number | null
          component_ids: string[] | null
          component_names: string[] | null
          deduction_count: number | null
          earning_count: number | null
          sort_order: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_insurance_base: {
        Args: {
          p_original_base: number
          p_min_base: number
          p_max_base: number
          p_insurance_type?: string
        }
        Returns: Json
      }
      apply_base_limits: {
        Args:
          | {
              p_contribution_base: number
              p_base_floor: number
              p_base_ceiling: number
            }
          | {
              p_employee_id: string
              p_year_month: string
              p_region: string
              p_auto_adjust?: boolean
            }
        Returns: number
      }
      apply_housing_fund_rounding: {
        Args: { p_amount: number }
        Returns: number
      }
      assign_employee_category_batch: {
        Args: { p_assignments: Json }
        Returns: number
      }
      atomic_migrate_2025_02_payroll: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      auto_refresh_mappings_batch: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      auto_zero_ineligible_contribution_bases: {
        Args: { p_employee_id: string; p_effective_date: string }
        Returns: number
      }
      batch_calculate_social_insurance: {
        Args: {
          p_employee_ids: string[]
          p_period_id: string
          p_calculation_date?: string
        }
        Returns: {
          employee_id: string
          result: Database["public"]["CompositeTypes"]["social_insurance_result"]
          status: string
          error_message: string
        }[]
      }
      batch_import_all_contacts_banks: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_employees: number
          contacts_imported: number
          banks_imported: number
          errors: number
        }[]
      }
      batch_import_contacts_and_banks: {
        Args: Record<PropertyKey, never>
        Returns: {
          import_type: string
          employee_code: string
          status: string
          details: string
        }[]
      }
      batch_import_diverse_employees: {
        Args: Record<PropertyKey, never>
        Returns: {
          employee_code: string
          full_name: string
          department: string
          category: string
          status: string
          error_message: string
        }[]
      }
      batch_import_employees_from_pgs: {
        Args: Record<PropertyKey, never>
        Returns: {
          imported_count: number
          failed_count: number
          details: Json
        }[]
      }
      batch_import_next_20_employees: {
        Args: Record<PropertyKey, never>
        Returns: {
          employee_code: string
          full_name: string
          department: string
          category: string
          status: string
          error_message: string
        }[]
      }
      batch_import_remaining_employees: {
        Args: Record<PropertyKey, never>
        Returns: {
          employee_code: string
          full_name: string
          department: string
          category: string
          status: string
          error_message: string
        }[]
      }
      batch_import_test_employees: {
        Args: Record<PropertyKey, never>
        Returns: {
          employee_code: string
          full_name: string
          department: string
          category: string
          status: string
          error_message: string
        }[]
      }
      batch_recalculate_social_insurances: {
        Args: {
          p_pay_period_start?: string
          p_pay_period_end?: string
          p_employee_ids?: string[]
        }
        Returns: {
          payroll_id: string
          employee_id: string
          employee_name: string
          calculation_status: string
          error_message: string
        }[]
      }
      calculate_all_social_insurances: {
        Args: {
          p_payroll_id: string
          p_employee_id: string
          p_effective_date?: string
        }
        Returns: undefined
      }
      calculate_base_changes: {
        Args: { old_bases: Json; new_bases: Json }
        Returns: Json
      }
      calculate_employee_social_insurance: {
        Args: {
          p_employee_id: string
          p_period_id: string
          p_calculation_date?: string
        }
        Returns: Database["public"]["CompositeTypes"]["social_insurance_result"]
      }
      calculate_housing_fund: {
        Args: {
          p_payroll_id: string
          p_employee_id: string
          p_effective_date: string
        }
        Returns: undefined
      }
      calculate_injury_insurance: {
        Args: {
          p_payroll_id: string
          p_employee_id: string
          p_effective_date: string
        }
        Returns: undefined
      }
      calculate_insurance_universal: {
        Args: {
          p_employee_id: string
          p_payroll_id: string
          p_insurance_type_id: string
          p_contribution_base: number
          p_effective_date?: string
        }
        Returns: boolean
      }
      calculate_maternity_insurance: {
        Args: {
          p_payroll_id: string
          p_employee_id: string
          p_effective_date: string
        }
        Returns: undefined
      }
      calculate_medical_insurance: {
        Args: {
          p_payroll_id: string
          p_employee_id: string
          p_effective_date: string
        }
        Returns: undefined
      }
      calculate_monthly_insurance_with_eligibility: {
        Args: { p_employee_id: string; p_period_date: string }
        Returns: {
          insurance_type_id: string
          insurance_name: string
          system_key: string
          is_eligible: boolean
          contribution_base: number
          employer_rate: number
          employee_rate: number
          employer_amount: number
          employee_amount: number
        }[]
      }
      calculate_occupational_pension: {
        Args: {
          p_payroll_id: string
          p_employee_id: string
          p_effective_date: string
        }
        Returns: undefined
      }
      calculate_pension_insurance: {
        Args: {
          p_payroll_id: string
          p_employee_id: string
          p_effective_date: string
        }
        Returns: undefined
      }
      calculate_serious_illness: {
        Args: {
          p_base_amount: number
          p_employee_rate: number
          p_employer_rate: number
          p_calculation_metadata?: Json
        }
        Returns: Database["public"]["CompositeTypes"]["social_insurance_component"]
      }
      calculate_serious_illness_insurance: {
        Args: {
          p_payroll_id: string
          p_employee_id: string
          p_effective_date: string
        }
        Returns: undefined
      }
      calculate_unemployment_insurance: {
        Args: {
          p_payroll_id: string
          p_employee_id: string
          p_effective_date: string
        }
        Returns: undefined
      }
      calculate_work_injury_insurance: {
        Args: {
          p_payroll_id: string
          p_employee_id: string
          p_effective_date: string
        }
        Returns: undefined
      }
      can_access_all_data: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_access_employee: {
        Args: { p_user_id: string; p_employee_id: string }
        Returns: boolean
      }
      can_view_sensitive_data: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_insurance_applicability: {
        Args: {
          p_employee_id: string
          p_insurance_type_id: string
          p_effective_date: string
        }
        Returns: boolean
      }
      check_insurance_eligibility: {
        Args: {
          p_employee_id: string
          p_insurance_type_id: string
          p_effective_date?: string
        }
        Returns: boolean
      }
      check_rls_coverage: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      clean_duplicate_insurance_calculations: {
        Args: { p_pay_period_start?: string; p_pay_period_end?: string }
        Returns: {
          cleaned_records: number
          remaining_records: number
        }[]
      }
      cleanup_2025_02_migration: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      cleanup_change_log: {
        Args: { p_days_to_keep?: number }
        Returns: Json
      }
      cleanup_old_logs: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      clear_payroll_data_by_period: {
        Args: {
          p_pay_period_start: string
          p_pay_period_end: string
          p_confirm_token?: string
        }
        Returns: {
          success: boolean
          error_code: string
          error_message: string
          deleted_summary: Json
        }[]
      }
      convert_open_to_closed_records: {
        Args: { table_name: string; target_month?: string }
        Returns: {
          total_open_records: number
          generated_closed_records: number
          earliest_period: string
          latest_period: string
        }[]
      }
      copy_payroll_data_from_source: {
        Args: {
          p_source_period_start: string
          p_source_period_end: string
          p_target_period_start: string
          p_target_period_end: string
          p_target_pay_date: string
          p_selected_employee_ids?: string[]
        }
        Returns: {
          copied_employees: number
          copied_items: number
          total_amount: number
        }[]
      }
      create_admin_user: {
        Args: { p_user_id: string; p_role?: string }
        Returns: Json
      }
      create_next_month_bases: {
        Args: { p_current_month: string; p_created_by?: string }
        Returns: number
      }
      create_payroll_batch: {
        Args: {
          p_pay_period_start: string
          p_pay_period_end: string
          p_pay_date: string
          p_source_period_start?: string
          p_source_period_end?: string
          p_selected_employee_ids?: string[]
          p_created_by?: string
        }
        Returns: {
          success: boolean
          error_code: string
          error_message: string
          summary: Json
        }[]
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
        Args: { options: string[]; catalog: unknown }
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
      disable_social_insurance_triggers: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enable_social_insurance_triggers: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      encrypt_sensitive_data: {
        Args: { data: string }
        Returns: string
      }
      evaluate_rule_condition: {
        Args: { p_employee_id: string; p_condition_id: string }
        Returns: boolean
      }
      execute_atomic_migration_2025_02: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      execute_full_migration_2025_02: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      execute_social_insurance_migration: {
        Args: {
          p_source_connection_string?: string
          p_batch_size?: number
          p_dry_run?: boolean
        }
        Returns: Json
      }
      export_old_system_payroll_data: {
        Args: { p_period?: string }
        Returns: Json
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
        Args: { start_date: string; end_date?: string }
        Returns: {
          period_start: string
          period_end: string
          period_month: string
        }[]
      }
      get_accessible_employee_ids: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_applicable_deductions: {
        Args: {
          p_employee_id: string
          p_personnel_category: string
          p_region: string
          p_check_date?: string
        }
        Returns: {
          deduction_id: string
          code: string
          name: string
          type: string
          rates: Json
          base_config: Json
          priority: number
        }[]
      }
      get_available_payroll_months: {
        Args: Record<PropertyKey, never>
        Returns: {
          month: string
          payroll_count: number
          has_data: boolean
        }[]
      }
      get_change_tracking_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_closed_bank_account: {
        Args: { p_employee_id: string; p_effective_date?: string }
        Returns: {
          id: string
          account_number: string
          bank_name: string
          account_holder_name: string
          is_primary: boolean
        }[]
      }
      get_closed_contribution_base: {
        Args: {
          p_employee_id: string
          p_insurance_type_id: string
          p_effective_date?: string
        }
        Returns: number
      }
      get_closed_employee_category: {
        Args: { p_employee_id: string; p_effective_date?: string }
        Returns: {
          employee_category_id: string
          effective_start_date: string
          effective_end_date: string
          notes: string
        }[]
      }
      get_closed_job_history: {
        Args: { p_employee_id: string; p_effective_date?: string }
        Returns: {
          department_id: string
          position_id: string
          rank_id: string
          effective_start_date: string
          effective_end_date: string
        }[]
      }
      get_current_user_employee_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_department_ancestors: {
        Args: { p_department_id: string }
        Returns: {
          id: string
          code: string
          name: string
          level: number
        }[]
      }
      get_department_children: {
        Args: { p_department_id: string }
        Returns: {
          id: string
          code: string
          name: string
          level: number
          full_path_name: string
        }[]
      }
      get_department_full_path_name: {
        Args: { p_department_id: string }
        Returns: string
      }
      get_department_salary_stats: {
        Args: { target_month: string }
        Returns: {
          department_name: string
          employee_count: number
          avg_salary: number
          min_salary: number
          max_salary: number
          total_cost: number
        }[]
      }
      get_department_tree: {
        Args: { p_parent_id?: string }
        Returns: Json
      }
      get_effective_contribution_base: {
        Args: {
          p_employee_id: string
          p_insurance_type_id: string
          p_effective_date: string
        }
        Returns: number
      }
      get_effective_policy_rule: {
        Args: {
          p_insurance_type_id: string
          p_employee_category_id: string
          p_effective_date?: string
        }
        Returns: {
          created_at: string
          id: string
          insurance_type_id: string
          notes: string | null
          policy_description: string | null
          policy_id: string
        }
      }
      get_employee_applicable_deductions: {
        Args: { p_employee_id: string; p_include_metadata?: boolean }
        Returns: {
          deduction_config_id: string
          deduction_code: string
          deduction_name: string
          deduction_type: string
          match_priority: number
          matched_conditions: string[]
          match_metadata: Json
        }[]
      }
      get_employee_bases: {
        Args: { p_employee_id: string; p_year_month: string }
        Returns: {
          social_insurance_base: number
          housing_fund_base: number
          occupational_pension_base: number
          status: string
        }[]
      }
      get_employee_category_at_date: {
        Args: { p_employee_id: string; p_date?: string }
        Returns: {
          category_id: string
          category_name: string
          effective_start_date: string
        }[]
      }
      get_employee_details: {
        Args: { employee_uuid: string }
        Returns: Json
      }
      get_employee_eligible_insurance_types: {
        Args: { p_employee_id: string; p_effective_date?: string }
        Returns: {
          insurance_type_id: string
          system_key: string
          name: string
          is_eligible: boolean
        }[]
      }
      get_employee_encryption_key: {
        Args: { p_employee_code: string }
        Returns: string
      }
      get_employee_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_employee_id_number: {
        Args: { p_employee_id: string; p_mask_output?: boolean }
        Returns: string
      }
      get_employee_insurance_base_monthly: {
        Args: {
          start_date?: string
          end_date?: string
          employee_id_filter?: string
        }
        Returns: {
          employee_id: string
          full_name: string
          id_number: string
          insurance_type_id: string
          insurance_type_name: string
          insurance_type_key: string
          month: string
          month_string: string
          year: number
          month_number: number
          contribution_base: number
          has_explicit_base: boolean
        }[]
      }
      get_employee_salary_history: {
        Args: { employee_id: string; months_back?: number }
        Returns: {
          pay_month: string
          total_amount: number
          basic_salary: number
          allowances: number
          deductions: number
        }[]
      }
      get_employee_stats_by_category: {
        Args: Record<PropertyKey, never>
        Returns: {
          category_key: string
          display_name_zh: string
          employee_count: number
          active_count: number
          inactive_count: number
        }[]
      }
      get_employee_status_at_date: {
        Args: { p_employee_id: string; p_date: string }
        Returns: {
          id: string
          full_name: string
          department_id: string
          department_name: string
          position_id: string
          position_name: string
          rank_id: string
          rank_name: string
          employee_category_id: string
          category_name: string
          has_occupational_pension: boolean
        }[]
      }
      get_employee_with_category_info: {
        Args: { employee_id: string }
        Returns: Json
      }
      get_employees_payroll_estimation: {
        Args: { employee_ids: string[] }
        Returns: {
          total_employees: number
          total_estimated_amount: number
          avg_estimated_amount: number
        }[]
      }
      get_insurance_calculation_summary: {
        Args: { p_pay_period_start?: string; p_pay_period_end?: string }
        Returns: {
          summary_type: string
          employee_count: number
          total_employee_amount: number
          total_employer_amount: number
          total_amount: number
        }[]
      }
      get_insurance_component_name: {
        Args: { p_insurance_type: string }
        Returns: string
      }
      get_mapping_coverage_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_migration_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          entity_type: string
          total_count: number
          details: Json
        }[]
      }
      get_payroll_batch_summary: {
        Args: { p_pay_period_start: string; p_pay_period_end: string }
        Returns: {
          period_info: Json
          employee_count: number
          item_count: number
          total_gross_pay: number
          total_net_pay: number
          status_breakdown: Json
        }[]
      }
      get_payroll_validation_data: {
        Args: { source_month: string; selected_employee_ids?: string[] }
        Returns: {
          employee_id: string
          employee_name: string
          id_number: string
          payroll_id: string
          component_id: string
          component_name: string
          component_type: string
          component_category: string
          amount: number
          pay_date: string
          pay_period_start: string
          pay_period_end: string
        }[]
      }
      get_permissions_overview: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_personnel_categories_config: {
        Args: Record<PropertyKey, never>
        Returns: {
          category_key: string
          display_name_zh: string
          display_name_en: string
          description: string
          sort_order: number
          business_rules: Json
          is_active: boolean
        }[]
      }
      get_personnel_category_display: {
        Args: { category_key: string; lang?: string }
        Returns: string
      }
      get_salary_fields_by_category_and_month: {
        Args: { target_month?: string; category_filter?: string }
        Returns: {
          component_category: string
          field_name: string
          field_display_name: string
          source_table: string
          pay_month: string
          pay_month_string: string
          record_count: number
          positive_record_count: number
          avg_amount: number
          min_amount: number
          max_amount: number
          has_positive_data: boolean
          data_coverage_percentage: number
        }[]
      }
      get_social_insurance_summary: {
        Args: { p_period_id: string; p_department_id?: string }
        Returns: Json
      }
      get_table_columns: {
        Args: { table_name_param: string; schema_name_param?: string }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
          ordinal_position: number
          column_default: string
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
      import_all_pgs_employees: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_count: number
          imported_count: number
          failed_count: number
          error_details: Json
        }[]
      }
      import_employee_bank_account: {
        Args: {
          p_employee_code: string
          p_bank_name: string
          p_account_holder_name: string
          p_account_number: string
          p_branch_name?: string
          p_bank_code?: string
          p_is_primary?: boolean
          p_pgs_bank_id?: number
        }
        Returns: boolean
      }
      import_employee_contact: {
        Args: {
          p_employee_code: string
          p_phone_number: string
          p_email?: string
          p_address?: string
          p_emergency_name?: string
          p_emergency_phone?: string
        }
        Returns: boolean
      }
      import_employee_from_pgs: {
        Args: {
          pgs_employee_code: string
          pgs_employee_name: string
          pgs_department_code: string
          pgs_personnel_category?: string
          pgs_position?: string
          pgs_job_level?: string
          additional_data?: Json
        }
        Returns: string
      }
      import_from_postgresql_database: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      import_pgs_departments: {
        Args: Record<PropertyKey, never>
        Returns: {
          imported_count: number
          skipped_count: number
          error_count: number
          import_log: string
        }[]
      }
      import_pgs_employees: {
        Args: Record<PropertyKey, never>
        Returns: {
          imported_count: number
          skipped_count: number
          error_count: number
          import_log: string
        }[]
      }
      import_single_employee_2025_02: {
        Args: { p_employee_name: string; p_old_system_data: Json }
        Returns: Json
      }
      import_social_insurance_base_configs: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      import_tax_brackets_config: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      insert_department: {
        Args: {
          p_code: string
          p_name: string
          p_parent_code?: string
          p_sort_order?: number
          p_is_active?: boolean
          p_meta?: Json
        }
        Returns: string
      }
      insert_department_secure: {
        Args: {
          p_code: string
          p_name: string
          p_parent_code?: string
          p_sort_order?: number
          p_is_active?: boolean
          p_meta?: Json
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
      log_insurance_calculation: {
        Args: {
          p_payroll_id: string
          p_employee_id: string
          p_insurance_type_id: string
          p_is_applicable: boolean
          p_contribution_base?: number
          p_adjusted_base?: number
          p_employee_rate?: number
          p_employer_rate?: number
          p_employee_amount?: number
          p_employer_amount?: number
          p_skip_reason?: string
        }
        Returns: undefined
      }
      map_pgs_personnel_category: {
        Args: { pgs_category: string }
        Returns: string
      }
      mask_account_number: {
        Args: { account_number: string }
        Returns: string
      }
      migrate_payroll_data_2025_02: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      move_department: {
        Args: { p_department_id: string; p_new_parent_id?: string }
        Returns: boolean
      }
      pre_validate_migration_2025_02: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      quick_export_payroll_summary: {
        Args: { p_period?: string }
        Returns: Json
      }
      recalculate_all_payrolls: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_all_employee_deduction_mappings: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      refresh_employee_deduction_mappings: {
        Args: {
          p_employee_ids?: string[]
          p_deduction_config_ids?: string[]
          p_force_refresh?: boolean
        }
        Returns: Json
      }
      refresh_employee_deductions: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      schedule_mapping_refresh: {
        Args: { p_interval_seconds?: number }
        Returns: string
      }
      search_employees: {
        Args: { search_term: string; limit_count?: number }
        Returns: {
          id: string
          full_name: string
          employee_code: string
          department_name: string
          current_status: Database["public"]["Enums"]["employee_status_enum"]
        }[]
      }
      soft_delete_department: {
        Args: { p_department_id: string; p_deleted_by?: string }
        Returns: number
      }
      test_rls_policies: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      test_social_insurance_calculation: {
        Args: {
          p_employee_id: string
          p_social_insurance_base: number
          p_housing_fund_base: number
          p_occupational_pension_base?: number
        }
        Returns: {
          insurance_type: string
          component_name: string
          employee_amount: number
          employer_amount: number
          employee_rate: number
          employer_rate: number
          base_amount: number
          special_note: string
        }[]
      }
      transform_personnel_category_rules: {
        Args: { p_dry_run?: boolean } | { p_source_data: Json }
        Returns: Json
      }
      transform_social_insurance_configs: {
        Args: { p_dry_run?: boolean }
        Returns: Json
      }
      transform_social_security_rates: {
        Args: { p_dry_run?: boolean } | { p_source_data: Json }
        Returns: Json
      }
      trigger_mapping_refresh_for_employee: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      validate_employee_salary_reasonableness: {
        Args: { employee_id: string; current_total: number }
        Returns: {
          is_reasonable: boolean
          variance_percentage: number
          historical_average: number
          issue_description: string
        }[]
      }
      validate_insurance_base: {
        Args: {
          p_region: string
          p_insurance_type: string
          p_base_amount: number
          p_check_date?: string
        }
        Returns: Json
      }
      validate_migration_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      validate_payroll_creation: {
        Args: {
          p_pay_period_start: string
          p_pay_period_end: string
          p_selected_employee_ids?: string[]
        }
        Returns: {
          is_valid: boolean
          error_code: string
          error_message: string
          conflicting_records: number
        }[]
      }
      validate_payroll_data_integrity: {
        Args: { p_pay_period_start?: string; p_pay_period_end?: string }
        Returns: {
          check_name: string
          status: string
          details: string
        }[]
      }
      validate_personnel_category: {
        Args: { category_key: string }
        Returns: boolean
      }
      verify_employee_import: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          status: string
          details: string
        }[]
      }
      verify_pgs_import: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          status: string
          details: string
        }[]
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
      payroll_status: "draft" | "approved" | "paid" | "cancelled"
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
    }
    CompositeTypes: {
      dblink_pkey_results: {
        position: number | null
        colname: string | null
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
  graphql_public: {
    Enums: {},
  },
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
      payroll_status: ["draft", "approved", "paid", "cancelled"],
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
    },
  },
} as const
A new version of Supabase CLI is available: v2.34.3 (currently installed v2.33.9)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
