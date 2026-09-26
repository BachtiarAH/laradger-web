import * as React from 'react'
import { api } from '../../lib/api'
import type { AiActionDraft } from '../../lib/types'
import { cn } from '../../lib/utils'

/**
 * A readable view of a proposed action, so reviewing never means reading JSON.
 *
 * Falls back to a compact key/value list for tools that have no bespoke
 * renderer, rather than showing raw JSON.
 */
export function DraftSummary({ draft }: { draft: AiActionDraft }) {
  const payload = draft.payload ?? {}
  const names = useAccountNames()

  if (draft.tool === 'journal_create') {
    return <JournalSummary payload={payload} names={names} />
  }

  if (draft.tool === 'account_create') {
    return (
      <dl className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
        <Field label="Nama" value={payload.name} />
        <Field label="Tipe" value={payload.type} />
        <Field label="Mata uang" value={payload.currency} />
        <Field
          label="Induk akun"
          value={payload.parent_id ? names(payload.parent_id) : '—'}
        />
        <Field
          label="Header"
          value={payload.is_header === true ? 'ya (kategori)' : 'tidak'}
        />
        <Field label="Status" value={payload.status} />
      </dl>
    )
  }

  if (draft.tool === 'tag_create') {
    return (
      <dl className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
        <Field label="Nama" value={payload.name} />
        <Field label="Tipe" value={payload.type} />
      </dl>
    )
  }

  return (
    <dl className="space-y-1 text-xs">
      {Object.entries(payload).map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <dt className="min-w-28 shrink-0 text-muted-foreground">{key}</dt>
          <dd className="min-w-0 break-words">
            {typeof value === 'object' && value !== null
              ? JSON.stringify(value)
              : String(value ?? '—')}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function JournalSummary({
  payload,
  names,
}: {
  payload: Record<string, any>
  names: (id: string) => string
}) {
  const lines: Array<Record<string, any>> = Array.isArray(payload.lines)
    ? payload.lines
    : []
  const total = lines.reduce(
    (sum, line) => sum + Number(line.debit || 0),
    0,
  )
  const balanced = Math.abs(total) < 0.005

  return (
    <div className="space-y-2">
      <dl className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
        <Field label="Tanggal" value={payload.transaction_date} />
        <Field label="Status" value={payload.status} />
        <Field label="Referensi" value={payload.reference || 'otomatis'} />
        <div className="col-span-3">
          <Field label="Keterangan" value={payload.description} />
        </div>
      </dl>

      <div className="overflow-hidden rounded border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-2 py-1 text-left font-medium">Akun</th>
              <th className="px-2 py-1 text-right font-medium">Debit</th>
              <th className="px-2 py-1 text-right font-medium">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-border">
                <td className="px-2 py-1">
                  {line.account_id ? (
                    names(String(line.account_id))
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      akun belum dipilih
                    </span>
                  )}
                </td>
                <td className="px-2 py-1 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                  {line.debit || '—'}
                </td>
                <td className="px-2 py-1 text-right tabular-nums text-red-700 dark:text-red-400">
                  {line.credit || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        className={cn(
          'text-xs',
          balanced
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-amber-700 dark:text-amber-300',
        )}
      >
        {balanced
          ? `Total ${formatAmount(total)} — seimbang.`
          : `Total debit ${formatAmount(total)} — belum seimbang, akan ditolak saat dijalankan.`}
      </p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('break-words', !value && 'text-muted-foreground')}>
        {value === null || value === undefined || value === '' ? '—' : String(value)}
      </dd>
    </div>
  )
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Resolve account ids to names for the summary, fetched once and shared. */
function useAccountNames(): (id: string) => string {
  const [map, setMap] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    let active = true

    api
      .listAccounts({ per_page: 100 })
      .then(({ data }) => {
        if (!active) return
        setMap(
          Object.fromEntries(data.map((a) => [a.id, `${a.code} · ${a.name}`])),
        )
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  return React.useCallback(
    (id: string) => map[id] ?? `akun tidak dikenal (${id.slice(0, 8)}…)`,
    [map],
  )
}
