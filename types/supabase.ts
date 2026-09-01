// Auto-generated from the connected Supabase schema. Do not edit by hand.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      metrics: {
        Row: {
          id: string
          name: string
          value: number
          unit: string | null
          category: string | null
          recorded_at: string
        }
      }
      time_series_data: {
        Row: {
          id: string
          series_name: string
          value: number
          granularity: string | null
          recorded_at: string
        }
      }
      comparison_data: {
        Row: {
          id: string
          category: string
          label: string
          value: number
          period: string | null
          recorded_at: string
        }
      }
      notifications: {
        Row: {
          id: string
          title: string
          body: string | null
          read: boolean
          severity: string | null
          created_at: string
        }
      }
      settings: {
        Row: {
          id: string
          user_id: string
          theme: string | null
          default_date_range: string | null
          visible_kpis: Json | null
          updated_at: string
        }
      }
    }
  }
}