export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'
export type AccountStatus = 'active' | 'inactive'
export type JournalStatus = 'draft' | 'posted' | 'archived'
export type JournalSource = 'manual' | 'imported' | 'system'
export type TagType = 'priority' | 'recurring' | 'vendor' | 'tax' | 'transfer'
export type TenantRole = 'owner' | 'member'
export type UserStatus = 'active' | 'suspended' | 'terminated'

export type Tenant = {
  id: string
  name: string
  slug: string
  role?: TenantRole
  created_at?: string
  updated_at?: string
}

export type User = {
  id: string
  name: string
  email: string
  email_verified_at: string | null
  is_admin?: boolean
  status?: UserStatus
  tenants?: Tenant[]
  created_at: string
  updated_at: string
}

export type UserAdminStore = {
  name: string
  email: string
  password?: string
  is_admin?: boolean
  status?: UserStatus
}

export type Account = {
  id: string
  code: string
  name: string
  type: AccountType
  is_header: boolean
  parent_id: string | null
  currency: string
  status: AccountStatus
  depth: number
  children_count: number
  total_debit?: string | null
  total_credit?: string | null
  net?: string | null
  balance?: string | null
  balance_side?: 'debit' | 'credit'
  created_at: string
  updated_at: string
  parent?: Account | null
  children?: Account[]
}

export type AccountStore = {
  code?: string
  name: string
  type: AccountType
  is_header?: boolean
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
  line_number?: number
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
  total_debit?: string | null
  total_credit?: string | null
  lines_count?: number
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

export type JournalAllocationAdjustment = {
  action: 'allocate' | 'release'
  allocation_id: string
  account_id: string
  amount: number
}

export type JournalStore = {
  transaction_date: string
  description: string
  reference?: string
  status: JournalStatus
  source: JournalSource
  reverse_from_id?: string | null
  lines: JournalStoreLine[]
  tags?: string[]
  allocation_adjustments?: JournalAllocationAdjustment[]
}

export type JournalTag = {
  journal_id: string
  tag_id: string
  created_at: string
  updated_at: string
  journal?: Journal | null
  tag?: Tag | null
}

export type JournalDraftLine = {
  account_name?: string
  account_type?: AccountType
  debit?: string | null
  credit?: string | null
  description?: string | null
}

export type JournalDraft = {
  transaction_date?: string | null
  description?: string | null
  lines?: JournalDraftLine[]
  tags?: string[]
}

export type JournalTemplatePeriod = 'daily' | 'weekly' | 'monthly'

export type JournalTemplate = {
  id: string
  name: string
  description: string | null
  period_type: JournalTemplatePeriod
  is_active: boolean
  day_of_week: number | null
  day_of_month: number | null
  next_run_at: string | null
  last_run_at: string | null
  created_at: string
  updated_at: string
  lines?: JournalTemplateLine[]
  tags?: Tag[]
  lines_count?: number
}

export type JournalTemplateLine = {
  id: string
  journal_template_id: string
  account_id: string
  line_number?: number
  debit: string | null
  credit: string | null
  description: string | null
  created_at: string
  updated_at: string
  account?: Account | null
}

export type JournalTemplateStoreLine = {
  account_id: string
  debit?: number
  credit?: number
  description?: string
}

export type JournalTemplateStore = {
  name: string
  description?: string | null
  period_type: JournalTemplatePeriod
  is_active?: boolean
  day_of_week?: number | null
  day_of_month?: number | null
  lines: JournalTemplateStoreLine[]
  tags?: string[]
}

export type JournalTemplateGenerate = {
  transaction_date?: string
  lines?: JournalTemplateStoreLine[]
}

export type Budget = {
  id: string
  name: string
  description: string | null
  amount: string
  budget_type: 'income' | 'expense' | null
  period_type: 'custom' | 'monthly'
  is_recurring: boolean
  starts_at: string
  ends_at: string
  created_at: string
  updated_at: string
  accounts?: Account[]
  tags?: Tag[]
}

export type BudgetStore = {
  name: string
  description?: string | null
  amount: number
  budget_type?: 'income' | 'expense' | null
  period_type?: 'custom' | 'monthly'
  is_recurring?: boolean
  budget_month?: string
  starts_at?: string
  ends_at?: string
  account_ids?: string[]
  tag_ids?: string[]
}

export type BudgetUpdate = Partial<BudgetStore>

export type AllocationStatus = 'active' | 'completed' | 'cancelled' | 'expired'

export type Allocation = {
  id: string
  name: string
  description: string | null
  target_amount: string | null
  status: AllocationStatus
  expires_at: string | null
  completed_at: string | null
  total_allocated: string | null
  unfunded_amount?: string | null
  created_at: string
  updated_at: string
  accounts?: AllocationAccount[]
}

export type AllocationAccount = {
  account_id: string
  code: string
  name: string
  currency: string
  amount: string
}

export type AllocationStore = {
  name: string
  description?: string | null
  target_amount?: number | null
  status?: AllocationStatus
  expires_at?: string | null
}

export type AllocationUpdate = Partial<AllocationStore>

export type AllocationAdjust = {
  account_id: string
  amount: number
}

export type AccountAllocationItem = {
  allocation_id: string
  name: string
  amount: string
}

export type AccountAllocations = {
  account_id: string
  currency: string
  balance: string
  available: string
  total_allocated: string
  unallocated: string
  over_allocated: boolean
  items: AccountAllocationItem[]
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

export type AccountAnalytics = {
  account_id: string
  account_type: AccountType
  totals: {
    debit: string
    credit: string
    net: string
    balance: string
    balance_side: 'debit' | 'credit'
  }
  counts: {
    lines: number
    journals: number
  }
  by_status: Record<string, { status: string; debit: string; credit: string; count: number | string }>
  monthly: Array<{ month: string; debit: string; credit: string; count: number | string }>
  recent: JournalLine[]
}

export type BudgetSummary = {
  income_budgeted: string
  expense_budgeted: string
  total_budgeted: string
  income_actual: string
  expense_actual: string
  other_actual?: string
  total_actual?: string
  unbudgeted_income: string
  remaining_expense: string
  net_budgeted: string
}

export type WealthPoint = {
  month: string
  assets: string
  liabilities: string
  net_worth: string
}

export type Overview = {
  period: 'today' | 'this_week' | 'this_month'
  date_range: {
    from: string
    to: string
  }
  income: {
    actual: string
    budgeted: string
  }
  expense: {
    actual: string
    budgeted: string
    remaining: string
    overspend: string
  }
  unbudgeted_income: string
  net_budgeted: string
  safe_money: string
  safe_money_legacy?: string
  safe_money_formula?: string
  eligible_assets?: string
  allocated?: {
    total_allocated: string
    total_target: string
    unfunded: string
  }
  other_obligations?: string
  is_over_allocated?: boolean
  assets: {
    balance: string
  }
  liabilities: {
    balance: string
  }
  net_worth: string
  wealth_history: WealthPoint[]
}

export type Paginated<T> = {
  data: T[]
  current_page: number
  last_page: number
  total: number
  total_amount?: string
  summary?: BudgetSummary
}

export type ApiEnvelope<T> = {
  data: T
}

export type AuthResponse = {
  user: User
  token: string
  tenant?: Tenant
}

export type QuickTransactionType = 'expense' | 'income' | 'transfer' | 'debt_payment'

export type QuickTransactionStore = {
  type: QuickTransactionType
  amount: number
  description: string
  transaction_date?: string
  reference?: string
  status?: JournalStatus
  payment_method?: 'cash' | 'credit'
  tags?: string[]
  asset_account_id?: string
  expense_account_id?: string
  income_account_id?: string
  from_account_id?: string
  to_account_id?: string
  via_account_ids?: string[]
  liability_account_id?: string
}

export type RegisterPayload = {
  name: string
  email: string
  password: string
  password_confirmation?: string
  tenant_name?: string
  tenant_slug?: string
}
