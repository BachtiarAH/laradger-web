import * as React from 'react'
import type { Allocation, AllocationPeriod, AllocationRollForward, AllocationStore, AllocationType } from '../lib/types'
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
import { AccountMultiSelect } from './AccountMultiSelect'

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
    manualRealizedAmount: initial?.manual_realized_amount ? Number(initial.manual_realized_amount) : '',
    type: (initial?.type ?? 'recurring') as AllocationType,
    periodType: (initial?.period_type ?? 'monthly') as AllocationPeriod,
    rollForwardMode: (initial?.roll_forward_mode ?? 'reset') as AllocationRollForward,
    expenseAccountIds: initial?.expense_account_ids ?? initial?.expense_accounts?.map((a) => a.id) ?? [] as string[],
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
      manual_realized_amount: form.manualRealizedAmount === '' || form.manualRealizedAmount === null
        ? 0
        : Number(form.manualRealizedAmount),
      type: form.type,
      period_type: form.periodType,
      roll_forward_mode: form.rollForwardMode,
      expense_account_ids: form.expenseAccountIds,
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
          placeholder="e.g. Sibling Allowance, Groceries, School Books"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Allocation Plan Type">
          <Select
            value={form.type}
            onValueChange={(v) => set({ type: v as AllocationType })}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recurring">Recurring (Repeats every period)</SelectItem>
              <SelectItem value="one_time">One-time (Specific need / event)</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {form.type === 'recurring' ? (
          <Field label="Recurrence Period">
            <Select
              value={form.periodType}
              onValueChange={(v) => set({ periodType: v as AllocationPeriod })}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={form.type === 'recurring' ? 'Planned amount per period' : 'Target amount'} htmlFor="allocation-target">
          <Input
            id="allocation-target"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 250000.00"
            value={form.targetAmount}
            onChange={(e) => set({ targetAmount: e.target.value })}
          />
        </Field>

        {form.type === 'recurring' ? (
          <Field label="Unused balance at period end">
            <Select
              value={form.rollForwardMode}
              onValueChange={(v) => set({ rollForwardMode: v as AllocationRollForward })}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reset">Release / Reset (Start fresh)</SelectItem>
                <SelectItem value="carry_over">Carry over unspent funds</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        ) : null}
      </div>

      <Field label="Description (optional)" htmlFor="allocation-description">
        <Input
          id="allocation-description"
          maxLength={1000}
          placeholder="Optional notes or context"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>

      <Field label="Auto-spend Akun Beban (opsional)">
        <AccountMultiSelect
          selectedIds={form.expenseAccountIds}
          onChange={(ids) => set({ expenseAccountIds: ids })}
          filterType="expense"
          placeholder="Pilih akun beban untuk auto-spend…"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Setiap transaksi pengeluaran (expense) yang menggunakan akun-akun beban ini akan otomatis memotong dan memenuhi alokasi ini.
        </p>
      </Field>

      <Field
        label="Potong Langsung / Realisasi Manual (opsional)"
        htmlFor="allocation-manual-realized"
      >
        <Input
          id="allocation-manual-realized"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={form.manualRealizedAmount}
          onChange={(e) => set({ manualRealizedAmount: e.target.value })}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Nominal alokasi yang langsung terpakai tanpa transaksi jurnal (mengurangi sisa alokasi).
        </p>
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
