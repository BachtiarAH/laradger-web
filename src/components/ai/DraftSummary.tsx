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

  // Compare debits against credits, not against zero. Amounts arrive as
  // decimal strings, so they are converted to integer cents rather than
  // summed as floats, which is also how the server validates them.
  const debitCents = lines.reduce((sum, line) => sum + toCents(line.debit), 0)
  const creditCents = lines.reduce((sum, line) => sum + toCents(line.credit), 0)
  const difference = debitCents - creditCents
  const balanced = difference === 0
  const missingAccount = lines.some((line) => !line.account_id)

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
          ? `Debit ${formatCents(debitCents)} = kredit ${formatCents(creditCents)} — seimbang.`
          : `Debit ${formatCents(debitCents)} vs kredit ${formatCents(creditCents)} — beda ${formatCents(
              Math.abs(difference),
            )}, akan ditolak saat dijalankan.`}
        {missingAccount && ' Ada baris yang belum memilih akun.'}
      </p>

      <TagStrip payload={payload} />
    </div>
  )
}

/**
 * Tags are what make a journal findable later, and they are the easiest thing
 * in a draft to skim past — so they get their own line rather than being buried
 * in the payload, and the ids are resolved to real names.
 */
function TagStrip({ payload }: { payload: Record<string, any> }) {
  const ids: string[] = Array.isArray(payload.tags) ? payload.tags.map(String) : []
  const names = useTagNames()

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
      <span className="text-xs text-muted-foreground">Tag:</span>
      {ids.length === 0 ? (
        <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground">
          belum ada
        </span>
      ) : (
        ids.map((id) => (
          <span
            key={id}
            className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
          >
            {names(id)}
          </span>
        ))
      )}
    </div>
  )
}

/** Decimal string to integer cents, matching how the server stores money. */
function toCents(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0

  const parsed = Number(value)

  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
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

function formatCents(cents: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
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

/** Resolve tag ids to names for the summary. */
function useTagNames(): (id: string) => string {
  const [map, setMap] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    let active = true

    api
      .listTags({ per_page: 100 })
      .then(({ data }) => {
        if (!active) return
        setMap(Object.fromEntries(data.map((t) => [t.id, t.name])))
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  return React.useCallback(
    (id: string) => map[id] ?? `tag tidak dikenal (${id.slice(0, 8)}…)`,
    [map],
  )
}
