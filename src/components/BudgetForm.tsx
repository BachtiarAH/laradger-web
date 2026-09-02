import * as React from 'react'
import { api } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import type { Budget, BudgetStore, Tag } from '../lib/types'
import {
  Button,
  ErrorBox,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui'
import { AccountMultiSelect } from './AccountMultiSelect'
import { TagInput } from './TagInput'

function toDateInput(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function toMonthInput(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().slice(0, 7)
  return dateStr.slice(0, 7)
}

export function BudgetForm({
  initial,
  onSubmit,
  submitLabel = 'Save',
  loading,
}: {
  initial?: Budget | null
  onSubmit: (payload: BudgetStore) => Promise<void>
  submitLabel?: string
  loading?: boolean
}) {
  const [budgetType, setBudgetType] = React.useState<'income' | 'expense'>(
    () => (initial?.budget_type as 'income' | 'expense') ?? 'expense',
  )
  const [periodType, setPeriodType] = React.useState<'custom' | 'monthly'>(
    () => (initial?.period_type as 'custom' | 'monthly') ?? 'custom',
  )
  const [isRecurring, setIsRecurring] = React.useState(() => initial?.is_recurring ?? false)
  const [budgetMonth, setBudgetMonth] = React.useState(() => toMonthInput(toDateInput(initial?.starts_at)))
  const [form, setForm] = React.useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    amount: initial ? Number(initial.amount) || '' : '',
    starts_at: toDateInput(initial?.starts_at),
    ends_at: toDateInput(initial?.ends_at),
  })
  const [accountIds, setAccountIds] = React.useState<string[]>(
    () => initial?.accounts?.map((a) => a.id) ?? [],
  )
  const [tagIds, setTagIds] = React.useState<string[]>(
    () => initial?.tags?.map((t) => t.id) ?? [],
  )
  const [error, setError] = React.useState<unknown>(null)

  const tags = useFetch(() => api.listTags({ per_page: 100 }), [])
  const [extraTags, setExtraTags] = React.useState<Tag[]>([])
  const allTags = React.useMemo(() => [...(tags.data?.data ?? []), ...extraTags], [tags.data, extraTags])

  const set = (patch: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const buildPayload = (): BudgetStore => {
    const base: BudgetStore = {
      name: form.name,
      ...(form.description ? { description: form.description } : {}),
      amount: Number(form.amount),
      budget_type: budgetType,
      period_type: periodType,
      is_recurring: isRecurring,
      ...(accountIds.length > 0 ? { account_ids: accountIds } : {}),
      ...(tagIds.length > 0 ? { tag_ids: tagIds } : {}),
    }

    if (periodType === 'monthly') {
      return { ...base, budget_month: budgetMonth }
    }

    return { ...base, starts_at: form.starts_at, ends_at: form.ends_at }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await onSubmit(buildPayload())
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <Input
            id="name"
            required
            maxLength={255}
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <Field label="Amount" htmlFor="amount">
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
          />
        </Field>
        <Field label="Tipe anggaran" htmlFor="budget_type">
          <Select value={budgetType} onValueChange={(v) => { setBudgetType(v as 'income' | 'expense'); setAccountIds([]) }}>
            <SelectTrigger id="budget_type" className="w-full min-w-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Pengeluaran (Belanja)</SelectItem>
              <SelectItem value="income">Pemasukan (Pendapatan)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tipe periode" htmlFor="period_type">
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as 'custom' | 'monthly')}>
            <SelectTrigger id="period_type" className="w-full min-w-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom (otomatis — pilih tanggal)</SelectItem>
              <SelectItem value="monthly">Bulanan</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="flex min-w-0 items-end pb-2">
          <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 shrink-0 rounded border-input" />
            <span className="min-w-0 break-words leading-tight">Perpanjang otomatis tiap periode</span>
          </label>
        </div>
        {periodType === 'monthly' ? (
          <Field label="Bulan" htmlFor="budget_month">
            <Input
              id="budget_month"
              type="month"
              required
              value={budgetMonth}
              onChange={(e) => setBudgetMonth(e.target.value)}
            />
          </Field>
        ) : (
          <>
            <Field label="Start date" htmlFor="starts_at">
              <Input
                id="starts_at"
                type="date"
                required
                value={form.starts_at}
                onChange={(e) => set({ starts_at: e.target.value })}
              />
            </Field>
            <Field label="End date" htmlFor="ends_at">
              <Input
                id="ends_at"
                type="date"
                required
                value={form.ends_at}
                onChange={(e) => set({ ends_at: e.target.value })}
              />
            </Field>
          </>
        )}
        <div className="sm:col-span-2">
          <Field label="Description" htmlFor="description">
            <Input
              id="description"
              maxLength={255}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <Field label="Linked accounts">
        <AccountMultiSelect
          selectedIds={accountIds}
          onChange={setAccountIds}
          placeholder={budgetType === 'income' ? 'Pilih akun pendapatan (income)…' : 'Pilih akun belanja (expense)…'}
          filterType={budgetType}
        />
      </Field>
      <Field label="Tags">
        <TagInput tags={allTags} selectedIds={tagIds} onChange={setTagIds} onTagCreated={(t) => setExtraTags((prev) => [...prev, t])} />
      </Field>

      {error != null && <ErrorBox error={error} />}
      <div className="flex gap-2">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}