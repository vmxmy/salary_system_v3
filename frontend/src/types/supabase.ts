/**
 * Supabase Database Types
 * Generated based on database schema design
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string
          name: string
          parent_department_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          parent_department_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          parent_department_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      employee_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_category_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_category_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          parent_category_id?: string | null
          created_at?: string
        }
      }
      
      job_ranks: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      
      positions: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      
      employees: {
        Row: {
          id: string
          user_id: string | null
          employee_name: string | null
          id_number: string | null
          gender: string | null
          date_of_birth: string | null
          hire_date: string
          termination_date: string | null
          employment_status: string
          manager_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          employee_name?: string | null
          id_number?: string | null
          gender?: string | null
          date_of_birth?: string | null
          hire_date: string
          termination_date?: string | null
          employment_status?: string
          manager_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          employee_name?: string | null
          id_number?: string | null
          gender?: string | null
          date_of_birth?: string | null
          hire_date?: string
          termination_date?: string | null
          employment_status?: string
          manager_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      employee_job_history: {
        Row: {
          id: string
          employee_id: string
          department_id: string
          position_id: string
          rank_id: string
          effective_start_date: string
          effective_end_date: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          department_id: string
          position_id: string
          rank_id: string
          effective_start_date: string
          effective_end_date?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          department_id?: string
          position_id?: string
          rank_id?: string
          effective_start_date?: string
          effective_end_date?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      
      employee_bank_accounts: {
        Row: {
          id: string
          employee_id: string
          bank_name_encrypted: string
          account_number_encrypted: string
          account_holder_name_encrypted: string
          nonce: string
          is_primary: boolean
          effective_start_date: string
          effective_end_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          bank_name_encrypted: string
          account_number_encrypted: string
          account_holder_name_encrypted: string
          nonce: string
          is_primary?: boolean
          effective_start_date: string
          effective_end_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          bank_name_encrypted?: string
          account_number_encrypted?: string
          account_holder_name_encrypted?: string
          nonce?: string
          is_primary?: boolean
          effective_start_date?: string
          effective_end_date?: string | null
          created_at?: string
        }
      }
      
      employee_contacts: {
        Row: {
          id: string
          employee_id: string
          contact_type: 'personal_email' | 'work_email' | 'mobile_phone' | 'home_phone' | 'address'
          contact_value_encrypted: string
          nonce: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          contact_type: 'personal_email' | 'work_email' | 'mobile_phone' | 'home_phone' | 'address'
          contact_value_encrypted: string
          nonce: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          contact_type?: 'personal_email' | 'work_email' | 'mobile_phone' | 'home_phone' | 'address'
          contact_value_encrypted?: string
          nonce?: string
          is_primary?: boolean
          created_at?: string
        }
      }
      
      employee_education: {
        Row: {
          id: string
          employee_id: string
          institution_name: string
          degree: string
          field_of_study: string
          graduation_date: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          institution_name: string
          degree: string
          field_of_study: string
          graduation_date?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          institution_name?: string
          degree?: string
          field_of_study?: string
          graduation_date?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      
      employee_category_assignments: {
        Row: {
          id: string
          employee_id: string
          employee_category_id: string
          effective_start_date: string
          effective_end_date: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          employee_category_id: string
          effective_start_date: string
          effective_end_date?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          employee_category_id?: string
          effective_start_date?: string
          effective_end_date?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      
      salary_components: {
        Row: {
          id: string
          name: string
          type: 'earning' | 'deduction'
          description: string | null
          is_taxable: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'earning' | 'deduction'
          description?: string | null
          is_taxable?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'earning' | 'deduction'
          description?: string | null
          is_taxable?: boolean
          created_at?: string
        }
      }
      
      payrolls: {
        Row: {
          id: string
          employee_id: string
          pay_period_start: string
          pay_period_end: string
          pay_date: string
          gross_pay: number
          total_deductions: number
          net_pay: number
          status: 'draft' | 'calculating' | 'calculated' | 'approved' | 'paid' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          pay_period_start: string
          pay_period_end: string
          pay_date: string
          gross_pay?: number
          total_deductions?: number
          net_pay?: number
          status?: 'draft' | 'calculating' | 'calculated' | 'approved' | 'paid' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          pay_period_start?: string
          pay_period_end?: string
          pay_date?: string
          gross_pay?: number
          total_deductions?: number
          net_pay?: number
          status?: 'draft' | 'calculating' | 'calculated' | 'approved' | 'paid' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      payroll_periods: {
        Row: {
          id: string
          period_code: string
          period_name: string
          period_year: number
          period_month: number
          period_start: string
          period_end: string
          pay_date: string
          status: string
          description?: string
          employee_count?: number
          total_gross_pay?: number
          total_net_pay?: number
          created_by?: string
          created_at: string
          updated_at: string
          locked_at?: string
          locked_by?: string
        }
        Insert: {
          id?: string
          period_code: string
          period_name: string
          period_year: number
          period_month: number
          period_start: string
          period_end: string
          pay_date: string
          status?: string
          description?: string
          employee_count?: number
          total_gross_pay?: number
          total_net_pay?: number
          created_by?: string
          created_at?: string
          updated_at?: string
          locked_at?: string
          locked_by?: string
        }
        Update: {
          id?: string
          period_code?: string
          period_name?: string
          period_year?: number
          period_month?: number
          period_start?: string
          period_end?: string
          pay_date?: string
          status?: string
          description?: string
          employee_count?: number
          total_gross_pay?: number
          total_net_pay?: number
          created_by?: string
          created_at?: string
          updated_at?: string
          locked_at?: string
          locked_by?: string
        }
      }

      payroll_results: {
        Row: {
          id: string
          payroll_id: string
          component_id: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          payroll_id: string
          component_id: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          payroll_id?: string
          component_id?: string
          amount?: number
          created_at?: string
        }
      }

      payroll_items: {
        Row: {
          id: string
          payroll_id: string
          component_id: string
          amount: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          payroll_id: string
          component_id: string
          amount: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payroll_id?: string
          component_id?: string
          amount?: number
          notes?: string | null
          created_at?: string
        }
      }
      
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
        }
      }
    }
    Views: {
      v_employee_current_status: {
        Row: {
          employee_id: string
          full_name: string
          employment_status: string
          department_name: string | null
          position_name: string | null
          rank_name: string | null
          job_start_date: string | null
          category_name: string | null
          category_start_date: string | null
        }
      }
    }
    Functions: {
      get_employee_category_at_date: {
        Args: {
          p_employee_id: string
          p_date?: string
        }
        Returns: {
          category_id: string
          category_name: string
          effective_start_date: string
        }[]
      }
      check_insurance_eligibility: {
        Args: {
          p_employee_id: string
          p_insurance_type_id: string
          p_effective_date?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      component_type: 'earning' | 'deduction'
      payroll_status: 'draft' | 'approved' | 'paid' | 'cancelled'
      contact_method_type: 'personal_email' | 'work_email' | 'mobile_phone' | 'home_phone' | 'address'
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Commonly used types
export type Department = Tables<'departments'>
export type Employee = Tables<'employees'>
export type Position = Tables<'positions'>
export type JobRank = Tables<'job_ranks'>
export type EmployeeCategory = Tables<'employee_categories'>
export type SalaryComponent = Tables<'salary_components'>
export type Payroll = Tables<'payrolls'>
export type PayrollItem = Tables<'payroll_items'>
export type UserRole = Tables<'user_roles'>