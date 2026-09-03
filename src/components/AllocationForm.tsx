import * as React from 'react'
import type { Allocation, AllocationStore } from '../lib/types'
import {
  Button,
  ErrorBox,
  Field,
  Input,
} from './ui'

export function AllocationForm({
  initial,
  onSubmit,
  submitLabel = 'Save',
  loading,
}: {
  initial?: Allocation | null
  onSubmit: (payload: AllocationStore) => Promise<void>
  submitLabel?: string
  loading?: boolean
}) {
  const [form, setForm] = React.useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    targetAmount: initial?.target_amount ? Number(initial.target_amount) : '',
  })
  const [error, setError] = React.useState<unknown>(null)

  const set = (patch: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const payload: AllocationStore = {
      name: form.name,
      description: form.description || null,
      target_amount: form.targetAmount === '' || form.targetAmount === null
        ? null
        : Number(form.targetAmount),
    }
    try {
      await onSubmit(payload)
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Name" htmlFor="allocation-name">
        <Input
          id="allocation-name"
          required
          maxLength={255}
          placeholder="Emergency Fund"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Field label="Target amount (optional)" htmlFor="allocation-target">
        <Input
          id="allocation-target"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 10000000.00"
          value={form.targetAmount}
          onChange={(e) => set({ targetAmount: e.target.value })}
        />
      </Field>
      <Field label="Description (optional)" htmlFor="allocation-description">
        <Input
          id="allocation-description"
          maxLength={1000}
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
        />
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
