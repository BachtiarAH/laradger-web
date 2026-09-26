import * as React from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '../lib/utils'

export type BalanceLine = {
  account_id?: string | null
  debit?: string | number | null
  credit?: string | number | null
}

/** Decimal string or number to integer cents, matching the server. */
function toCents(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0

  const parsed = Number(value)

  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

/**
 * Live debit/credit balance for a set of journal lines.
 *
 * Both journal forms rejected an unbalanced entry with nothing but a server
 * 422 after the fact. This tells you before you save, and names the line that
 * is missing an account, which is the other way a form silently fails to
 * balance.
 */
export function LineBalanceHint({ lines }: { lines: BalanceLine[] }) {
  if (!Array.isArray(lines) || lines.length === 0) return null

  const debit = lines.reduce((sum, line) => sum + toCents(line.debit), 0)
  const credit = lines.reduce((sum, line) => sum + toCents(line.credit), 0)
  const difference = debit - credit
  const balanced = difference === 0

  const missing = lines.reduce((count, line, index) => {
    if (!line.account_id) return count + 1
    return count
  }, 0)
  const unassigned = lines
    .map((line, index) => (line.account_id ? null : index))
    .filter((index): index is number => index !== null)

  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        balanced
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
          : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
      )}
    >
      <p className="flex items-center gap-2">
        {balanced ? (
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        ) : (
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
        )}
        <span className="tabular-nums">
          Debit {formatCents(debit)} · Kredit {formatCents(credit)}
        </span>
      </p>

      <p className="mt-1 text-xs">
        {balanced
          ? 'Seimbang, siap disimpan.'
          : `Belum seimbang, beda ${formatCents(
              Math.abs(difference),
            )}. Server akan menolak selama belum sama.`}
      </p>

      {missing > 0 && (
        <p className="mt-1 text-xs font-medium">
          {missing} baris belum memilih akun:{' '}
          {unassigned.map((n) => `baris ${n + 1}`).join(', ')}.
        </p>
      )}
    </div>
  )
}
