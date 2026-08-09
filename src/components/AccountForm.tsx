import * as React from 'react'
import { api } from '../lib/api'
import type { Account, AccountStore, AccountType, AccountStatus } from '../lib/types'
import { Button, ErrorBox, Field, Input, Select } from './ui'
import { useFetch } from '../lib/useFetch'

export const ACCOUNT_TYPES: AccountType[] = [
  'asset',
  'liability',
  'equity',
  'income',
  'expense',
]

const emptyForm: AccountStore = {
  code: '',
  name: '',
  type: 'asset',
  parent_id: null,
  currency: 'IDR',
  status: 'active',
}

export function AccountForm({
  initial,
  onSubmit,
  submitLabel = 'Save',
  loading,
}: {
  initial?: Account | null
  onSubmit: (payload: AccountStore) => Promise<void>
  submitLabel?: string
  loading?: boolean
}) {
  const [form, setForm] = React.useState<AccountStore>(() =>
    initial
      ? {
          code: initial.code,
          name: initial.name,
          type: initial.type,
          parent_id: initial.parent_id,
          currency: initial.currency,
          status: initial.status,
        }
      : emptyForm,
  )
  const [error, setError] = React.useState<unknown>(null)

  const accounts = useFetch(() => api.listAccounts({ per_page: 100 }), [])

  const set = (patch: Partial<AccountStore>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await onSubmit({
        ...form,
        parent_id: form.parent_id === '' ? null : form.parent_id,
      })
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Code" htmlFor="code">
          <Input
            id="code"
            required
            value={form.code}
            onChange={(e) => set({ code: e.target.value })}
          />
        </Field>
        <Field label="Name" htmlFor="name">
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <Field label="Type" htmlFor="type">
          <Select
            id="type"
            value={form.type}
            onChange={(e) => set({ type: e.target.value as AccountType })}
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Parent account" htmlFor="parent_id">
          <Select
            id="parent_id"
            value={form.parent_id ?? ''}
            onChange={(e) => set({ parent_id: e.target.value || null })}
          >
            <option value="">None</option>
            {accounts.data?.data.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} — {account.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Currency" htmlFor="currency">
          <Input
            id="currency"
            required
            maxLength={3}
            value={form.currency}
            onChange={(e) => set({ currency: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            value={form.status}
            onChange={(e) => set({ status: e.target.value as AccountStatus })}
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </Select>
        </Field>
      </div>
      {error != null && <ErrorBox error={error} />}
      <div className="flex gap-2">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
