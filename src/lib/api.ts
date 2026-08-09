import type {
  Account,
  AccountStore,
  ApiEnvelope,
  AuditLog,
  AuthResponse,
  Journal,
  JournalLine,
  JournalLineStore,
  JournalStore,
  JournalTag,
  Paginated,
  Tag,
} from './types'

export const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8000/api/v1'
const TOKEN_KEY = 'ledgify.token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

const unauthorizedHandlers = new Set<() => void>()

export function onUnauthorized(handler: () => void): () => void {
  unauthorizedHandlers.add(handler)
  return () => {
    unauthorizedHandlers.delete(handler)
  }
}

function notifyUnauthorized() {
  clearToken()
  unauthorizedHandlers.forEach((handler) => handler())
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
  register: (payload: {
    name: string
    email: string
    password: string
    password_confirmation?: string
  }) => post<AuthResponse>('/register', payload),
  login: (payload: { email: string; password: string; device_name?: string }) =>
    post<AuthResponse>('/login', payload),
  logout: () => post<{ message: string }>('/logout'),

  // Accounts
  listAccounts: (params: { page?: number; per_page?: number } = {}) =>
    get<Paginated<Account>>(`/accounts${toQuery(params)}`),
  getAccount: (id: string) => get<ApiEnvelope<Account>>(`/accounts/${id}`),
  createAccount: (payload: AccountStore) =>
    post<ApiEnvelope<Account>>('/accounts', payload),
  updateAccount: (id: string, payload: AccountStore) =>
    put<ApiEnvelope<Account>>(`/accounts/${id}`, payload),
  deleteAccount: (id: string) => del(`/accounts/${id}`),

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
  ) => get<Paginated<Journal>>(`/journals${toQuery(params)}`),
  getJournal: (id: string) => get<ApiEnvelope<Journal>>(`/journals/${id}`),
  createJournal: (payload: JournalStore) =>
    post<ApiEnvelope<Journal>>('/journals', payload),
  updateJournal: (id: string, payload: JournalStore) =>
    put<ApiEnvelope<Journal>>(`/journals/${id}`, payload),
  deleteJournal: (id: string) => del(`/journals/${id}`),
  reverseJournal: (id: string) =>
    post<ApiEnvelope<Journal>>(`/journals/${id}/reverse`),

  // Journal lines
  listJournalLines: (params: { page?: number; per_page?: number } = {}) =>
    get<Paginated<JournalLine>>(`/journal-lines${toQuery(params)}`),
  createJournalLine: (payload: JournalLineStore) =>
    post<ApiEnvelope<JournalLine>>('/journal-lines', payload),
  updateJournalLine: (id: string, payload: JournalLineStore) =>
    put<ApiEnvelope<JournalLine>>(`/journal-lines/${id}`, payload),
  deleteJournalLine: (id: string) => del(`/journal-lines/${id}`),

  // Journal tags
  attachJournalTag: (journal_id: string, tag_id: string) =>
    post<ApiEnvelope<JournalTag>>('/journal-tags', { journal_id, tag_id }),

  // Tags
  listTags: (params: { page?: number; per_page?: number } = {}) =>
    get<Paginated<Tag>>(`/tags${toQuery(params)}`),
  createTag: (payload: { name: string; type: Tag['type'] }) =>
    post<ApiEnvelope<Tag>>('/tags', payload),
  updateTag: (id: string, payload: { name: string; type: Tag['type'] }) =>
    put<ApiEnvelope<Tag>>(`/tags/${id}`, payload),
  deleteTag: (id: string) => del(`/tags/${id}`),

  // Audit logs
  listAuditLogs: (params: { page?: number; per_page?: number } = {}) =>
    get<Paginated<AuditLog>>(`/audit-logs${toQuery(params)}`),
  getAuditLog: (id: string) => get<ApiEnvelope<AuditLog>>(`/audit-logs/${id}`),
}
