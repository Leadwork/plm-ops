-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Workspaces
create table workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

-- Workspace members
create table workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  workspace_id uuid references workspaces(id) on delete set null
);

-- CRM: Accounts
create table accounts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  website text,
  industry text,
  size text,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- CRM: Contacts
create table contacts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  account_id uuid references accounts(id) on delete set null,
  status text not null default 'lead' check (status in ('lead', 'prospect', 'customer', 'churned')),
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Activities
create table activities (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type text not null check (type in ('call', 'email', 'meeting', 'note', 'task')),
  subject text not null,
  notes text,
  contact_id uuid references contacts(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  deal_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz default now()
);

-- Pipelines
create table pipelines (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  is_default boolean default false
);

-- Pipeline stages
create table stages (
  id uuid primary key default uuid_generate_v4(),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  probability integer not null default 0 check (probability >= 0 and probability <= 100)
);

-- Deals
create table deals (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  stage_id uuid not null references stages(id) on delete restrict,
  title text not null,
  value numeric(12, 2),
  contact_id uuid references contacts(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  close_date date,
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  created_at timestamptz default now()
);

-- Add FK for activities.deal_id after deals table exists
alter table activities add constraint activities_deal_id_fkey
  foreign key (deal_id) references deals(id) on delete set null;

-- Projects
create table projects (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'on_hold', 'completed')),
  owner_id uuid references auth.users(id) on delete set null,
  due_date date,
  created_at timestamptz default now()
);

-- Task lists (sections within a project)
create table task_lists (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  position integer not null default 0
);

-- Tasks
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  task_list_id uuid references task_lists(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assignee_id uuid references auth.users(id) on delete set null,
  due_date date,
  created_at timestamptz default now()
);

-- Task comments
create table task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- ────────────────────────────────────────────────
-- Row Level Security (RLS)
-- ────────────────────────────────────────────────

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table profiles enable row level security;
alter table accounts enable row level security;
alter table contacts enable row level security;
alter table activities enable row level security;
alter table pipelines enable row level security;
alter table stages enable row level security;
alter table deals enable row level security;
alter table projects enable row level security;
alter table task_lists enable row level security;
alter table tasks enable row level security;
alter table task_comments enable row level security;

-- Helper: is_workspace_member(workspace_id)
create or replace function is_workspace_member(ws_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  )
$$;

-- Workspaces: members can read, admins can update
create policy "workspace_members_read" on workspaces for select using (is_workspace_member(id));
create policy "workspace_admin_update" on workspaces for update using (
  exists (select 1 from workspace_members where workspace_id = id and user_id = auth.uid() and role = 'admin')
);

-- Workspace members: members can read their own workspace
create policy "workspace_members_read" on workspace_members for select using (is_workspace_member(workspace_id));
create policy "workspace_members_insert" on workspace_members for insert with check (true); -- controlled by API
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_upsert" on profiles for insert with check (id = auth.uid());
create policy "profiles_update" on profiles for update using (id = auth.uid());

-- CRM tables — workspace members can do everything
create policy "accounts_all" on accounts for all using (is_workspace_member(workspace_id));
create policy "contacts_all" on contacts for all using (is_workspace_member(workspace_id));
create policy "activities_all" on activities for all using (is_workspace_member(workspace_id));
create policy "pipelines_all" on pipelines for all using (is_workspace_member(workspace_id));

-- Stages: members can read/write if they belong to the pipeline's workspace
create policy "stages_all" on stages for all using (
  exists (select 1 from pipelines p where p.id = pipeline_id and is_workspace_member(p.workspace_id))
);

create policy "deals_all" on deals for all using (is_workspace_member(workspace_id));
create policy "projects_all" on projects for all using (is_workspace_member(workspace_id));

create policy "task_lists_all" on task_lists for all using (
  exists (select 1 from projects p where p.id = project_id and is_workspace_member(p.workspace_id))
);

create policy "tasks_all" on tasks for all using (is_workspace_member(workspace_id));

create policy "task_comments_all" on task_comments for all using (
  exists (select 1 from tasks t where t.id = task_id and is_workspace_member(t.workspace_id))
);
