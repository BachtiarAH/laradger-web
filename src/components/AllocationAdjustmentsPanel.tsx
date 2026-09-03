import * as React from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import type {
  Account,
  AccountAllocations,
  Allocation,
  JournalStatus,
} from '../lib/types'
import {
  Button,
  ErrorBox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui'

export type AdjustmentDraft = {
  action: 'allocate' | 'release'
  allocation_id: string
  account_id: string
  amount: string
}

function formatAmount(value: string | number | null | undefined): string {
  if (value == null || value === '') return '0'
  const n = Number(value)
  return Number.isNaN(n)
    ? String(value)
    : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function MovementHint({ accounts, ids }: { accounts: Account[]; ids: string[] }) {
  const lines = accounts.filter((a) => ids.includes(a.id))
  return (
    <p className="text-xs text-muted-foreground">
      Penyesuaian berlaku untuk akun asset yang muncul di Lines:{' '}
      {lines.length > 0 ? lines.map((a) => `${a.code} — ${a.name}`).join(', ') : '—'}
    </p>
  )
}

export function AllocationAdjustmentsPanel({
  status,
  lineAccountIds,
  adjustments,
  onChange,
}: {
  status: JournalStatus
  lineAccountIds: string[]
  adjustments: AdjustmentDraft[]
  onChange: (adjustments: AdjustmentDraft[]) => void
}) {
  const assetAccounts = useFetch(
    () => api.listAccounts({ type: 'asset', per_page: 100 }),
    [],
  )
  const allocationsFetch = useFetch(
    () => api.listAllocations({ per_page: 100 }),
    [],
  )
  const allocations = allocationsFetch.data?.data ?? []

  // Accounts from the lines that are asset accounts.
  const eligible = React.useMemo(
    () => (assetAccounts.data?.data ?? []).filter((a) => lineAccountIds.includes(a.id)),
    [assetAccounts.data, lineAccountIds],
  )

  // Per-account allocation summaries (reserved funds + available balance).
  const [summaries, setSummaries] = React.useState<Record<string, AccountAllocations | null>>({})
  const selectedAccountIds = React.useMemo(
    () => Array.from(new Set(adjustments.map((a) => a.account_id).filter(Boolean))),
    [adjustments],
  )
  React.useEffect(() => {
    let active = true
    selectedAccountIds.forEach((accountId) => {
      if (accountId in summaries) return
      api
        .getAccountAllocations(accountId)
        .then((summary) => {
          if (active) setSummaries((prev) => ({ ...prev, [accountId]: summary }))
        })
        .catch(() => {
          if (active) setSummaries((prev) => ({ ...prev, [accountId]: null }))
        })
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountIds.join('|')])

  const update = (index: number, patch: Partial<AdjustmentDraft>) => {
    onChange(adjustments.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const addRow = () => {
    const accountId = eligible[0]?.id ?? ''
    if (!accountId) return
    onChange([
      ...adjustments,
      {
        action: 'allocate',
        allocation_id: allocations[0]?.id ?? '',
        account_id: accountId,
        amount: '',
      },
    ])
  }

  const removeRow = (index: number) => {
    onChange(adjustments.filter((_, i) => i !== index))
  }

  // Rows referencing accounts no longer in the lines are dropped.
  React.useEffect(() => {
    const known = new Set(lineAccountIds)
    if (adjustments.some((row) => !known.has(row.account_id))) {
      onChange(adjustments.filter((row) => known.has(row.account_id)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineAccountIds.join('|')])

  // Allocations only make sense on posted journals.
  React.useEffect(() => {
    if (status !== 'posted' && adjustments.length > 0) {
      onChange([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const assetOptions = eligible

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Alokasi (opsional)</h2>
          <p className="text-xs text-muted-foreground">
            Sisihkan dana (allocate) atau kurangi alokasi (release) bersamaan dengan journal
            ini — diterapkan atomik, tanpa membuat jurnal alokasi terpisah.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MovementHint accounts={assetOptions} ids={lineAccountIds} />
          <Button
            type="button"
            variant="secondary"
            onClick={addRow}
            disabled={status !== 'posted' || assetOptions.length === 0}
          >
            + Penyesuaian
          </Button>
        </div>
      </div>

      {status !== 'posted' && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Set status ke <strong>posted</strong> untuk mengatur alokasi — draft belum dianggap
          uang riil sehingga penyesuaian alokasi tidak diterapkan.
        </p>
      )}

      {status === 'posted' && assetOptions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Tambahkan minimal satu akun asset di bagian Lines untuk bisa mengatur alokasi.
        </p>
      )}

      {status === 'posted' && adjustments.length === 0 && assetOptions.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Belum ada penyesuaian. Contoh: habis gaji masuk → “Sisihkan” ke Dana Darurat; ada
          pengeluaran dari akun ter-alokasi → “Kurangi” dari dana tersebut.
        </p>
      )}

      {adjustments.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Akun</th>
                <th className="px-3 py-2 font-semibold">Aksi</th>
                <th className="px-3 py-2 font-semibold">Alokasi</th>
                <th className="px-3 py-2 font-semibold">Jumlah</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {adjustments.map((row, index) => {
                const summary = summaries[row.account_id]
                const reservedItem = summary?.items.find(
                  (item) => item.allocation_id === row.allocation_id,
                )
                const limit =
                  row.action === 'release' ? Number(reservedItem?.amount ?? 0) : Number(summary?.available ?? 0)
                const amount = Number(row.amount)
                const overLimit = row.amount !== '' && Number.isFinite(amount) && amount > limit

                return (
                  <tr key={index} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2">
                      <Select
                        value={row.account_id || undefined}
                        onValueChange={(accountId) => {
                          update(index, { account_id: accountId, allocation_id: '' })
                        }}
                      >
                        <SelectTrigger className="w-40"><SelectValue placeholder="Akun…" /></SelectTrigger>
                        <SelectContent>
                          {assetOptions.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} — {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={row.action}
                        onValueChange={(action) =>
                          update(index, {
                            action: action as 'allocate' | 'release',
                            allocation_id: '',
                          })
                        }
                      >
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="allocate">Sisihkan (tambah)</SelectItem>
                          <SelectItem value="release">Kurangi (pakai)</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      {row.action === 'release' ? (
                        <Select
                          value={row.allocation_id || undefined}
                          onValueChange={(id) => update(index, { allocation_id: id })}
                        >
                          <SelectTrigger className="w-48"><SelectValue placeholder="Pilih dana…" /></SelectTrigger>
                          <SelectContent>
                            {(summary?.items ?? []).map((item) => (
                              <SelectItem key={item.allocation_id} value={item.allocation_id}>
                                {item.name} (tersimpan {formatAmount(item.amount)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select
                          value={row.allocation_id || undefined}
                          onValueChange={(id) => update(index, { allocation_id: id })}
                        >
                          <SelectTrigger className="w-48"><SelectValue placeholder="Pilih alokasi…" /></SelectTrigger>
                          <SelectContent>
                            {allocations.map((a: Allocation) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {row.action === 'release' &&
                        (summary?.items ?? []).length === 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Akun ini belum punya alokasi tersimpan.
                          </p>
                        )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-32"
                          value={row.amount}
                          onChange={(e) => update(index, { amount: e.target.value })}
                        />
                        {row.allocation_id && (
                          <span className={`text-xs ${overLimit ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                            {row.action === 'release'
                              ? `Maks. kurangi: ${formatAmount(reservedItem?.amount)}`
                              : `Bisa sisihkan hingga ${formatAmount(summary?.available)}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Hapus penyesuaian"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {allocationsFetch.error != null && <ErrorBox error={allocationsFetch.error} />}
    </div>
  )
}
