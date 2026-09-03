import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { api } from '../lib/api'
import { useFetch } from '../lib/useFetch'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { AccountSelect } from './AccountSelect'
import type { Allocation } from '../lib/types'

type Mode = 'allocate' | 'release'

export function AllocationAdjustDialog({
  open,
  onOpenChange,
  mode,
  allocationId,
  accountId,
  limitAmount,
  onSubmitted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  /** Preselected allocation; null lets the user pick one from a list. */
  allocationId?: string | null
  /** Preselected account; null lets the user pick one (asset accounts only). */
  accountId?: string | null
  /** Ceiling hint (available balance when allocating, reserved amount when releasing). */
  limitAmount?: string | number | null
  onSubmitted: () => void | Promise<void>
}) {
  const [selectedAllocationId, setSelectedAllocationId] = React.useState<string | null>(allocationId ?? null)
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(accountId ?? null)
  const [amount, setAmount] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<unknown>(null)

  const limit = limitAmount == null || limitAmount === '' ? null : Number(limitAmount)

  const allocations = useFetch<{ data: Allocation[] }>(
    () => api.listAllocations({ per_page: 100 }),
    [open],
  )

  React.useEffect(() => {
    if (open) {
      setSelectedAllocationId(allocationId ?? null)
      setSelectedAccountId(accountId ?? null)
      setAmount('')
      setError(null)
    }
  }, [open, allocationId, accountId])

  const allocationName =
    allocations.data?.data?.find((a) => a.id === selectedAllocationId)?.name ?? null

  const amountNumber = Number(amount)
  const valid =
    selectedAllocationId !== null &&
    selectedAccountId !== null &&
    amount !== '' &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    (limit == null || amountNumber <= limit + 0.0001)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || !selectedAllocationId || !selectedAccountId) return
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'allocate') {
        await api.allocateOnAllocation(selectedAllocationId, {
          account_id: selectedAccountId,
          amount: amountNumber,
        })
      } else {
        await api.releaseOnAllocation(selectedAllocationId, {
          account_id: selectedAccountId,
          amount: amountNumber,
        })
      }
      await onSubmitted()
      onOpenChange(false)
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === 'allocate' ? 'Allocate money' : 'Release money'}</DialogTitle>
            <DialogDescription>
              {mode === 'allocate'
                ? 'Reserve part of an account balance for this allocation. This does not create a journal entry.'
                : 'Free up money that was reserved on an account. This does not create a journal entry.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedAllocationId === null && (
              <Field label="Allocation">
                {allocations.data?.data?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No allocations yet.{' '}
                    <Link to="/allocations/new" className="font-medium text-primary hover:underline">
                      Create one first
                    </Link>
                    .
                  </p>
                ) : (
                  <Select
                    value={selectedAllocationId ?? undefined}
                    onValueChange={setSelectedAllocationId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select allocation…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(allocations.data?.data ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            )}
            {selectedAllocationId !== null && !accountId && allocationName && (
              <p className="text-sm text-muted-foreground">
                Allocation: <span className="font-medium text-foreground">{allocationName}</span>
              </p>
            )}

            {selectedAccountId === null && (
              <Field label="Account">
                <AccountSelect
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                  type="asset"
                  placeholder="Select asset account…"
                />
              </Field>
            )}

            <Field label={mode === 'release' ? 'Amount to release' : 'Amount'}>
              <Input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {limit != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {mode === 'allocate' ? 'Available balance: ' : 'Currently reserved: '}
                  <span className="font-medium text-foreground">
                    {limit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </p>
              )}
            </Field>

            {error != null && <ErrorBox error={error} />}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting} disabled={!valid}>
              {mode === 'allocate' ? 'Allocate' : 'Release'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
