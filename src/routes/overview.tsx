import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { useAuth } from '../lib/auth'
import { Button, Card, LoadingBox, ErrorBox } from '../components/ui'
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react'
import type { Overview, WealthPoint } from '../lib/types'

type Period = 'today' | 'this_week' | 'this_month'

const periods: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
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

function formatCompactIDR(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  if (!year || !m) return month
  return new Date(year, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
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

function WealthDonut({ assets, liabilities }: { assets: number; liabilities: number }) {
  const [hovered, setHovered] = React.useState<'assets' | 'liabilities' | null>(null)

  const size = 168
  const stroke = 22
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const gross = Math.abs(assets) + Math.abs(liabilities)

  if (gross <= 0) {
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Assets vs liabilities">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={stroke}
          />
        </svg>
        <p className="mt-2 text-xs text-emerald-100/80">No data yet</p>
      </div>
    )
  }

  // Slices proportional to absolute amounts, with a small gap between them.
  const assetLen = (Math.abs(assets) / gross) * circumference
  const liabilityLen = (Math.abs(liabilities) / gross) * circumference
  const gap = 4

  const centerValue = hovered === 'assets' ? assets : hovered === 'liabilities' ? liabilities : assets - liabilities
  const centerLabel = hovered === 'assets' ? 'Assets' : hovered === 'liabilities' ? 'Liabilities' : 'Net Worth'

  const sliceProps = (key: 'assets' | 'liabilities', offset: number, dashArray: string, color: string) => ({
    cx: size / 2,
    cy: size / 2,
    r: radius,
    fill: 'none',
    stroke: color,
    strokeWidth: hovered === null || hovered === key ? stroke : stroke - 6,
    strokeDasharray: dashArray,
    strokeDashoffset: -offset,
    className: 'cursor-pointer transition-all duration-200',
    onMouseEnter: () => setHovered(key),
    onMouseLeave: () => setHovered(null),
    onFocus: () => setHovered(key),
    onBlur: () => setHovered(null),
  })

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Assets vs liabilities">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {assetLen > 0 && (
            <circle {...sliceProps('assets', 0, `${Math.max(assetLen - gap, 0)} ${circumference}`, '#a7f3d0')} />
          )}
          {liabilityLen > 0 && (
            <circle {...sliceProps('liabilities', Math.max(assetLen, 0), `${Math.max(liabilityLen - gap, 0)} ${circumference}`, '#fda4af')} />
          )}
        </g>
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          className="fill-white text-lg font-extrabold"
        >
          {formatCompactIDR(centerValue)}
        </text>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          className="fill-emerald-100 text-[11px] opacity-80"
        >
          {centerLabel}
        </text>
      </svg>
      <div className="mt-3 flex justify-center gap-4 text-xs text-emerald-100">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1.5"
          onMouseEnter={() => setHovered('assets')}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered('assets')}
          onBlur={() => setHovered(null)}
        >
          <span className="size-2 rounded-full bg-emerald-200" />
          Assets {formatCompactIDR(assets)}
        </button>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1.5"
          onMouseEnter={() => setHovered('liabilities')}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered('liabilities')}
          onBlur={() => setHovered(null)}
        >
          <span className="size-2 rounded-full bg-rose-300" />
          Liabilities {formatCompactIDR(liabilities)}
        </button>
      </div>
    </div>
  )
}

function WealthTrend({ history }: { history: WealthPoint[] }) {
  const values = history.map((p) => Number(p.net_worth))
  if (values.length < 2 || values.every((v) => !Number.isFinite(v))) {
    return (
      <p className="py-8 text-center text-sm text-emerald-100/70">
        Not enough data for a trend yet.
      </p>
    )
  }

  const width = 300
  const height = 96
  const padX = 6
  const padTop = 10
  const padBottom = 18

  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const span = max - min || 1
  const x = (i: number) =>
    padX + (i / (values.length - 1)) * (width - padX * 2)
  const y = (v: number) =>
    padTop + ((max - v) / span) * (height - padTop - padBottom)
  const zeroY = y(0)

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const area = `${padX},${zeroY} ${points} ${width - padX},${zeroY}`

  const isPositive = values[values.length - 1] >= values[0]

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Net worth trend over the last 6 months"
      >
        <defs>
          <linearGradient id="wealth-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? '#a7f3d0' : '#fda4af'} stopOpacity="0.5" />
            <stop offset="100%" stopColor={isPositive ? '#a7f3d0' : '#fda4af'} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line
          x1={padX}
          x2={width - padX}
          y1={zeroY}
          y2={zeroY}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />

        <polygon points={area} fill="url(#wealth-fill)" />
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? '#6ee7b7' : '#fda4af'}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {values.map((v, i) =>
          i === values.length - 1 ? (
            <circle key={i} cx={x(i)} cy={y(v)} r={4} fill="#fff" stroke={isPositive ? '#059669' : '#be123c'} strokeWidth={2} />
          ) : null,
        )}

        <text x={padX} y={height - 6} textAnchor="start" className="fill-emerald-100 text-[10px] opacity-80">
          {monthLabel(history[0].month)}
        </text>
        <text x={width - padX} y={height - 6} textAnchor="end" className="fill-emerald-100 text-[10px] opacity-80">
          {monthLabel(history[history.length - 1].month)}
        </text>
      </svg>
    </div>
  )
}

function WealthHero({ overview }: { overview: Overview }) {
  const assets = Number(overview.assets.balance)
  const liabilities = Number(overview.liabilities.balance)
  const netWorth = Number(overview.net_worth)
  const history = overview.wealth_history ?? []

  const previous = history.length > 1 ? Number(history[history.length - 2].net_worth) : null
  const delta = previous == null ? null : netWorth - previous

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 p-6 text-white shadow-lg sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-white/10 blur-2xl"
      />
      <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1fr)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">
            Net Worth
          </p>
          <p className={`mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl ${netWorth < 0 ? 'text-rose-200' : ''}`}>
            {formatIDR(overview.net_worth)}
          </p>
          {delta != null && (
            <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${delta >= 0 ? 'bg-emerald-400/25 text-emerald-50' : 'bg-rose-400/25 text-rose-100'}`}>
              {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {formatIDR(String(Math.abs(delta)))} from last month
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
              <span className="size-2 rounded-full bg-emerald-200" />
              Assets {formatIDR(overview.assets.balance)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
              <span className="size-2 rounded-full bg-rose-300" />
              Liabilities {formatIDR(overview.liabilities.balance)}
            </span>
          </div>
        </div>

        <WealthDonut assets={assets} liabilities={liabilities} />

        <div className="lg:pl-4">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-100">
            <TrendingUp className="size-4" />
            6-Month Trend
          </p>
          <div className="mt-3">
            <WealthTrend history={history} />
          </div>
        </div>
      </div>
    </div>
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
      assets: { balance: '0.00' },
      liabilities: { balance: '0.00' },
      net_worth: '0.00',
      wealth_history: [],
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
        <div className="space-y-6">
          <WealthHero overview={overview.data} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="size-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm text-muted-foreground">Income (Actual)</p>
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
                <p className="text-sm text-muted-foreground">Expenses (Actual)</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                {formatIDR(overview.data.expense.actual)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Budgeted: {formatIDR(overview.data.expense.budgeted)}
              </p>
            </Card>
          </div>
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
