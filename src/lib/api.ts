import type {
  Account,
  AccountAllocations,
  AccountAnalytics,
  AccountStore,
  Allocation,
  AllocationAdjust,
  AllocationStore,
  AllocationUpdate,
  ApiEnvelope,
  AuditLog,
  AuthResponse,
  Budget,
  BudgetStore,
  BudgetUpdate,
  Journal,
  JournalDraft,
  JournalLine,
  JournalLineStore,
  JournalStore,
  JournalTag,
  JournalTemplate,
  JournalTemplateGenerate,
  JournalTemplateStore,
  Overview,
  Paginated,
  RegisterPayload,
  Tag,
  Tenant,
  User,
  UserAdminStore,
  UserStatus,
} from './types'

export const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8000/api/v1'
const TOKEN_KEY = 'ledgify.token'
const TENANT_KEY = 'ledgify.tenant'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export const getTenant = (): Tenant | null => {
  try {
    const raw = localStorage.getItem(TENANT_KEY)
    return raw ? (JSON.parse(raw) as Tenant) : null
  } catch {
    return null
  }
}
export const setTenant = (tenant: Tenant) =>
  localStorage.setItem(TENANT_KEY, JSON.stringify(tenant))
export const clearTenant = () => localStorage.removeItem(TENANT_KEY)

const unauthorizedHandlers = new Set<() => void>()
const connectionLostHandlers = new Set<() => void>()
const tenantNotFoundHandlers = new Set<() => void>()
const forbiddenHandlers = new Set<() => void>()

export function onUnauthorized(handler: () => void): () => void {
  unauthorizedHandlers.add(handler)
  return () => {
    unauthorizedHandlers.delete(handler)
  }
}

export function onConnectionLost(handler: () => void): () => void {
  connectionLostHandlers.add(handler)
  return () => {
    connectionLostHandlers.delete(handler)
  }
}

export function onTenantNotFound(handler: () => void): () => void {
  tenantNotFoundHandlers.add(handler)
  return () => {
    tenantNotFoundHandlers.delete(handler)
  }
}

export function onForbidden(handler: () => void): () => void {
  forbiddenHandlers.add(handler)
  return () => {
    forbiddenHandlers.delete(handler)
  }
}

function notifyUnauthorized() {
  clearToken()
  unauthorizedHandlers.forEach((handler) => handler())
}

function notifyConnectionLost() {
  connectionLostHandlers.forEach((handler) => handler())
}

function notifyTenantNotFound() {
  tenantNotFoundHandlers.forEach((handler) => handler())
}

function notifyForbidden() {
  forbiddenHandlers.forEach((handler) => handler())
}

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]> | null

  constructor(
    message: string,
    status: number,
    errors: Record<string, string[]> | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export function toQuery(
  params: Record<string, string | number | null | undefined>,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

function tenantPath(path: string): string {
  const tenant = getTenant()
  if (!tenant) throw new ApiError('No active tenant.', 0)
  return `/${tenant.slug}${path}`
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  } catch {
    notifyConnectionLost()
    throw new ApiError('Cannot reach the Ledgify API server.', 0)
  }

  if (res.status === 204) return undefined as T

  let body: any = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (!res.ok) {
    if (res.status === 401) {
      notifyUnauthorized()
    } else if (res.status === 403) {
      notifyForbidden()
    } else if (res.status === 404 && body?.message === 'Tenant not found.') {
      clearTenant()
      notifyTenantNotFound()
    }
    throw new ApiError(
      body?.message ?? `Request failed with status ${res.status}.`,
      res.status,
      body?.errors ?? null,
    )
  }

  return body as T
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
const put = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
const del = (path: string) => request<void>(path, { method: 'DELETE' })

export const api = {
  // Auth
  register: (payload: RegisterPayload) => post<AuthResponse>('/register', payload),
  login: (payload: { email: string; password: string; device_name?: string }) =>
    post<AuthResponse>('/login', payload),
  logout: () => post<{ message: string }>('/logout'),

  // Tenants
  listTenants: () => get<{ data: Tenant[] }>('/tenants').then((r) => r.data),
  createTenant: (payload: { name: string; slug?: string }) =>
    post<ApiEnvelope<Tenant>>('/tenants', payload).then((r) => r.data),

  // Platform admin (no tenant in the URL; requires is_admin)
  listAdminUsers: (
    params: {
      page?: number
      per_page?: number
      search?: string
      status?: UserStatus
    } = {},
  ) => get<RawList<User>>(`/admin/users${toQuery(params)}`).then(asList),
  createAdminUser: (payload: UserAdminStore) =>
    post<ApiEnvelope<User>>('/admin/users', payload),
  updateAdminUser: (id: string, payload: Partial<UserAdminStore>) =>
    put<ApiEnvelope<User>>(`/admin/users/${id}`, payload),

  // Accounts
  listAccounts: (
    params: {
      page?: number
      per_page?: number
      type?: string
      currency?: string
      status?: string
      search?: string
    } = {},
  ) => get<RawList<Account>>(tenantPath(`/accounts${toQuery(params)}`)).then(asList),
  getAccount: (id: string) => get<ApiEnvelope<Account>>(tenantPath(`/accounts/${id}`)),
  createAccount: (payload: AccountStore) =>
    post<ApiEnvelope<Account>>(tenantPath('/accounts'), payload),
  updateAccount: (id: string, payload: AccountStore) =>
    put<ApiEnvelope<Account>>(tenantPath(`/accounts/${id}`), payload),
  deleteAccount: (id: string) => del(tenantPath(`/accounts/${id}`)),
  getAccountAnalytics: (id: string) =>
    get<ApiEnvelope<AccountAnalytics>>(tenantPath(`/accounts/${id}/analytics`)).then((r) => r.data),
  listAccountJournalLines: (
    id: string,
    params: {
      page?: number
      per_page?: number
      status?: string
      from?: string
      to?: string
      search?: string
    } = {},
  ) => get<RawList<JournalLine>>(tenantPath(`/accounts/${id}/journal-lines${toQuery(params)}`)).then(asList),
  nextAccountCode: (type: string) =>
    get<ApiEnvelope<{ code: string }>>(tenantPath(`/accounts/next-code${toQuery({ type })}`)).then(
      (r) => r.data.code,
    ),

  // Budgets
  listBudgets: (
    params: {
      page?: number
      per_page?: number
      search?: string
      starts_at?: string
      ends_at?: string
      period?: 'today' | 'this_week' | 'this_month' | string
      period_type?: string
      is_recurring?: boolean
      budget_type?: 'income' | 'expense' | string
      tag_id?: string
      account_id?: string
    } = {},
  ) => get<RawList<Budget>>(tenantPath(`/budgets${toQuery(params as Record<string, string | number | null | undefined>)}`)).then(asList),
  getBudget: (id: string) => get<ApiEnvelope<Budget>>(tenantPath(`/budgets/${id}`)),
  createBudget: (payload: BudgetStore) =>
    post<ApiEnvelope<Budget>>(tenantPath('/budgets'), payload),
  updateBudget: (id: string, payload: BudgetUpdate) =>
    put<ApiEnvelope<Budget>>(tenantPath(`/budgets/${id}`), payload),
  deleteBudget: (id: string) => del(tenantPath(`/budgets/${id}`)),
  getOverview: (params: { period?: 'today' | 'this_week' | 'this_month' } = {}) =>
    get<ApiEnvelope<Overview>>(tenantPath(`/overview${toQuery(params as Record<string, string | number | null | undefined>)}`)).then((r) => r.data),

  // Journals
  listJournals: (
    params: {
      page?: number
      per_page?: number
      status?: string
      source?: string
      from?: string
      to?: string
    } = {},
  ) => get<RawList<Journal>>(tenantPath(`/journals${toQuery(params)}`)).then(asList),
  getJournal: (id: string) => get<ApiEnvelope<Journal>>(tenantPath(`/journals/${id}`)),
  createJournal: (payload: JournalStore) =>
    post<ApiEnvelope<Journal>>(tenantPath('/journals'), payload),
  updateJournal: (id: string, payload: JournalStore) =>
    put<ApiEnvelope<Journal>>(tenantPath(`/journals/${id}`), payload),
  deleteJournal: (id: string) => del(tenantPath(`/journals/${id}`)),
  reverseJournal: (id: string) =>
    post<ApiEnvelope<Journal>>(tenantPath(`/journals/${id}/reverse`)),
  aiDraftJournal: (statement: string) =>
    post<ApiEnvelope<JournalDraft>>(tenantPath('/journals/ai-draft'), { statement }).then(
      (r) => r.data,
    ),
  nextJournalReference: () =>
    get<ApiEnvelope<{ reference: string }>>(tenantPath('/journals/next-reference')).then(
      (r) => r.data.reference,
    ),

  // Journal templates
  listJournalTemplates: (
    params: {
      page?: number
      per_page?: number
      period_type?: string
      is_active?: boolean
      search?: string
    } = {},
  ) =>
    get<RawList<JournalTemplate>>(tenantPath(`/journal-templates${toQuery(params as Record<string, string | number | null | undefined>)}`)).then(asList),
  getJournalTemplate: (id: string) =>
    get<ApiEnvelope<JournalTemplate>>(tenantPath(`/journal-templates/${id}`)),
  createJournalTemplate: (payload: JournalTemplateStore) =>
    post<ApiEnvelope<JournalTemplate>>(tenantPath('/journal-templates'), payload),
  updateJournalTemplate: (id: string, payload: Partial<JournalTemplateStore>) =>
    put<ApiEnvelope<JournalTemplate>>(tenantPath(`/journal-templates/${id}`), payload),
  deleteJournalTemplate: (id: string) => del(tenantPath(`/journal-templates/${id}`)),
  generateJournalFromTemplate: (id: string, payload: JournalTemplateGenerate) =>
    post<ApiEnvelope<Journal>>(tenantPath(`/journal-templates/${id}/generate`), payload),

  // Journal lines
  listJournalLines: (
    params: {
      page?: number
      per_page?: number
      account_id?: string
      journal_id?: string
      status?: string
      from?: string
      to?: string
      search?: string
    } = {},
  ) => get<RawList<JournalLine>>(tenantPath(`/journal-lines${toQuery(params as Record<string, string | number | null | undefined>)}`)).then(asList),
  createJournalLine: (payload: JournalLineStore) =>
    post<ApiEnvelope<JournalLine>>(tenantPath('/journal-lines'), payload),
  updateJournalLine: (id: string, payload: JournalLineStore) =>
    put<ApiEnvelope<JournalLine>>(tenantPath(`/journal-lines/${id}`), payload),
  deleteJournalLine: (id: string) => del(tenantPath(`/journal-lines/${id}`)),

  // Journal tags
  attachJournalTag: (journal_id: string, tag_id: string) =>
    post<ApiEnvelope<JournalTag>>(tenantPath('/journal-tags'), { journal_id, tag_id }),

  // Tags
  listTags: (params: { page?: number; per_page?: number } = {}) =>
    get<RawList<Tag>>(tenantPath(`/tags${toQuery(params)}`)).then(asList),
  createTag: (payload: { name: string; type: Tag['type'] }) =>
    post<ApiEnvelope<Tag>>(tenantPath('/tags'), payload),
  updateTag: (id: string, payload: { name: string; type: Tag['type'] }) =>
    put<ApiEnvelope<Tag>>(tenantPath(`/tags/${id}`), payload),
  deleteTag: (id: string) => del(tenantPath(`/tags/${id}`)),

  // Allocations
  listAllocations: (
    params: {
      page?: number
      per_page?: number
      search?: string
    } = {},
  ) => get<RawList<Allocation>>(tenantPath(`/allocations${toQuery(params)}`)).then(asList),
  getAllocation: (id: string) => get<ApiEnvelope<Allocation>>(tenantPath(`/allocations/${id}`)),
  createAllocation: (payload: AllocationStore) =>
    post<ApiEnvelope<Allocation>>(tenantPath('/allocations'), payload),
  updateAllocation: (id: string, payload: AllocationUpdate) =>
    put<ApiEnvelope<Allocation>>(tenantPath(`/allocations/${id}`), payload),
  deleteAllocation: (id: string) => del(tenantPath(`/allocations/${id}`)),
  allocateOnAllocation: (id: string, payload: AllocationAdjust) =>
    post<ApiEnvelope<Allocation>>(tenantPath(`/allocations/${id}/allocate`), payload),
  releaseOnAllocation: (id: string, payload: AllocationAdjust) =>
    post<ApiEnvelope<Allocation>>(tenantPath(`/allocations/${id}/release`), payload),
  getAccountAllocations: (accountId: string) =>
    get<ApiEnvelope<AccountAllocations>>(tenantPath(`/accounts/${accountId}/allocations`)).then(
      (r) => r.data,
    ),

  // Audit logs
  listAuditLogs: (params: { page?: number; per_page?: number } = {}) =>
    get<RawList<AuditLog>>(tenantPath(`/audit-logs${toQuery(params)}`)).then(asList),
  getAuditLog: (id: string) => get<ApiEnvelope<AuditLog>>(tenantPath(`/audit-logs/${id}`)),
}

type RawList<T> = {
  data?: T[]
  meta?: {
    current_page?: number
    last_page?: number
    total?: number
    total_amount?: string
    summary?: import('./types').BudgetSummary
  }
  current_page?: number
  last_page?: number
  total?: number
}

function asList<T>(raw: RawList<T>): Paginated<T> {
  const meta = raw.meta ?? {}
  return {
    data: raw.data ?? [],
    current_page: meta.current_page ?? raw.current_page ?? 1,
    last_page: meta.last_page ?? raw.last_page ?? 1,
    total: meta.total ?? raw.total ?? raw.data?.length ?? 0,
    total_amount: meta.total_amount,
    summary: meta.summary,
  }
}
