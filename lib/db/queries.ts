import { db } from './index'
import { workspaceMembers, contacts, companies, deals, tasks, activities, stages, pipelines, projects, taskLists, taskComments, users, workspaces } from './schema'
import { eq, lt, desc, asc, and, sql, gte, ilike, or } from 'drizzle-orm'

export async function getAnalytics(workspaceId: string) {
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
  twelveMonthsAgo.setDate(1)
  twelveMonthsAgo.setHours(0, 0, 0, 0)

  const [
    dealsByStage,
    wonLostByMonth,
    contactsByMonth,
    activitiesByType,
    taskStats,
    topDeals,
  ] = await Promise.all([
    // Pipeline funnel: deals by stage with value
    db.select({
      stageId: deals.stageId,
      stageName: stages.name,
      stagePosition: stages.position,
      probability: stages.probability,
      count: sql<number>`count(*)`,
      value: sql<number>`coalesce(sum(${deals.value}::numeric), 0)`,
    })
      .from(deals)
      .leftJoin(stages, eq(deals.stageId, stages.id))
      .where(and(eq(deals.workspaceId, workspaceId), eq(deals.status, 'open')))
      .groupBy(deals.stageId, stages.name, stages.position, stages.probability)
      .orderBy(asc(stages.position)),

    // Won/Lost by month (last 12 months)
    db.select({
      month: sql<string>`to_char(${deals.createdAt}, 'YYYY-MM')`,
      status: deals.status,
      count: sql<number>`count(*)`,
      value: sql<number>`coalesce(sum(${deals.value}::numeric), 0)`,
    })
      .from(deals)
      .where(and(
        eq(deals.workspaceId, workspaceId),
        sql`${deals.status} in ('won','lost')`,
        gte(deals.createdAt, twelveMonthsAgo),
      ))
      .groupBy(sql`to_char(${deals.createdAt}, 'YYYY-MM')`, deals.status)
      .orderBy(sql`to_char(${deals.createdAt}, 'YYYY-MM')`),

    // New contacts by month (last 12 months)
    db.select({
      month: sql<string>`to_char(${contacts.createdAt}, 'YYYY-MM')`,
      count: sql<number>`count(*)`,
    })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, workspaceId), gte(contacts.createdAt, twelveMonthsAgo)))
      .groupBy(sql`to_char(${contacts.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${contacts.createdAt}, 'YYYY-MM')`),

    // Activities by type
    db.select({
      type: activities.type,
      count: sql<number>`count(*)`,
    })
      .from(activities)
      .where(eq(activities.workspaceId, workspaceId))
      .groupBy(activities.type)
      .orderBy(desc(sql`count(*)`)),

    // Task completion stats
    db.select({
      status: tasks.status,
      count: sql<number>`count(*)`,
    })
      .from(tasks)
      .where(eq(tasks.workspaceId, workspaceId))
      .groupBy(tasks.status),

    // Top open deals by value
    db.select({
      id: deals.id, title: deals.title, value: deals.value,
      stageName: stages.name,
      contactFirstName: contacts.firstName, contactLastName: contacts.lastName,
    })
      .from(deals)
      .leftJoin(stages, eq(deals.stageId, stages.id))
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .where(and(eq(deals.workspaceId, workspaceId), eq(deals.status, 'open')))
      .orderBy(desc(deals.value))
      .limit(5),
  ])

  // Weighted pipeline value
  const weightedValue = dealsByStage.reduce((sum, s) =>
    sum + (Number(s.value) * (s.probability ?? 0)) / 100, 0)

  // Win rate
  const wonCount = wonLostByMonth.filter(r => r.status === 'won').reduce((s, r) => s + Number(r.count), 0)
  const lostCount = wonLostByMonth.filter(r => r.status === 'lost').reduce((s, r) => s + Number(r.count), 0)
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0

  return { dealsByStage, wonLostByMonth, contactsByMonth, activitiesByType, taskStats, topDeals, weightedValue, winRate, wonCount, lostCount }
}

export async function getCalendarData(workspaceId: string, year: number, month: number) {
  const startStr = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const [calTasks, calDeals] = await Promise.all([
    db.select({
      id: tasks.id, title: tasks.title, dueDate: tasks.dueDate,
      status: tasks.status, priority: tasks.priority,
      projectId: tasks.projectId, projectName: projects.name,
    })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(
        eq(tasks.workspaceId, workspaceId),
        gte(tasks.dueDate, startStr),
        sql`${tasks.dueDate} <= ${endStr}`,
      )),
    db.select({
      id: deals.id, title: deals.title, value: deals.value,
      closeDate: deals.closeDate, status: deals.status,
      contactFirstName: contacts.firstName, contactLastName: contacts.lastName,
    })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .where(and(
        eq(deals.workspaceId, workspaceId),
        gte(deals.closeDate, startStr),
        sql`${deals.closeDate} <= ${endStr}`,
      )),
  ])

  return { tasks: calTasks, deals: calDeals }
}

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
    linkedinUrl: contacts.linkedinUrl, companyName: companies.name,
    // Lead score: status(0-40) + email(5) + phone(5) + deals(0-30) + activities(0-20)
    score: sql<number>`
      (case ${contacts.status}
        when 'customer' then 40 when 'prospect' then 25 when 'lead' then 10 else 0
       end)
      + (case when ${contacts.email} is not null then 5 else 0 end)
      + (case when ${contacts.phone} is not null then 5 else 0 end)
      + least(
          (select count(*) from ${deals} d where d.contact_id = ${contacts.id}) * 10,
          30
        )
      + least(
          (select count(*) from ${activities} a where a.contact_id = ${contacts.id}) * 10,
          20
        )
    `,
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

export async function getCompanyActivities(companyId: string) {
  return db.select().from(activities).where(eq(activities.companyId, companyId))
    .orderBy(desc(activities.occurredAt)).limit(20)
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
      .where(eq(deals.workspaceId, workspaceId)),
    db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
      .from(contacts).where(eq(contacts.workspaceId, workspaceId)).orderBy(asc(contacts.firstName)),
    db.select({ id: companies.id, name: companies.name })
      .from(companies).where(eq(companies.workspaceId, workspaceId)).orderBy(asc(companies.name)),
  ])

  return { pipeline, stages: allStages, deals: allDeals, contacts: allContacts, companies: allCompanies }
}

export async function getProjects(workspaceId: string) {
  const allProjects = await db.select().from(projects)
    .where(eq(projects.workspaceId, workspaceId)).orderBy(desc(projects.createdAt))

  if (!allProjects.length) return []

  const taskCounts = await db.select({
    projectId: tasks.projectId,
    total: sql<number>`count(*)`,
    done: sql<number>`count(*) filter (where ${tasks.status} = 'done')`,
  })
    .from(tasks)
    .where(sql`${tasks.projectId} = any(array[${sql.join(allProjects.map(p => sql`${p.id}::uuid`), sql`, `)}])`)
    .groupBy(tasks.projectId)

  const countMap = Object.fromEntries(taskCounts.map(c => [c.projectId, c]))

  return allProjects.map(p => ({
    ...p,
    totalTasks: Number(countMap[p.id]?.total ?? 0),
    doneTasks: Number(countMap[p.id]?.done ?? 0),
  }))
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

export async function getTaskComments(taskId: string) {
  return db.select({
    id: taskComments.id, content: taskComments.content, createdAt: taskComments.createdAt,
    userId: taskComments.userId, userName: users.name,
  })
    .from(taskComments)
    .leftJoin(users, eq(taskComments.userId, users.id))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt))
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

export async function globalSearch(workspaceId: string, query: string) {
  const q = `%${query}%`
  const [contactResults, dealResults, projectResults] = await Promise.all([
    db.select({
      id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName,
      email: contacts.email, status: contacts.status,
    })
      .from(contacts)
      .where(and(
        eq(contacts.workspaceId, workspaceId),
        or(
          ilike(contacts.firstName, q),
          ilike(contacts.lastName, q),
          ilike(contacts.email, q),
        )
      ))
      .limit(5),

    db.select({ id: deals.id, title: deals.title, value: deals.value, status: deals.status })
      .from(deals)
      .where(and(eq(deals.workspaceId, workspaceId), ilike(deals.title, q)))
      .limit(5),

    db.select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), ilike(projects.name, q)))
      .limit(5),
  ])

  return { contacts: contactResults, deals: dealResults, projects: projectResults }
}
