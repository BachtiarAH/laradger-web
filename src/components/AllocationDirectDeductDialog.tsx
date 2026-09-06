import * as React from 'react'
import { api } from '../lib/api'
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
import type { Allocation } from '../lib/types'

function formatAmount(value: string | number | null | undefined): string {
  if (value == null || value === '') return '0.00'
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(n) ? String(value) : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function AllocationDirectDeductDialog({
  open,
  onOpenChange,
  allocation,
  onSubmitted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  allocation: Allocation
  onSubmitted: () => void | Promise<void>
}) {
  const [mode, setMode] = React.useState<'add' | 'set'>('add')
  const [amount, setAmount] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<unknown>(null)

  React.useEffect(() => {
    if (open) {
      setMode('add')
      setAmount('')
      setReason('')
      setError(null)
    }
  }, [open])

  const amountNumber = Number(amount)
  const isValid = amount !== '' && Number.isFinite(amountNumber) && amountNumber >= 0 && (mode === 'set' || amountNumber > 0)

  const currentJournal = Number(allocation.journal_realized_amount ?? 0)
  const currentManual = Number(allocation.manual_realized_amount ?? 0)
  const target = Number(allocation.target_amount ?? 0)
  const carryOver = Number(allocation.carry_over_amount ?? 0)
  const effectiveTarget = target + carryOver

  const projectedManual = mode === 'add' ? currentManual + (amountNumber || 0) : (amountNumber || 0)
  const projectedRealized = currentJournal + projectedManual
  const projectedRemaining = Math.max(0, effectiveTarget - projectedRealized)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setError(null)
    setSubmitting(true)
    try {
      await api.deductAllocation(allocation.id, {
        amount: amountNumber,
        mode,
        reason: reason.trim() ? reason.trim() : undefined,
      })
      await onSubmitted()
      onOpenChange(false)
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Potong Langsung / Realisasi Manual</DialogTitle>
            <DialogDescription>
              Catat pemakaian alokasi langsung tanpa transaksi jurnal. Sisa alokasi dan Safe-to-Spend akan langsung terpotong.
            </DialogDescription>
          </DialogHeader>

          {error != null && <ErrorBox error={error} />}

          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target Efektif:</span>
              <span className="font-semibold text-foreground">{formatAmount(effectiveTarget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Realisasi Saat Ini:</span>
              <span className="font-semibold text-foreground">{formatAmount(allocation.realized_amount ?? 0)}</span>
            </div>
            <div className="flex justify-between pl-3 text-[11px] text-muted-foreground">
              <span>• Realisasi Jurnal Transaksi:</span>
              <span>{formatAmount(currentJournal)}</span>
            </div>
            <div className="flex justify-between pl-3 text-[11px] text-muted-foreground">
              <span>• Realisasi Manual Langsung:</span>
              <span>{formatAmount(currentManual)}</span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-1.5 font-medium">
              <span className="text-muted-foreground">Sisa Alokasi (Remaining):</span>
              <span className="text-primary font-bold">{formatAmount(allocation.remaining_amount ?? effectiveTarget)}</span>
            </div>
          </div>

          <Field label="Metode Pemotongan">
            <Select
              value={mode}
              onValueChange={(val) => setMode(val as 'add' | 'set')}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">
                  Tambah Pemakaian (Add ke realisasi saat ini)
                </SelectItem>
                <SelectItem value="set">
                  Set Total Realisasi Manual (Tetapkan nominal total)
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={mode === 'add' ? 'Nominal Pemotongan Tambahan' : 'Total Baru Realisasi Manual'}
            htmlFor="deduct-amount"
          >
            <Input
              id="deduct-amount"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="Contoh: 150000.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="Alasan / Catatan (opsional)" htmlFor="deduct-reason">
            <Input
              id="deduct-reason"
              maxLength={255}
              placeholder="Contoh: Pengeluaran tunai offline / belanja tanpa nota"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          {amount !== '' && isValid && (
            <div className="rounded-md bg-primary/10 border border-primary/20 p-2.5 text-xs text-primary flex justify-between items-center">
              <span>Sisa alokasi setelah pemotongan:</span>
              <span className="font-bold text-sm">{formatAmount(projectedRemaining)}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={!isValid || submitting}>
              {submitting ? 'Menyimpan…' : 'Potong Alokasi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
