import * as React from 'react'
import { api } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import type { Budget, BudgetStore } from '../lib/types'
import {
  Button,
  ErrorBox,
  Field,
  Input,
} from './ui'

function ChipPicker({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <Field label={title}>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">No options available.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <label
              key={option.id}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
                selected.includes(option.id)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selected.includes(option.id)}
                onChange={() => onToggle(option.id)}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </Field>
  )
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
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

  const accounts = useFetch(() => api.listAccounts({ per_page: 100 }), [])
  const tags = useFetch(() => api.listTags({ per_page: 100 }), [])

  const set = (patch: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const toggle = (list: string[], setter: (v: string[]) => void) => (id: string) =>
    setter(list.includes(id) ? list.filter((t) => t !== id) : [...list, id])

  const buildPayload = (): BudgetStore => ({
    name: form.name,
    ...(form.description ? { description: form.description } : {}),
    amount: Number(form.amount),
    starts_at: form.starts_at,
    ends_at: form.ends_at,
    ...(accountIds.length > 0 ? { account_ids: accountIds } : {}),
    ...(tagIds.length > 0 ? { tag_ids: tagIds } : {}),
  })

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

      <ChipPicker
        title="Linked accounts"
        options={(accounts.data?.data ?? []).map((a) => ({
          id: a.id,
          label: `${a.code} — ${a.name}`,
        }))}
        selected={accountIds}
        onToggle={toggle(accountIds, setAccountIds)}
      />
      <ChipPicker
        title="Tags"
        options={(tags.data?.data ?? []).map((t) => ({
          id: t.id,
          label: t.name,
        }))}
        selected={tagIds}
        onToggle={toggle(tagIds, setTagIds)}
      />

      {error != null && <ErrorBox error={error} />}
      <div className="flex gap-2">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}