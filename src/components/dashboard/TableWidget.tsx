import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import type { WidgetConfig } from '../../lib/dashboardSchema'

export function TableWidget({ widget }: { widget: WidgetConfig & { viz: 'table' } }) {
  const { dataSource, filters, per_page } = widget.vizConfig

  const budgets = useFetch(
    () => (dataSource === 'budgets' ? api.listBudgets({ per_page: per_page ?? 5, search: filters.search || undefined, period: filters.period || undefined, budget_type: filters.budget_type || undefined }) : Promise.resolve(null as any)),
    [dataSource, per_page, JSON.stringify(filters)],
  )
  const accounts = useFetch(
    () => (dataSource === 'accounts' ? api.listAccounts({ per_page: per_page ?? 5, search: filters.search || undefined, type: filters.type || undefined }) : Promise.resolve(null as any)),
    [dataSource, per_page, JSON.stringify(filters)],
  )
  const journals = useFetch(
    () => (dataSource === 'journals' ? api.listJournals({ per_page: per_page ?? 5 }) : Promise.resolve(null as any)),
    [dataSource, per_page],
  )

  const loading = budgets.loading || accounts.loading || journals.loading
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>

  if (dataSource === 'budgets' && budgets.data) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">Name</th><th className="py-1">Amount</th><th className="py-1">Type</th></tr></thead>
          <tbody>
            {budgets.data.data.map((b: any) => (
              <tr key={b.id} className="border-t"><td className="py-1.5">{b.name}</td><td className="py-1.5">{Number(b.amount).toLocaleString()}</td><td className="py-1.5 text-xs">{b.budget_type === null ? 'Semua akun' : b.budget_type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td></tr>
            ))}
          </tbody>
        </table>
        {budgets.data.data.length === 0 && <p className="py-2 text-xs text-muted-foreground">No data.</p>}
      </div>
    )
  }
  if (dataSource === 'accounts' && accounts.data) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">Code</th><th className="py-1">Name</th><th className="py-1">Type</th></tr></thead>
          <tbody>
            {accounts.data.data.map((a: any) => (
              <tr key={a.id} className="border-t"><td className="py-1.5">{a.code}</td><td className="py-1.5">{a.name}</td><td className="py-1.5 text-xs">{a.type}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (dataSource === 'journals' && journals.data) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">Reference</th><th className="py-1">Status</th><th className="py-1">Date</th></tr></thead>
          <tbody>
            {journals.data.data.map((j: any) => (
              <tr key={j.id} className="border-t"><td className="py-1.5">{j.reference}</td><td className="py-1.5 text-xs">{j.status}</td><td className="py-1.5 text-xs">{j.transaction_date?.slice(0,10)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return <p className="text-xs text-muted-foreground">Table source "{dataSource}" — fase 1 akan tambah konfigurasi kolom.</p>
}
