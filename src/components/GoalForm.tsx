import * as React from 'react'
import type { Goal, GoalStatus, GoalStore } from '../lib/types'
import {
  Button,
  ErrorBox,
  Field,
  Input,
} from './ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

export function GoalForm({
  initial,
  onSubmit,
  submitLabel = 'Save Goal',
  loading,
}: {
  initial?: Goal | null
  onSubmit: (payload: GoalStore) => Promise<void>
  submitLabel?: string
  loading?: boolean
}) {
  const [form, setForm] = React.useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    targetAmount: initial?.target_amount ? Number(initial.target_amount) : '',
    targetDate: initial?.target_date ?? '',
    recurringContribution: initial?.recurring_contribution_amount
      ? Number(initial.recurring_contribution_amount)
      : '',
    frequency: initial?.contribution_frequency ?? 'monthly',
    status: (initial?.status ?? 'active') as GoalStatus,
  })
  const [error, setError] = React.useState<unknown>(null)

  const set = (patch: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.targetAmount || Number(form.targetAmount) <= 0) {
      setError(new Error('Target amount must be greater than 0.'))
      return
    }

    const payload: GoalStore = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      target_amount: Number(form.targetAmount),
      target_date: form.targetDate || null,
      recurring_contribution_amount: form.recurringContribution ? Number(form.recurringContribution) : null,
      contribution_frequency: form.frequency,
      status: form.status,
    }

    try {
      await onSubmit(payload)
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Goal Name" htmlFor="goal-name">
        <Input
          id="goal-name"
          required
          maxLength={255}
          placeholder="e.g. Emergency Fund, New Laptop, Vacation Fund"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Target Amount" htmlFor="goal-target">
          <Input
            id="goal-target"
            required
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 10000000.00"
            value={form.targetAmount}
            onChange={(e) => set({ targetAmount: e.target.value })}
          />
        </Field>

        <Field label="Target Date (optional)" htmlFor="goal-date">
          <Input
            id="goal-date"
            type="date"
            value={form.targetDate}
            onChange={(e) => set({ targetDate: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Recurring Plan (e.g. per month)" htmlFor="goal-recurring">
          <Input
            id="goal-recurring"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 500000.00"
            value={form.recurringContribution}
            onChange={(e) => set({ recurringContribution: e.target.value })}
          />
        </Field>

        <Field label="Plan Frequency">
          <Select
            value={form.frequency}
            onValueChange={(v) => set({ frequency: v })}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {initial && (
        <Field label="Status">
          <Select
            value={form.status}
            onValueChange={(v) => set({ status: v as GoalStatus })}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="achieved">Achieved</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field label="Description (optional)" htmlFor="goal-description">
        <Input
          id="goal-description"
          maxLength={1000}
          placeholder="Notes, motivations, or rules for this goal"
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
