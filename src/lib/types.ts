export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'
export type AccountStatus = 'active' | 'inactive'
export type JournalStatus = 'draft' | 'posted' | 'archived'
export type JournalSource = 'manual' | 'imported' | 'system'
export type TagType = 'priority' | 'recurring' | 'vendor' | 'tax' | 'transfer'

export type User = {
  id: string
  name: string
  email: string
  email_verified_at: string | null
  created_at: string
  updated_at: string
}

export type Account = {
  id: string
  code: string
  name: string
  type: AccountType
  parent_id: string | null
  currency: string
  status: AccountStatus
  created_at: string
  updated_at: string
  parent?: Account | null
  children?: Account[]
}

export type AccountStore = {
  code: string
  name: string
  type: AccountType
  parent_id?: string | null
  currency: string
  status: AccountStatus
}

export type Tag = {
  id: string
  name: string
  type: TagType
  created_at: string
  updated_at: string
  journals?: Journal[]
}

export type JournalLine = {
  id: string
  journal_id: string
  account_id: string
  debit: string | null
  credit: string | null
  description: string | null
  created_at: string
  updated_at: string
  journal?: Journal | null
  account?: Account | null
}

export type JournalLineStore = {
  journal_id: string
  account_id: string
  debit?: number
  credit?: number
  description?: string
}

export type Journal = {
  id: string
  user_id: string
  transaction_date: string
  description: string
  reference: string
  status: JournalStatus
  source: JournalSource
  reverse_from_id: string | null
  created_at: string
  updated_at: string
  user?: User | null
  lines?: JournalLine[]
  tags?: Tag[]
}

export type JournalStoreLine = {
  account_id: string
  debit?: number
  credit?: number
  description?: string
}

export type JournalStore = {
  transaction_date: string
  description: string
  reference: string
  status: JournalStatus
  source: JournalSource
  reverse_from_id?: string | null
  lines: JournalStoreLine[]
  tags?: string[]
}

export type JournalTag = {
  journal_id: string
  tag_id: string
  created_at: string
  updated_at: string
  journal?: Journal | null
  tag?: Tag | null
}

export type AuditLog = {
  id: string
  user_id: string
  action: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  reason: string | null
  journal_id: string | null
  created_at: string
  updated_at: string
  user?: User | null
  journal?: Journal | null
}

export type PaginationLink = {
  url: string | null
  label: string
  active: boolean
}

export type Paginated<T> = {
  current_page: number
  data: T[]
  first_page_url: string
  from: number | null
  last_page: number
  last_page_url: string
  links: PaginationLink[]
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}

export type ApiEnvelope<T> = {
  data: T
}

export type AuthResponse = {
  user: User
  token: string
}
