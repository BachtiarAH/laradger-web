import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { useAuth } from '../lib/auth'
import { Button, Card, LoadingBox, ErrorBox } from '../components/ui'
import { ArrowUpRight, ArrowDownRight, Wallet, CircleAlert, ShieldCheck, Landmark } from 'lucide-react'
import type { Overview } from '../lib/types'

type Period = 'today' | 'this_week' | 'this_month'

const periods: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hari ini' },
  { value: 'this_week', label: 'Minggu ini' },
  { value: 'this_month', label: 'Bulan ini' },
]

function formatIDR(value: string): string {
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num)
}

function StatCard({
  label,
  value,
  to,
}: {
  label: string
  value?: number
  to: string
}) {
  return (
    <Link
      to={to}
      className="block rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition hover:ring-primary"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold text-foreground">
        {value ?? '—'}
      </p>
    </Link>
  )
}

export default function OverviewPage() {
  const { token, user, tenant } = useAuth()
  const [period, setPeriod] = React.useState<Period>('this_month')

  const shouldFetch = !!token && !!tenant
  const overview = useFetch<Overview>(
    () => (shouldFetch ? api.getOverview({ period }) : Promise.resolve({
      period: 'this_month',
      date_range: { from: '', to: '' },
      income: { actual: '0.00', budgeted: '0.00' },
      expense: { actual: '0.00', budgeted: '0.00', remaining: '0.00', overspend: '0.00' },
      unbudgeted_income: '0.00',
      net_budgeted: '0.00',
      safe_money: '0.00',
      liabilities: { balance: '0.00' },
    })),
    [shouldFetch, period],
  )

  const accounts = useFetch(
    () => (shouldFetch ? api.listAccounts({ per_page: 1 }) : Promise.resolve({ data: [], current_page: 1, last_page: 1, total: 0 })),
    [shouldFetch],
  )
  const journals = useFetch(
    () => (shouldFetch ? api.listJournals({ per_page: 1 }) : Promise.resolve({ data: [], current_page: 1, last_page: 1, total: 0 })),
    [shouldFetch],
  )
  const tags = useFetch(
    () => (shouldFetch ? api.listTags({ per_page: 1 }) : Promise.resolve({ data: [], current_page: 1, last_page: 1, total: 0 })),
    [shouldFetch],
  )
  const budgets = useFetch(
    () => (shouldFetch ? api.listBudgets({ per_page: 1 }) : Promise.resolve({ data: [], current_page: 1, last_page: 1, total: 0 })),
    [shouldFetch],
  )

  if (!token) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-4xl font-bold text-foreground">
          Ledgify
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A double-entry ledger client. Log in or register to manage the chart
          of accounts, journals, and audit logs.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/login">
            <Button>Login</Button>
          </Link>
          <Link to="/register">
            <Button variant="secondary">Register</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <Card className="mx-auto max-w-lg p-6">
        <h1 className="text-lg font-bold text-foreground">
          Select organization
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You are logged in but no organization is selected. This happens when
          you open Ledgify on a new domain (localStorage is per-origin) — e.g.
          switching from workers.dev to bachtiarah.my.id.
        </p>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Financial overview for the selected period.
          </p>
        </div>
        <div className="flex gap-2">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'primary' : 'secondary'}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {(overview.loading) && (
        <Card className="p-4">
          <LoadingBox label="Loading overview…" />
        </Card>
      )}

      {(overview.error != null) && (
        <div className="mt-6">
          <ErrorBox error={overview.error} />
        </div>
      )}

      {overview.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="size-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-muted-foreground">Pemasukan (Actual)</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatIDR(overview.data.income.actual)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Budgeted: {formatIDR(overview.data.income.budgeted)}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="size-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-muted-foreground">Pengeluaran (Actual)</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
              {formatIDR(overview.data.expense.actual)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Budgeted: {formatIDR(overview.data.expense.budgeted)}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-foreground" />
              <p className="text-sm text-muted-foreground">Sisa Anggaran</p>
            </div>
            <p className={`mt-1 text-2xl font-bold ${Number(overview.data.expense.remaining) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatIDR(overview.data.expense.remaining)}
            </p>
            {Number(overview.data.expense.overspend) > 0 && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Overspend: {formatIDR(overview.data.expense.overspend)}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <CircleAlert className="size-4 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-muted-foreground">Pemasukan di Luar Anggaran</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatIDR(overview.data.unbudgeted_income)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Net dianggarkan: {formatIDR(overview.data.net_budgeted)}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-muted-foreground">Uang Dingin</p>
            </div>
            <p className={`mt-1 text-2xl font-bold ${Number(overview.data.safe_money) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatIDR(overview.data.safe_money)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pemasukan - (Budget + Overspend)
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Landmark className="size-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-muted-foreground">Jumlah Hutang</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
              {formatIDR(overview.data.liabilities.balance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total liabilitas
            </p>
          </Card>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Accounts" value={accounts.data?.total} to="/accounts" />
        <StatCard label="Journals" value={journals.data?.total} to="/journals" />
        <StatCard label="Budgets" value={budgets.data?.total} to="/budgets" />
        <StatCard label="Tags" value={tags.data?.total} to="/tags" />
      </div>
    </div>
  )
}
