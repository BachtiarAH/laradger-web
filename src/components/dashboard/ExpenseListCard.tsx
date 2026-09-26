import { useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { CalendarRange, Receipt, RotateCcw } from 'lucide-react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../lib/auth'
import { useMoney } from '../../lib/money'
import { AccountSelect } from '../AccountSelect'
import { Pagination } from '../Pagination'
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  LoadingBox,
  SortableTableHeader,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  Td,
  Th,
} from '../ui'
import type { SortDirection } from '../ui'

type ExpenseSortColumn = 'transaction_date' | 'debit' | 'account'

const PER_PAGE = 8

function toDateInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

type RangePreset = 'this_month' | 'last_month' | 'last_3_months' | 'all'

const rangePresets: { value: RangePreset; label: string }[] = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'all', label: 'All time' },
]

/**
 * Resolve a preset into an inclusive [from, to] range. `all` clears both
 * bounds so the API falls back to "no date filter".
 */
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

function formatDay(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ExpenseListCard() {
  const navigate = useNavigate()
  const { token, tenant } = useAuth()
  const { idr } = useMoney()

  const [page, setPage] = React.useState(1)
  const [from, setFrom] = React.useState(() => presetRange('this_month').from)
  const [to, setTo] = React.useState(() => presetRange('this_month').to)
  const [accountId, setAccountId] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [sortBy, setSortBy] = React.useState<ExpenseSortColumn>('transaction_date')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc')
  const debouncedSearch = useDebounce(search, 300)

  const shouldFetch = !!token && !!tenant

  const { data, error, loading } = useFetch(
    () =>
      shouldFetch
        ? api.listExpenses({
            page,
            per_page: PER_PAGE,
            from: from || undefined,
            to: to || undefined,
            account_id: accountId || undefined,
            search: debouncedSearch || undefined,
            sort_by: sortBy,
            sort_direction: sortDirection,
          })
        : Promise.resolve({ data: [], current_page: 1, last_page: 1, total: 0 }),
    [shouldFetch, page, from, to, accountId, debouncedSearch, sortBy, sortDirection],
  )

  const lines = data?.data ?? []

  const applyPreset = (preset: RangePreset) => {
    const range = presetRange(preset)
    setFrom(range.from)
    setTo(range.to)
    setPage(1)
  }

  const activePreset = rangePresets.find((preset) => {
    const range = presetRange(preset.value)
    return range.from === from && range.to === to
  })

  // The default range (this month) is not treated as a user-applied filter, so
  // an empty default view still invites the first expense to be recorded.
  const hasFilters = activePreset?.value !== 'this_month' || !!accountId || !!search

  // `totals.lines_count` covers every page; the paginator `total` is the fallback.
  const transactionCount = data?.totals?.lines_count ?? data?.total ?? 0

  const resetFilters = () => {
    setSearch('')
    setAccountId('')
    applyPreset('this_month')
  }

  const toggleSort = (column: ExpenseSortColumn) => {
    if (sortBy === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDirection(column === 'transaction_date' || column === 'debit' ? 'desc' : 'asc')
    }
    setPage(1)
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <Receipt className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">Expenses</h2>
            <p className="text-xs text-muted-foreground">
              {data ? (
                <>
                  <span className="font-semibold text-foreground">{idr(data.totals?.expense_total)}</span>
                  {` across ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}`}
                </>
              ) : (
                'Posted expense transactions'
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

      <div className="grid grid-cols-1 gap-3 border-b border-border px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="From">
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
          />
        </Field>
        <Field label="To">
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
          />
        </Field>
        <Field label="Account">
          <AccountSelect
            value={accountId || null}
            onValueChange={(value) => {
              setAccountId(value ?? '')
              setPage(1)
            }}
            type="expense"
            leafOnly
            allowNone
            noneLabel="All expense accounts"
            placeholder="All expense accounts"
          />
        </Field>
        <Field label="Search">
          <Input
            placeholder="Search description or reference…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </Field>
      </div>

      {error != null && (
        <div className="px-6 py-4">
          <ErrorBox error={error} />
        </div>
      )}

      {loading && lines.length === 0 && <LoadingBox label="Loading expenses…" />}

      {!loading && lines.length === 0 && error == null && (
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
            <>
              No expense transactions yet.{' '}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => navigate({ to: '/transactions/new' })}
              >
                Record your first expense
              </button>
              .
            </>
          )}
        </p>
      )}

      {lines.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHeader
                  label="Date"
                  column="transaction_date"
                  activeColumn={sortBy}
                  direction={sortDirection}
                  onSort={toggleSort}
                />
                <Th>Description</Th>
                <SortableTableHeader
                  label="Account"
                  column="account"
                  activeColumn={sortBy}
                  direction={sortDirection}
                  onSort={toggleSort}
                />
                <Th>Status</Th>
                <SortableTableHeader
                  label="Amount"
                  column="debit"
                  activeColumn={sortBy}
                  direction={sortDirection}
                  onSort={toggleSort}
                  align="right"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow
                  key={line.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    const target = e.target as HTMLElement
                    if (target.closest('a, button')) return
                    navigate({ to: '/journals/$journalId', params: { journalId: line.journal_id } })
                  }}
                >
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDay(line.journal?.transaction_date)}
                  </Td>
                  <Td className="max-w-xs truncate">{line.description || line.journal?.description || '—'}</Td>
                  <Td className="max-w-[14rem] truncate">
                    {line.account ? `${line.account.code} — ${line.account.name}` : '—'}
                  </Td>
                  <Td className="text-xs text-muted-foreground">{line.journal?.status ?? '—'}</Td>
                  <Td className="text-right font-medium text-red-600 dark:text-red-400">
                    {idr(line.debit)}
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>

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

          {data && data.last_page > 1 && (
            <div className="border-t border-border px-6 py-3">
              <Pagination
                page={data.current_page}
                lastPage={data.last_page}
                total={data.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </Card>
  )
}
