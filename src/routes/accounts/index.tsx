import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { RequireAuth } from '../../components/RequireAuth'
import { Pagination } from '../../components/Pagination'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  Td,
  Th,
} from '../../components/ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip'
import { ACCOUNT_TYPES } from '../../components/AccountForm'
import { cn } from '../../lib/utils'
import { ChevronRight, Minus } from 'lucide-react'
import type { Account } from '../../lib/types'

function formatAmount(value: string | null | undefined): string {
  if (!value) return '—'
  const n = Number(value)
  return Number.isNaN(n) ? value : n.toLocaleString()
}

function balanceColor(side: Account['balance_side'], hasBalance: boolean): string {
  if (!hasBalance) return 'text-muted-foreground'
  return side === 'credit'
    ? 'text-destructive'
    : 'text-emerald-600 dark:text-emerald-400'
}

function SkeletonTable({ rows = 3 }: { rows?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <Th>Code</Th>
          <Th>Name</Th>
          <Th>Type</Th>
          <Th>Currency</Th>
          <Th>Status</Th>
          <Th>Balance</Th>
          <Th className="text-right">Actions</Th>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            <Td><Skeleton className="h-4 w-12" /></Td>
            <Td><Skeleton className="h-4 w-32" /></Td>
            <Td><Skeleton className="h-4 w-16" /></Td>
            <Td><Skeleton className="h-4 w-10" /></Td>
            <Td><Skeleton className="h-4 w-16" /></Td>
            <Td><Skeleton className="h-4 w-16" /></Td>
            <Td className="text-right">
              <div className="flex justify-end gap-3">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-10" />
              </div>
            </Td>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export const Route = createFileRoute('/accounts/')({
  component: AccountsPage,
})

function AccountsPage() {
  const navigate = useNavigate()
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [type, setType] = React.useState('')
  const [currency, setCurrency] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [confirmAccount, setConfirmAccount] = React.useState<Account | null>(
    null,
  )
  const [actionError, setActionError] = React.useState<unknown>(null)

  const { data, error, loading, reload } = useFetch(
    () =>
      api.listAccounts({
        page,
        per_page: 15,
        search: debouncedSearch || undefined,
        type: type || undefined,
        currency: currency || undefined,
        status: status || undefined,
      }),
    [page, debouncedSearch, type, currency, status],
  )

  const setFilter = (
    name: 'search' | 'type' | 'currency' | 'status',
    value: string,
  ) => {
    if (name === 'search') setSearch(value)
    if (name === 'type') setType(value)
    if (name === 'currency') setCurrency(value)
    if (name === 'status') setStatus(value)
    setPage(1)
  }

  const resetFilters = () => {
    setSearch('')
    setType('')
    setCurrency('')
    setStatus('')
    setPage(1)
  }

  const handleDelete = async (account: Account) => {
    setActionError(null)
    try {
      await api.deleteAccount(account.id)
      await reload()
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  return (
    <RequireAuth>
      <PageHeader
        title="Accounts"
        subtitle="Chart of accounts"
        actions={
          <Link to="/accounts/new">
            <Button>New account</Button>
          </Link>
        }
      />

      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <Field label="Search name">
            <Input
              placeholder="Search accounts…"
              value={search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </Field>
          <Field label="Type">
            <Select
              value={type || undefined}
              onValueChange={(value) => setFilter('type', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Currency">
            <Input
              placeholder="e.g. IDR"
              maxLength={3}
              value={currency}
              onChange={(e) => setFilter('currency', e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Status">
            <Select
              value={status || undefined}
              onValueChange={(value) => setFilter('status', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="inactive">inactive</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button variant="secondary" className="w-full" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        {loading && !data && (
          <SkeletonTable rows={3} />
        )}
        {data && (
          <>
            {data.data.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No accounts yet.{' '}
                <Link to="/accounts/new" className="font-medium text-primary hover:underline">
                  Create your first account
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Code</Th>
                    <Th>Name</Th>
                    <Th>Type</Th>
                    <Th>Currency</Th>
                    <Th>Status</Th>
                    <Th>Balance</Th>
                    <Th className="text-right">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((account) => (
                    <TableRow
                      key={account.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement
                        if (target.closest('a, button')) return
                        navigate({ to: '/accounts/$accountId', params: { accountId: account.id } })
                      }}
                    >
                      <Td>{account.code}</Td>
                      <Td>
                        <div className="flex items-center">
                          {account.depth > 0 && (
                            <div className="flex items-center mr-2">
                              {Array.from({ length: account.depth }).map((_, i) => (
                                <div
                                  key={i}
                                  className="flex items-center"
                                >
                                  <div className="w-4 h-px bg-border mr-1" />
                                  {i === account.depth - 1 && (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mr-1" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <Link
                            to="/accounts/$accountId"
                            params={{ accountId: account.id }}
                            className="font-medium text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {account.name}
                          </Link>
                        </div>
                      </Td>
                      <Td><Badge value={account.type} /></Td>
                      <Td>{account.currency}</Td>
                      <Td><Badge value={account.status} /></Td>
                      <Td className="font-medium">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                balanceColor(
                                  account.balance_side,
                                  !!account.balance,
                                ),
                              )}
                            >
                              {formatAmount(account.balance)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent align="start" side="top" className="space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Debit</span>
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {formatAmount(account.total_debit)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Credit</span>
                              <span className="text-destructive">
                                {formatAmount(account.total_credit)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 font-semibold">
                              <span className="text-muted-foreground">Balance</span>
                              <span className={balanceColor(account.balance_side, !!account.balance)}>
                                {formatAmount(account.balance)} {account.balance_side ?? ''}
                              </span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-3">
                          <Link
                            to="/accounts/$accountId"
                            params={{ accountId: account.id }}
                            className="text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmAccount(account)
                            }}
                            className="text-sm text-destructive hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="border-t border-border px-4 py-3">
              <Pagination
                page={data.current_page}
                lastPage={data.last_page}
                total={data.total}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirmAccount !== null}
        onOpenChange={(open) => !open && setConfirmAccount(null)}
        title="Delete account"
        description={
          confirmAccount
            ? `Delete account "${confirmAccount.code} — ${confirmAccount.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => confirmAccount && handleDelete(confirmAccount)}
      />
    </RequireAuth>
  )
}