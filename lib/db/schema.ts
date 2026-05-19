import {
  pgTable, uuid, text, boolean, integer, numeric, date,
  timestamp, check, unique, primaryKey,
} from 'drizzle-orm/pg-core'
import type { AdapterAccountType } from 'next-auth/adapters'

// ── Auth.js required tables ─────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  password: text('password'),
})

export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<AdapterAccountType>().notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, t => [primaryKey({ columns: [t.provider, t.providerAccountId] })])

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, t => [primaryKey({ columns: [t.identifier, t.token] })])

// ── App tables ───────────────────────────────────────────────────────────────

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  createdAt: timestamp('created_at').defaultNow(),
}, t => [unique().on(t.workspaceId, t.userId)])

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  accountId: uuid('account_id'),
  status: text('status').notNull().default('lead'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
})

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  website: text('website'),
  industry: text('industry'),
  size: text('size'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
})

export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  subject: text('subject').notNull(),
  notes: text('notes'),
  contactId: uuid('contact_id'),
  companyId: uuid('company_id'),
  dealId: uuid('deal_id'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  occurredAt: timestamp('occurred_at').defaultNow(),
})

export const pipelines = pgTable('pipelines', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isDefault: boolean('is_default').default(false),
})

export const stages = pgTable('stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  pipelineId: uuid('pipeline_id').notNull().references(() => pipelines.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  probability: integer('probability').notNull().default(0),
})

export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  pipelineId: uuid('pipeline_id').notNull().references(() => pipelines.id, { onDelete: 'cascade' }),
  stageId: uuid('stage_id').notNull().references(() => stages.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  value: numeric('value', { precision: 12, scale: 2 }),
  contactId: uuid('contact_id'),
  companyId: uuid('company_id'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  closeDate: date('close_date'),
  status: text('status').notNull().default('open'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  dueDate: date('due_date'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const taskLists = pgTable('task_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
})

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  taskListId: uuid('task_list_id').references(() => taskLists.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'),
  priority: text('priority').notNull().default('medium'),
  assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  dueDate: date('due_date'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const taskComments = pgTable('task_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// ── Inferred types ───────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect
export type Workspace = typeof workspaces.$inferSelect
export type WorkspaceMember = typeof workspaceMembers.$inferSelect
export type Contact = typeof contacts.$inferSelect
export type Company = typeof companies.$inferSelect
export type Activity = typeof activities.$inferSelect
export type Pipeline = typeof pipelines.$inferSelect
export type Stage = typeof stages.$inferSelect
export type Deal = typeof deals.$inferSelect
export type Project = typeof projects.$inferSelect
export type TaskList = typeof taskLists.$inferSelect
export type Task = typeof tasks.$inferSelect
export type TaskComment = typeof taskComments.$inferSelect
