// Database types for Fleet Management System
// Generated from database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type VehicleStatus = 'active' | 'repair' | 'unavailable' | 'rented'
export type UserRole = 'owner' | 'admin' | 'manager' | 'team_lead' | 'worker'
export type PenaltyStatus = 'open' | 'paid'
export type MaintenanceType = 'inspection' | 'repair'
export type ExpenseType = 'vehicle' | 'team'
export type WorkerCategory = 'driver' | 'mechanic' | 'specialist' | 'general'
export type CarExpenseCategory = 'fuel' | 'repair' | 'maintenance' | 'insurance' | 'other'

// Database tables
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          subscription_status: string
          subscription_expires_at: string | null
          telegram_chat_id: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          subscription_status?: string
          subscription_expires_at?: string | null
          telegram_chat_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          subscription_status?: string
          subscription_expires_at?: string | null
          telegram_chat_id?: string | null
        }
      }
      teams: {
        Row: {
          id: string
          organization_id: string
          name: string
          lead_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          lead_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          lead_id?: string | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          organization_id: string
          email: string
          password_hash: string
          first_name: string
          last_name: string
          phone: string | null
          role: UserRole
          team_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          password_hash: string
          first_name: string
          last_name: string
          phone?: string | null
          role: UserRole
          team_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          password_hash?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          role?: UserRole
          team_id?: string | null
          created_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          organization_id: string
          team_id: string
          first_name: string
          last_name: string
          phone: string | null
          category: WorkerCategory
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          team_id: string
          first_name: string
          last_name: string
          phone?: string | null
          category?: WorkerCategory
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          team_id?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          category?: WorkerCategory
          created_at?: string
        }
      }
      team_member_documents: {
        Row: {
          id: string
          team_member_id: string
          title: string
          file_url: string
          expiry_date: string | null
          upload_date: string
        }
        Insert: {
          id?: string
          team_member_id: string
          title: string
          file_url: string
          expiry_date?: string | null
          upload_date?: string
        }
        Update: {
          id?: string
          team_member_id?: string
          title?: string
          file_url?: string
          expiry_date?: string | null
          upload_date?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          organization_id: string
          name: string
          license_plate: string | null
          vin: string | null
          status: VehicleStatus
          created_at: string
          is_rental: boolean
          rental_start_date: string | null
          rental_end_date: string | null
          rental_monthly_price: number | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          license_plate?: string | null
          vin?: string | null
          status?: VehicleStatus
          created_at?: string
          is_rental?: boolean
          rental_start_date?: string | null
          rental_end_date?: string | null
          rental_monthly_price?: number | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          license_plate?: string | null
          vin?: string | null
          status?: VehicleStatus
          created_at?: string
          is_rental?: boolean
          rental_start_date?: string | null
          rental_end_date?: string | null
          rental_monthly_price?: number | null
        }
      }
      vehicle_documents: {
        Row: {
          id: string
          vehicle_id: string
          document_type: string
          title: string
          file_url: string
          date_issued: string | null
          date_expiry: string | null
          is_active: boolean
          upload_date: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          document_type: string
          title: string
          file_url: string
          date_issued?: string | null
          date_expiry?: string | null
          is_active?: boolean
          upload_date?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          document_type?: string
          title?: string
          file_url?: string
          date_issued?: string | null
          date_expiry?: string | null
          is_active?: boolean
          upload_date?: string
        }
      }
      vehicle_assignments: {
        Row: {
          id: string
          vehicle_id: string
          team_id: string
          start_date: string
          end_date: string | null
        }
        Insert: {
          id?: string
          vehicle_id: string
          team_id: string
          start_date: string
          end_date?: string | null
        }
        Update: {
          id?: string
          vehicle_id?: string
          team_id?: string
          start_date?: string
          end_date?: string | null
        }
      }
      penalties: {
        Row: {
          id: string
          organization_id: string
          vehicle_id: string
          user_id: string | null
          date: string
          amount: number
          photo_url: string | null
          status: PenaltyStatus
        }
        Insert: {
          id?: string
          organization_id: string
          vehicle_id: string
          user_id?: string | null
          date: string
          amount: number
          photo_url?: string | null
          status?: PenaltyStatus
        }
        Update: {
          id?: string
          organization_id?: string
          vehicle_id?: string
          user_id?: string | null
          date?: string
          amount?: number
          photo_url?: string | null
          status?: PenaltyStatus
        }
      }
      maintenances: {
        Row: {
          id: string
          organization_id: string
          vehicle_id: string
          date: string
          type: MaintenanceType
          description: string | null
          receipt_url: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          vehicle_id: string
          date: string
          type: MaintenanceType
          description?: string | null
          receipt_url?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          vehicle_id?: string
          date?: string
          type?: MaintenanceType
          description?: string | null
          receipt_url?: string | null
        }
      }
      car_expenses: {
        Row: {
          id: string
          organization_id: string
          vehicle_id: string
          date: string
          category: CarExpenseCategory
          amount: number
          description: string | null
          receipt_url: string | null
          maintenance_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          vehicle_id: string
          date: string
          category: CarExpenseCategory
          amount: number
          description?: string | null
          receipt_url?: string | null
          maintenance_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          vehicle_id?: string
          date?: string
          category?: CarExpenseCategory
          amount?: number
          description?: string | null
          receipt_url?: string | null
          maintenance_id?: string | null
          created_at?: string
        }
      }
      user_documents: {
        Row: {
          id: string
          user_id: string
          document_type: string
          title: string
          file_url: string
          date_issued: string | null
          date_expiry: string | null
          is_active: boolean
          upload_date: string
        }
        Insert: {
          id?: string
          user_id: string
          document_type: string
          title: string
          file_url: string
          date_issued?: string | null
          date_expiry?: string | null
          is_active?: boolean
          upload_date?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_type?: string
          title?: string
          file_url?: string
          date_issued?: string | null
          date_expiry?: string | null
          is_active?: boolean
          upload_date?: string
        }
      }
      rental_contracts: {
        Row: {
          id: string
          organization_id: string
          vehicle_id: string
          contract_number: string | null
          rental_company_name: string
          rental_company_contact: string | null
          start_date: string
          end_date: string
          monthly_price: number
          deposit_amount: number | null
          contract_file_url: string | null
          terms: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          vehicle_id: string
          contract_number?: string | null
          rental_company_name: string
          rental_company_contact?: string | null
          start_date: string
          end_date: string
          monthly_price: number
          deposit_amount?: number | null
          contract_file_url?: string | null
          terms?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          vehicle_id?: string
          contract_number?: string | null
          rental_company_name?: string
          rental_company_contact?: string | null
          start_date?: string
          end_date?: string
          monthly_price?: number
          deposit_amount?: number | null
          contract_file_url?: string | null
          terms?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          organization_id: string
          type: ExpenseType
          vehicle_id: string | null
          team_id: string | null
          date: string
          amount: number
          description: string | null
          receipt_url: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          type: ExpenseType
          vehicle_id?: string | null
          team_id?: string | null
          date: string
          amount: number
          description?: string | null
          receipt_url?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          type?: ExpenseType
          vehicle_id?: string | null
          team_id?: string | null
          date?: string
          amount?: number
          description?: string | null
          receipt_url?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      vehicle_status: VehicleStatus
      user_role: UserRole
      penalty_status: PenaltyStatus
      maintenance_type: MaintenanceType
      expense_type: ExpenseType
      worker_category: WorkerCategory
      car_expense_category: CarExpenseCategory
    }
  }
}
