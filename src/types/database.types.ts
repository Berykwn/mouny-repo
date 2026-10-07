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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          archived_at: string | null
          balance: number
          created_at: string | null
          id: string
          initial_balance: number
          is_savings: boolean
          name: string
          type: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          balance?: number
          created_at?: string | null
          id?: string
          initial_balance?: number
          is_savings?: boolean
          name: string
          type: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          balance?: number
          created_at?: string | null
          id?: string
          initial_balance?: number
          is_savings?: boolean
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          bg_color: string | null
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_savings: boolean
          kind: string | null
          name: string
          type: string
          user_id: string
        }
        Insert: {
          bg_color?: string | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_savings?: boolean
          kind?: string | null
          name: string
          type: string
          user_id: string
        }
        Update: {
          bg_color?: string | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_savings?: boolean
          kind?: string | null
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      category_budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_budgets_category_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          date: string
          debt_id: string
          id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          date: string
          debt_id: string
          id?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          date?: string
          debt_id?: string
          id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_account_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id", "user_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "debt_payments_transaction_id_fkey"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      debts: {
        Row: {
          counterparty: string
          created_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          pay_from_account_id: string | null
          remaining_amount: number
          status: string
          total_amount: number
          type: string
          user_id: string
        }
        Insert: {
          counterparty: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          pay_from_account_id?: string | null
          remaining_amount: number
          status?: string
          total_amount: number
          type: string
          user_id: string
        }
        Update: {
          counterparty?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          pay_from_account_id?: string | null
          remaining_amount?: number
          status?: string
          total_amount?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_pay_from_account_id_fkey"
            columns: ["pay_from_account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          bills: boolean
          daily_hour: number
          daily_log: boolean
          debts: boolean
          budgets: boolean
          time_zone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bills?: boolean
          daily_hour?: number
          daily_log?: boolean
          debts?: boolean
          budgets?: boolean
          time_zone?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          bills?: boolean
          daily_hour?: number
          daily_log?: boolean
          debts?: boolean
          budgets?: boolean
          time_zone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pay_periods: {
        Row: {
          closing_balance: number | null
          created_at: string | null
          end_date: string | null
          id: string
          notes: string | null
          salary_account_id: string | null
          salary_amount: number
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          closing_balance?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          salary_account_id?: string | null
          salary_amount: number
          start_date: string
          status?: string
          user_id: string
        }
        Update: {
          closing_balance?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          salary_account_id?: string | null
          salary_amount?: number
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_periods_salary_account_id_fkey"
            columns: ["salary_account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quick_transactions: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          label: string | null
          last_account_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          label?: string | null
          last_account_id?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          label?: string | null
          last_account_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_transactions_category_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "quick_transactions_last_account_id_fkey"
            columns: ["last_account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      recurring_bills: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          due_day: number
          due_month: number | null
          ends_on: string | null
          frequency: string
          id: string
          kind: string
          name: string
          paused: boolean
          starts_on: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          due_day: number
          due_month?: number | null
          ends_on?: string | null
          frequency?: string
          id?: string
          kind?: string
          name: string
          paused?: boolean
          starts_on?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          due_day?: number
          due_month?: number | null
          ends_on?: string | null
          frequency?: string
          id?: string
          kind?: string
          name?: string
          paused?: boolean
          starts_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bills_account_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "recurring_bills_category_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          account_is_savings: boolean
          amount: number
          category_id: string | null
          category_is_savings: boolean
          created_at: string | null
          date: string
          debt_id: string | null
          id: string
          note: string | null
          pay_period_id: string | null
          recurring_bill_id: string | null
          transfer_id: string | null
          type: string
          user_id: string
          wish_list_item_id: string | null
          wish_quantity: number | null
        }
        Insert: {
          account_id: string
          account_is_savings?: boolean
          amount: number
          category_id?: string | null
          category_is_savings?: boolean
          created_at?: string | null
          date?: string
          debt_id?: string | null
          id?: string
          note?: string | null
          pay_period_id?: string | null
          recurring_bill_id?: string | null
          transfer_id?: string | null
          type: string
          user_id: string
          wish_list_item_id?: string | null
          wish_quantity?: number | null
        }
        Update: {
          account_id?: string
          account_is_savings?: boolean
          amount?: number
          category_id?: string | null
          category_is_savings?: boolean
          created_at?: string | null
          date?: string
          debt_id?: string | null
          id?: string
          note?: string | null
          pay_period_id?: string | null
          recurring_bill_id?: string | null
          transfer_id?: string | null
          type?: string
          user_id?: string
          wish_list_item_id?: string | null
          wish_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_debt_id_fkey"
            columns: ["debt_id", "user_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_pay_period_id_fkey"
            columns: ["pay_period_id", "user_id"]
            isOneToOne: false
            referencedRelation: "active_period_summary"
            referencedColumns: ["period_id", "user_id"]
          },
          {
            foreignKeyName: "transactions_pay_period_id_fkey"
            columns: ["pay_period_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pay_periods"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_recurring_bill_id_fkey"
            columns: ["recurring_bill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "recurring_bills"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_wish_list_item_id_fkey"
            columns: ["wish_list_item_id", "user_id"]
            isOneToOne: false
            referencedRelation: "wish_list"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      wish_list: {
        Row: {
          created_at: string | null
          estimated_price: number | null
          icon: string | null
          id: string
          is_purchased: boolean
          name: string
          notes: string | null
          pay_period_id: string
          price_per_unit: number | null
          priority: string | null
          quantity: number | null
          saved_amount: number
          saved_quantity: number
          target_date: string | null
          transaction_id: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          estimated_price?: number | null
          icon?: string | null
          id?: string
          is_purchased?: boolean
          name: string
          notes?: string | null
          pay_period_id: string
          price_per_unit?: number | null
          priority?: string | null
          quantity?: number | null
          saved_amount?: number
          saved_quantity?: number
          target_date?: string | null
          transaction_id?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          estimated_price?: number | null
          icon?: string | null
          id?: string
          is_purchased?: boolean
          name?: string
          notes?: string | null
          pay_period_id?: string
          price_per_unit?: number | null
          priority?: string | null
          quantity?: number | null
          saved_amount?: number
          saved_quantity?: number
          target_date?: string | null
          transaction_id?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wish_list_pay_period_id_fkey"
            columns: ["pay_period_id", "user_id"]
            isOneToOne: false
            referencedRelation: "active_period_summary"
            referencedColumns: ["period_id", "user_id"]
          },
          {
            foreignKeyName: "wish_list_pay_period_id_fkey"
            columns: ["pay_period_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pay_periods"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "wish_list_transaction_id_fkey"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      active_period_summary: {
        Row: {
          closing_balance: number | null
          end_date: string | null
          estimated_remaining: number | null
          period_id: string | null
          salary_amount: number | null
          start_date: string | null
          status: string | null
          total_expense: number | null
          total_income: number | null
          transaction_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_balance: {
        Args: { p_account_id: string; p_amount: number; p_date?: string }
        Returns: {
          archived_at: string | null
          balance: number
          created_at: string | null
          id: string
          initial_balance: number
          is_savings: boolean
          name: string
          type: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_debt_payment: {
        Args: {
          p_account_id: string
          p_amount: number
          p_date: string
          p_debt_id: string
          p_transaction_id: string
        }
        Returns: {
          counterparty: string
          created_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          pay_from_account_id: string | null
          remaining_amount: number
          status: string
          total_amount: number
          type: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "debts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      buy_wish: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id: string
          p_date: string
          p_note: string
          p_pay_period_id: string
          p_wish_id: string
        }
        Returns: {
          created_at: string | null
          estimated_price: number | null
          icon: string | null
          id: string
          is_purchased: boolean
          name: string
          notes: string | null
          pay_period_id: string
          price_per_unit: number | null
          priority: string | null
          quantity: number | null
          saved_amount: number
          saved_quantity: number
          target_date: string | null
          transaction_id: string | null
          unit: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wish_list"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      collect_receivable: {
        Args: {
          p_account_id: string
          p_amount: number
          p_date: string
          p_debt_id: string
        }
        Returns: {
          counterparty: string
          created_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          pay_from_account_id: string | null
          remaining_amount: number
          status: string
          total_amount: number
          type: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "debts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_debt: {
        Args: {
          p_account_id: string
          p_counterparty: string
          p_date: string
          p_due_date: string
          p_moves_money: boolean
          p_notes: string
          p_pay_period_id: string
          p_total_amount: number
          p_type: string
        }
        Returns: {
          counterparty: string
          created_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          pay_from_account_id: string | null
          remaining_amount: number
          status: string
          total_amount: number
          type: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "debts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      contribute_wish: {
        Args: { p_amount: number; p_id: string }
        Returns: {
          created_at: string | null
          estimated_price: number | null
          icon: string | null
          id: string
          is_purchased: boolean
          name: string
          notes: string | null
          pay_period_id: string
          price_per_unit: number | null
          priority: string | null
          quantity: number | null
          saved_amount: number
          saved_quantity: number
          target_date: string | null
          transaction_id: string | null
          unit: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wish_list"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      contribute_wish_quantity: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id: string
          p_date: string
          p_note: string
          p_pay_period_id: string
          p_quantity: number
          p_wish_id: string
        }
        Returns: {
          created_at: string | null
          estimated_price: number | null
          icon: string | null
          id: string
          is_purchased: boolean
          name: string
          notes: string | null
          pay_period_id: string
          price_per_unit: number | null
          priority: string | null
          quantity: number | null
          saved_amount: number
          saved_quantity: number
          target_date: string | null
          transaction_id: string | null
          unit: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wish_list"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      move_to_savings: {
        Args: { p_account_id: string; p_id: string }
        Returns: {
          account_id: string
          account_is_savings: boolean
          amount: number
          category_id: string | null
          category_is_savings: boolean
          created_at: string | null
          date: string
          debt_id: string | null
          id: string
          note: string | null
          pay_period_id: string | null
          recurring_bill_id: string | null
          transfer_id: string | null
          type: string
          user_id: string
          wish_list_item_id: string | null
          wish_quantity: number | null
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pay_debt: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id: string
          p_date: string
          p_debt_id: string
          p_note: string
          p_pay_period_id: string
        }
        Returns: {
          counterparty: string
          created_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          pay_from_account_id: string | null
          remaining_amount: number
          status: string
          total_amount: number
          type: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "debts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      period_for_date: { Args: { p_date: string }; Returns: string }
      period_summaries: {
        Args: { p_period_ids: string[] }
        Returns: {
          expense: number
          income: number
          pay_period_id: string
          savings: number
        }[]
      }
      replace_transaction: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id: string
          p_date: string
          p_id: string
          p_note: string
          p_pay_period_id: string
          p_type: string
        }
        Returns: {
          account_id: string
          account_is_savings: boolean
          amount: number
          category_id: string | null
          category_is_savings: boolean
          created_at: string | null
          date: string
          debt_id: string | null
          id: string
          note: string | null
          pay_period_id: string | null
          recurring_bill_id: string | null
          transfer_id: string | null
          type: string
          user_id: string
          wish_list_item_id: string | null
          wish_quantity: number | null
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_push_subscription: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      transaction_effect: {
        Args: { p_amount: number; p_type: string }
        Returns: number
      }
      transfer_balance: {
        Args: {
          p_amount: number
          p_date?: string
          p_from_id: string
          p_to_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
