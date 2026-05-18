export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: { id: string; name: string; slug: string; created_at: string }
        Insert: { id?: string; name: string; slug: string; created_at?: string }
        Update: { id?: string; name?: string; slug?: string; created_at?: string }
        Relationships: []
      }
      workspace_members: {
        Row: { id: string; workspace_id: string; user_id: string; role: 'admin' | 'member'; created_at: string }
        Insert: { id?: string; workspace_id: string; user_id: string; role?: 'admin' | 'member'; created_at?: string }
        Update: { id?: string; workspace_id?: string; user_id?: string; role?: 'admin' | 'member' }
        Relationships: []
      }
      profiles: {
        Row: { id: string; full_name: string | null; avatar_url: string | null; workspace_id: string | null }
        Insert: { id: string; full_name?: string | null; avatar_url?: string | null; workspace_id?: string | null }
        Update: { full_name?: string | null; avatar_url?: string | null; workspace_id?: string | null }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string; workspace_id: string; first_name: string; last_name: string
          email: string | null; phone: string | null; account_id: string | null
          status: string; owner_id: string | null; created_at: string
        }
        Insert: {
          id?: string; workspace_id: string; first_name: string; last_name: string
          email?: string | null; phone?: string | null; account_id?: string | null
          status?: string; owner_id?: string | null; created_at?: string
        }
        Update: {
          first_name?: string; last_name?: string; email?: string | null
          phone?: string | null; account_id?: string | null; status?: string; owner_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          id: string; workspace_id: string; name: string; website: string | null
          industry: string | null; size: string | null; owner_id: string | null; created_at: string
        }
        Insert: {
          id?: string; workspace_id: string; name: string; website?: string | null
          industry?: string | null; size?: string | null; owner_id?: string | null; created_at?: string
        }
        Update: {
          name?: string; website?: string | null; industry?: string | null
          size?: string | null; owner_id?: string | null; workspace_id?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          id: string; workspace_id: string; type: string; subject: string
          notes: string | null; contact_id: string | null; account_id: string | null
          deal_id: string | null; user_id: string; occurred_at: string
        }
        Insert: {
          id?: string; workspace_id: string; type: string; subject: string
          notes?: string | null; contact_id?: string | null; account_id?: string | null
          deal_id?: string | null; user_id: string; occurred_at?: string
        }
        Update: { type?: string; subject?: string; notes?: string | null }
        Relationships: []
      }
      pipelines: {
        Row: { id: string; workspace_id: string; name: string; is_default: boolean }
        Insert: { id?: string; workspace_id: string; name: string; is_default?: boolean }
        Update: { name?: string; is_default?: boolean }
        Relationships: []
      }
      stages: {
        Row: { id: string; pipeline_id: string; name: string; position: number; probability: number }
        Insert: { id?: string; pipeline_id: string; name: string; position: number; probability?: number }
        Update: { name?: string; position?: number; probability?: number }
        Relationships: []
      }
      deals: {
        Row: {
          id: string; workspace_id: string; pipeline_id: string; stage_id: string
          title: string; value: number | null; contact_id: string | null
          account_id: string | null; owner_id: string | null
          close_date: string | null; status: 'open' | 'won' | 'lost'; created_at: string
        }
        Insert: {
          id?: string; workspace_id: string; pipeline_id: string; stage_id: string
          title: string; value?: number | null; contact_id?: string | null
          account_id?: string | null; owner_id?: string | null
          close_date?: string | null; status?: 'open' | 'won' | 'lost'; created_at?: string
        }
        Update: {
          stage_id?: string; title?: string; value?: number | null
          contact_id?: string | null; account_id?: string | null
          owner_id?: string | null; close_date?: string | null; status?: 'open' | 'won' | 'lost'
          workspace_id?: string; pipeline_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string; workspace_id: string; name: string; description: string | null
          status: 'active' | 'on_hold' | 'completed'; owner_id: string | null
          due_date: string | null; created_at: string
        }
        Insert: {
          id?: string; workspace_id: string; name: string; description?: string | null
          status?: 'active' | 'on_hold' | 'completed'; owner_id?: string | null
          due_date?: string | null; created_at?: string
        }
        Update: {
          name?: string; description?: string | null; workspace_id?: string
          status?: 'active' | 'on_hold' | 'completed'; due_date?: string | null
        }
        Relationships: []
      }
      task_lists: {
        Row: { id: string; project_id: string; name: string; position: number }
        Insert: { id?: string; project_id: string; name: string; position: number }
        Update: { name?: string; position?: number }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string; workspace_id: string; project_id: string | null
          task_list_id: string | null; title: string; description: string | null
          status: 'todo' | 'in_progress' | 'done'; priority: 'low' | 'medium' | 'high'
          assignee_id: string | null; due_date: string | null; created_at: string
        }
        Insert: {
          id?: string; workspace_id: string; project_id?: string | null
          task_list_id?: string | null; title: string; description?: string | null
          status?: 'todo' | 'in_progress' | 'done'; priority?: 'low' | 'medium' | 'high'
          assignee_id?: string | null; due_date?: string | null; created_at?: string
        }
        Update: {
          title?: string; description?: string | null; workspace_id?: string
          status?: 'todo' | 'in_progress' | 'done'; priority?: 'low' | 'medium' | 'high'
          assignee_id?: string | null; due_date?: string | null; task_list_id?: string | null
        }
        Relationships: []
      }
      task_comments: {
        Row: { id: string; task_id: string; user_id: string; content: string; created_at: string }
        Insert: { id?: string; task_id: string; user_id: string; content: string; created_at?: string }
        Update: { content?: string }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

// Convenience aliases
export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']
export type Account = Database['public']['Tables']['accounts']['Row']
export type Activity = Database['public']['Tables']['activities']['Row']
export type Pipeline = Database['public']['Tables']['pipelines']['Row']
export type Stage = Database['public']['Tables']['stages']['Row']
export type Deal = Database['public']['Tables']['deals']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type TaskList = Database['public']['Tables']['task_lists']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskComment = Database['public']['Tables']['task_comments']['Row']
