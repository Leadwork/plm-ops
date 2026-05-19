import { db } from './index'
import { workspaceMembers, contacts, companies, deals, tasks, activities, stages, pipelines, projects, taskLists, users, workspaces } from './schema'
import { eq, lt, desc, asc, and, sql } from 'drizzle-orm'

export async function getWorkspaceId(userId: string) {
  const [m] = await db.select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers).where(eq(workspaceMembers.userId, userId)).limit(1)
  return m?.workspaceId ?? null
}

export async function getDashboardStats(workspaceId: string, userId: string) {
  const [contactCount, companyCount, openDeals, overdueTasks, recentActivities] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(contacts).where(eq(contacts.workspaceId, workspaceId)),
    db.select({ count: sql<number>`count(*)` }).from(companies).where(eq(companies.workspaceId, workspaceId)),
    db.select({ value: deals.value }).from(deals)
      .where(and(eq(deals.workspaceId, workspaceId), eq(deals.status, 'open'))),
    db.select({ count: sql<number>`count(*)` }).from(tasks)
      .where(and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.status, 'todo'),
        lt(tasks.dueDate, sql`current_date`)
      )),
    db.select().from(activities)
      .where(eq(activities.workspaceId, workspaceId))
      .orderBy(desc(activities.occurredAt)).limit(8),
  ])

  return {
    contacts: Number(contactCount[0]?.count ?? 0),
    companies: Number(companyCount[0]?.count ?? 0),
    openDeals: openDeals.length,
    pipelineValue: openDeals.reduce((s, d) => s + Number(d.value ?? 0), 0),
    overdueTasks: Number(overdueTasks[0]?.count ?? 0),
    recentActivities,
  }
}

export async function getContacts(workspaceId: string) {
  return db.select({
    id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName,
    email: contacts.email, phone: contacts.phone, status: contacts.status,
    createdAt: contacts.createdAt, accountId: contacts.accountId,
    companyName: companies.name,
  })
    .from(contacts)
    .leftJoin(companies, eq(contacts.accountId, companies.id))
    .where(eq(contacts.workspaceId, workspaceId))
    .orderBy(desc(contacts.createdAt))
}

export async function getContact(id: string) {
  const [c] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1)
  return c ?? null
}

export async function getContactActivities(contactId: string) {
  return db.select().from(activities).where(eq(activities.contactId, contactId))
    .orderBy(desc(activities.occurredAt)).limit(20)
}

export async function getContactDeals(contactId: string) {
  return db.select({ id: deals.id, title: deals.title, value: deals.value, status: deals.status })
    .from(deals).where(eq(deals.contactId, contactId)).orderBy(desc(deals.createdAt))
}

export async function getCompanies(workspaceId: string) {
  return db.select().from(companies).where(eq(companies.workspaceId, workspaceId)).orderBy(asc(companies.name))
}

export async function getCompany(id: string) {
  const [c] = await db.select().from(companies).where(eq(companies.id, id)).limit(1)
  return c ?? null
}

export async function getCompanyContacts(companyId: string) {
  return db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, status: contacts.status })
    .from(contacts).where(eq(contacts.accountId, companyId)).orderBy(asc(contacts.firstName))
}

export async function getCompanyDeals(companyId: string) {
  return db.select({ id: deals.id, title: deals.title, value: deals.value, status: deals.status })
    .from(deals).where(eq(deals.companyId, companyId)).orderBy(desc(deals.createdAt))
}

export async function getPipelineData(workspaceId: string) {
  const [pipeline] = await db.select().from(pipelines)
    .where(and(eq(pipelines.workspaceId, workspaceId), eq(pipelines.isDefault, true))).limit(1)
  if (!pipeline) return null

  const [allStages, allDeals, allContacts, allCompanies] = await Promise.all([
    db.select().from(stages).where(eq(stages.pipelineId, pipeline.id)).orderBy(asc(stages.position)),
    db.select({
      id: deals.id, title: deals.title, value: deals.value, status: deals.status,
      stageId: deals.stageId, closeDate: deals.closeDate,
      contactFirstName: contacts.firstName, contactLastName: contacts.lastName,
      companyName: companies.name,
    })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .where(and(eq(deals.workspaceId, workspaceId), eq(deals.status, 'open'))),
    db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
      .from(contacts).where(eq(contacts.workspaceId, workspaceId)).orderBy(asc(contacts.firstName)),
    db.select({ id: companies.id, name: companies.name })
      .from(companies).where(eq(companies.workspaceId, workspaceId)).orderBy(asc(companies.name)),
  ])

  return { pipeline, stages: allStages, deals: allDeals, contacts: allContacts, companies: allCompanies }
}

export async function getProjects(workspaceId: string) {
  return db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).orderBy(desc(projects.createdAt))
}

export async function getProject(id: string) {
  const [p] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  return p ?? null
}

export async function getProjectData(projectId: string, workspaceId: string) {
  const [allTaskLists, allTasks, members] = await Promise.all([
    db.select().from(taskLists).where(eq(taskLists.projectId, projectId)).orderBy(asc(taskLists.position)),
    db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.createdAt)),
    db.select({ userId: workspaceMembers.userId, name: users.name })
      .from(workspaceMembers)
      .leftJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId)),
  ])
  return { taskLists: allTaskLists, tasks: allTasks, members }
}

export async function getMyTasks(workspaceId: string, userId: string) {
  return db.select({
    id: tasks.id, title: tasks.title, description: tasks.description,
    status: tasks.status, priority: tasks.priority, dueDate: tasks.dueDate,
    projectId: tasks.projectId, createdAt: tasks.createdAt,
    projectName: projects.name,
  })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(
      eq(tasks.workspaceId, workspaceId),
      eq(tasks.assigneeId, userId),
      sql`${tasks.status} != 'done'`
    ))
    .orderBy(asc(tasks.dueDate))
}

export async function getWorkspaceMembers(workspaceId: string) {
  return db.select({ userId: workspaceMembers.userId, role: workspaceMembers.role, name: users.name })
    .from(workspaceMembers)
    .leftJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
}

export async function getWorkspace(workspaceId: string) {
  const [w] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  return w ?? null
}
