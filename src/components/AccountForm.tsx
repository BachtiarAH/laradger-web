import * as React from 'react'
import type { Account, AccountStore, AccountType, AccountStatus } from '../lib/types'
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
import { AccountSelect } from './AccountSelect'
import { api } from '../lib/api'

export const ACCOUNT_TYPES: AccountType[] = [
  'asset',
  'liability',
  'equity',
  'income',
  'expense',
]

const emptyForm: AccountStore = {
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
  createAnother = false,
  onCreateAnother,
}: {
  initial?: Account | null
  onSubmit: (payload: AccountStore) => Promise<void>
  submitLabel?: string
  loading?: boolean
  createAnother?: boolean
  onCreateAnother?: (payload: AccountStore) => Promise<void>
}) {
  const [form, setForm] = React.useState<AccountStore>(() =>
    initial
      ? {
          name: initial.name,
          type: initial.type,
          parent_id: initial.parent_id,
          currency: initial.currency,
          status: initial.status,
        }
      : emptyForm,
  )
  const [error, setError] = React.useState<unknown>(null)
  const [saved, setSaved] = React.useState(false)
  const isEditing = Boolean(initial)
  const [nextCode, setNextCode] = React.useState<string>('')
  const [codeEditable, setCodeEditable] = React.useState(false)
  const [customCode, setCustomCode] = React.useState('')

  const set = (patch: Partial<AccountStore>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  React.useEffect(() => {
    if (isEditing) return
    setCodeEditable(false)
    setCustomCode('')
    let active = true
    setNextCode('')
    api
      .nextAccountCode(form.type)
      .then((code) => {
        if (active) setNextCode(code)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [form.type, isEditing])

  const buildPayload = (): AccountStore => {
    const payload: AccountStore = {
      ...form,
      parent_id: form.parent_id === '' ? null : form.parent_id,
    }
    if (!isEditing && codeEditable && customCode.trim()) {
      payload.code = customCode.trim()
    }
    return payload
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      await onSubmit(buildPayload())
    } catch (err) {
      setError(err)
    }
  }

  const handleCreateAnother = async (e: React.MouseEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      await onCreateAnother?.(buildPayload())
      setForm((prev) => ({
        ...emptyForm,
        parent_id: prev.parent_id,
        type: prev.type,
        currency: prev.currency,
        status: prev.status,
      }))
      setSaved(true)
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
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        {isEditing ? (
          <Field label="Code" htmlFor="code">
            <Input id="code" disabled value={initial?.code ?? ''} />
          </Field>
        ) : codeEditable ? (
          <Field label="Code" htmlFor="code">
            <Input
              id="code"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder={nextCode ? `Auto: ${nextCode}` : undefined}
            />
          </Field>
        ) : (
          <Field label="Code">
            <div className="flex items-center gap-2">
              <Input
                disabled
                value={nextCode || 'Loading…'}
                className="font-mono"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-2.5"
                onClick={() => setCodeEditable(true)}
              >
                Custom
              </Button>
            </div>
          </Field>
        )}
        <Field label="Type" htmlFor="type">
          <Select
            value={form.type}
            onValueChange={(value) => set({ type: value as AccountType })}
          >
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Parent account" htmlFor="parent_id">
          <AccountSelect
            value={form.parent_id ?? null}
            onValueChange={(value) => set({ parent_id: value })}
            excludeId={initial?.id ?? null}
            placeholder="Select parent account…"
            allowNone
            allowCreate
          />
          {initial?.id && form.parent_id === initial.id && (
            <p className="mt-1 text-xs text-destructive">An account cannot be its own parent.</p>
          )}
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
            value={form.status}
            onValueChange={(value) => set({ status: value as AccountStatus })}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="inactive">inactive</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      {error != null && <ErrorBox error={error} />}
      {saved && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          Account created. Ready for the next one.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
        {createAnother && (
          <Button
            type="button"
            variant="secondary"
            loading={loading}
            onClick={handleCreateAnother}
          >
            Save &amp; create another
          </Button>
        )}
      </div>
    </form>
  )
}