import * as React from 'react'
import { CalendarRange, PieChart, RotateCcw } from 'lucide-react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../lib/auth'
import { useMoney } from '../../lib/money'
import { AccountSelect } from '../AccountSelect'
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  Td,
  Th,
} from '../ui'
import type { JournalLine } from '../../lib/types'

type RangePreset = 'this_month' | 'last_month' | 'last_3_months' | 'all'

const rangePresets: { value: RangePreset; label: string }[] = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'all', label: 'All time' },
]

const TOP_N = 10

function toDateInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function presetRange(preset: RangePreset): { from: string; to: string } {
  const now = new Date()

  switch (preset) {
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: toDateInput(start), to: toDateInput(end) }
    }
    case 'last_3_months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      return { from: toDateInput(start), to: toDateInput(now) }
    }
    case 'all':
      return { from: '', to: '' }
    case 'this_month':
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: toDateInput(start), to: toDateInput(now) }
    }
  }
}

type AccountSummary = {
  accountId: string
  accountName: string
  accountCode: string
  total: number
  percentage: number
  isOther?: boolean
}

const CHART_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4',
]

const OTHER_COLOR = '#9ca3af'

function ExpenseDonut({ data }: { data: AccountSummary[] }) {
  const [hovered, setHovered] = React.useState<string | null>(null)
  const { compactIdr, hidden } = useMoney()

  const size = 180
  const stroke = 28
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const total = data.reduce((sum, d) => sum + d.total, 0)

  if (total <= 0) {
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Expense breakdown">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted-foreground) / 0.25)"
            strokeWidth={stroke}
          />
        </svg>
        <p className="mt-2 text-xs text-muted-foreground">No data yet</p>
      </div>
    )
  }

  const gap = 3
  let offset = 0

  const centerItem = data.find((d) => d.accountId === hovered)
  const centerValue = centerItem ? centerItem.total : total
  const centerLabel = centerItem ? centerItem.accountName : 'Total'

  const getColor = (item: AccountSummary, i: number) =>
    item.isOther ? OTHER_COLOR : CHART_COLORS[i % CHART_COLORS.length]

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Expense breakdown by account" className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((item, i) => {
            const sliceLen = hidden ? 0 : (item.total / total) * circumference
            const color = getColor(item, i)
            const currentOffset = offset
            offset += sliceLen

            if (sliceLen <= 0) return null

            return (
              <circle
                key={item.accountId}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={hovered === null || hovered === item.accountId ? stroke : stroke - 8}
                strokeDasharray={`${Math.max(sliceLen - gap, 0)} ${circumference}`}
                strokeDashoffset={-currentOffset}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHovered(item.accountId)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(item.accountId)}
                onBlur={() => setHovered(null)}
              />
            )
          })}
        </g>
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          className="fill-foreground text-lg font-extrabold"
        >
          {compactIdr(centerValue)}
        </text>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          className="fill-muted-foreground text-[11px] opacity-80"
        >
          {centerLabel}
        </text>
      </svg>

      <div className="flex w-full flex-col gap-1.5">
        {data.map((item, i) => (
          <button
            key={item.accountId}
            type="button"
            className="flex cursor-pointer items-center gap-2 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
            onMouseEnter={() => setHovered(item.accountId)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(item.accountId)}
            onBlur={() => setHovered(null)}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getColor(item, i) }}
            />
            <span className="min-w-0 flex-1 truncate">{item.accountName}</span>
            <span className="shrink-0 font-medium text-foreground">{item.percentage.toFixed(1)}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ExpenseListCard() {
  const { token, tenant } = useAuth()
  const { idr } = useMoney()

  const [from, setFrom] = React.useState(() => presetRange('this_month').from)
  const [to, setTo] = React.useState(() => presetRange('this_month').to)
  const [accountId, setAccountId] = React.useState('')
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebounce(search, 300)

  const shouldFetch = !!token && !!tenant

  const { data, error, loading } = useFetch(
    () =>
      shouldFetch
        ? api.listExpenses({
            per_page: 1000,
            from: from || undefined,
            to: to || undefined,
            account_id: accountId || undefined,
            search: debouncedSearch || undefined,
            sort_by: 'debit',
            sort_direction: 'desc',
          })
        : Promise.resolve({ data: [], current_page: 1, last_page: 1, total: 0 }),
    [shouldFetch, from, to, accountId, debouncedSearch],
  )

  const lines: JournalLine[] = data?.data ?? []

  const summary = React.useMemo(() => {
    const grouped = new Map<string, AccountSummary>()

    for (const line of lines) {
      const acc = line.account
      if (!acc) continue

      const existing = grouped.get(acc.id)
      const debit = Number(line.debit ?? 0)

      if (existing) {
        existing.total += debit
      } else {
        grouped.set(acc.id, {
          accountId: acc.id,
          accountName: acc.name,
          accountCode: acc.code,
          total: debit,
          percentage: 0,
        })
      }
    }

    const total = Array.from(grouped.values()).reduce((sum, item) => sum + item.total, 0)

    const sorted = Array.from(grouped.values())
      .map((item) => ({
        ...item,
        percentage: total > 0 ? (item.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    // Top N + Other
    const topItems = sorted.slice(0, TOP_N)
    const otherItems = sorted.slice(TOP_N)

    let chartData: AccountSummary[]
    if (otherItems.length > 0) {
      const otherTotal = otherItems.reduce((sum, item) => sum + item.total, 0)
      chartData = [
        ...topItems,
        {
          accountId: '__other__',
          accountName: `Other (${otherItems.length} account${otherItems.length === 1 ? '' : 's'})`,
          accountCode: '',
          total: otherTotal,
          percentage: total > 0 ? (otherTotal / total) * 100 : 0,
          isOther: true,
        },
      ]
    } else {
      chartData = topItems
    }

    return { items: chartData, total, fullCount: sorted.length }
  }, [lines])

  const applyPreset = (preset: RangePreset) => {
    const range = presetRange(preset)
    setFrom(range.from)
    setTo(range.to)
  }

  const activePreset = rangePresets.find((preset) => {
    const range = presetRange(preset.value)
    return range.from === from && range.to === to
  })

  const hasFilters = activePreset?.value !== 'this_month' || !!accountId || !!search

  const resetFilters = () => {
    setSearch('')
    setAccountId('')
    applyPreset('this_month')
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <PieChart className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">Expense Summary</h2>
            <p className="text-xs text-muted-foreground">
              {data ? (
                <>
                  <span className="font-semibold text-foreground">{idr(summary.total)}</span>
                  {` across ${summary.fullCount} account${summary.fullCount === 1 ? '' : 's'}`}
                </>
              ) : (
                'Grouped by expense account'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {rangePresets.map((preset) => (
            <Button
              key={preset.value}
              variant={activePreset?.value === preset.value ? 'primary' : 'secondary'}
              onClick={() => applyPreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-border px-6 py-4 sm:grid-cols-3">
        <Field label="From">
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="To">
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
        <Field label="Account">
          <AccountSelect
            value={accountId || null}
            onValueChange={(value) => setAccountId(value ?? '')}
            type="expense"
            leafOnly
            allowNone
            noneLabel="All expense accounts"
            placeholder="All expense accounts"
          />
        </Field>
      </div>

      {error != null && (
        <div className="px-6 py-4">
          <ErrorBox error={error} />
        </div>
      )}

      {loading && summary.items.length === 0 && (
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      )}

      {!loading && summary.items.length === 0 && error == null && (
        <p className="px-6 py-5 text-sm text-muted-foreground">
          {hasFilters ? (
            <>
              No expenses in this range.{' '}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={resetFilters}
              >
                Reset filters
              </button>
              .
            </>
          ) : (
            'No expense transactions yet.'
          )}
        </p>
      )}

      {summary.items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[auto_minmax(0,1fr)]">
            <div className="flex items-center justify-center">
              <ExpenseDonut data={summary.items} />
            </div>

            <div className="min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Account</Th>
                    <Th className="text-right">Amount</Th>
                    <Th className="text-right">%</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.items.map((item) => (
                    <TableRow key={item.accountId}>
                      <Td className="max-w-[16rem] truncate">
                        {item.isOther ? (
                          <span className="italic text-muted-foreground">{item.accountName}</span>
                        ) : (
                          <>
                            <span className="font-medium">{item.accountCode}</span>
                            <span className="text-muted-foreground"> — {item.accountName}</span>
                          </>
                        )}
                      </Td>
                      <Td className="text-right font-medium text-red-600 dark:text-red-400">
                        {idr(item.total)}
                      </Td>
                      <Td className="text-right text-muted-foreground">
                        {item.percentage.toFixed(1)}%
                      </Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CalendarRange className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="text-xs text-muted-foreground">
                {from || to ? `${from || '…'} → ${to || '…'}` : 'All dates'}
              </span>
            </div>
            {hasFilters && (
              <Button variant="secondary" onClick={resetFilters}>
                <RotateCcw className="size-4" aria-hidden />
                Reset filters
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  )
}
