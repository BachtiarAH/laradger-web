import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import { Pagination } from '../../components/Pagination'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  LoadingBox,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  Td,
  Th,
} from '../../components/ui'
import type { Budget } from '../../lib/types'

export const Route = createFileRoute('/budgets/')({
  component: BudgetsPage,
})

function formatAmount(value: string | null | undefined): string {
  if (!value) return '—'
  const n = Number(value)
  return Number.isNaN(n) ? value : n.toLocaleString()
}

function BudgetsPage() {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [startsAt, setStartsAt] = React.useState('')
  const [endsAt, setEndsAt] = React.useState('')
  const [tagId, setTagId] = React.useState('')
  const [accountId, setAccountId] = React.useState('')
  const [confirmBudget, setConfirmBudget] = React.useState<Budget | null>(null)
  const [actionError, setActionError] = React.useState<unknown>(null)

  const { data, error, loading, reload } = useFetch(
    () =>
      api.listBudgets({
        page,
        per_page: 15,
        search: search || undefined,
        starts_at: startsAt || undefined,
        ends_at: endsAt || undefined,
        tag_id: tagId || undefined,
        account_id: accountId || undefined,
      }),
    [page, search, startsAt, endsAt, tagId, accountId],
  )

  const accounts = useFetch(() => api.listAccounts({ per_page: 100 }), [])
  const tags = useFetch(() => api.listTags({ per_page: 100 }), [])

  const setFilter = (
    name: 'search' | 'starts_at' | 'ends_at' | 'tag_id' | 'account_id',
    value: string,
  ) => {
    if (name === 'search') setSearch(value)
    if (name === 'starts_at') setStartsAt(value)
    if (name === 'ends_at') setEndsAt(value)
    if (name === 'tag_id') setTagId(value)
    if (name === 'account_id') setAccountId(value)
    setPage(1)
  }

  const resetFilters = () => {
    setSearch('')
    setStartsAt('')
    setEndsAt('')
    setTagId('')
    setAccountId('')
    setPage(1)
  }

  const handleDelete = async (budget: Budget) => {
    setActionError(null)
    try {
      await api.deleteBudget(budget.id)
      await reload()
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  return (
    <RequireAuth>
      <PageHeader
        title="Budgets"
        subtitle="Spending budgets linked to accounts and tags"
        actions={
          <Link to="/budgets/new">
            <Button>New budget</Button>
          </Link>
        }
      />

      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <Field label="Search name">
            <Input
              placeholder="Search budgets…"
              value={search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </Field>
          <Field label="Starts after">
            <Input
              type="date"
              value={startsAt}
              onChange={(e) => setFilter('starts_at', e.target.value)}
            />
          </Field>
          <Field label="Ends before">
            <Input
              type="date"
              value={endsAt}
              onChange={(e) => setFilter('ends_at', e.target.value)}
            />
          </Field>
          <Field label="Tag">
            <Select
              value={tagId || undefined}
              onValueChange={(value) => setFilter('tag_id', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent>
                {(tags.data?.data ?? []).map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Account">
            <Select
              value={accountId || undefined}
              onValueChange={(value) => setFilter('account_id', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                {(accounts.data?.data ?? []).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} — {account.name}
                  </SelectItem>
                ))}
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
        {loading && <LoadingBox label="Loading budgets…" />}
        {!loading && data && (
          <>
            {data.data.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No budgets yet.{' '}
                <Link to="/budgets/new" className="font-medium text-primary hover:underline">
                  Create your first budget
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Name</Th>
                    <Th>Amount</Th>
                    <Th>Period</Th>
                    <Th>Accounts</Th>
                    <Th>Tags</Th>
                    <Th className="text-right">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((budget) => (
                    <TableRow key={budget.id}>
                      <Td>
                        <Link
                          to="/budgets/$budgetId"
                          params={{ budgetId: budget.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {budget.name}
                        </Link>
                      </Td>
                      <Td>{formatAmount(budget.amount)}</Td>
                      <Td>
                        {new Date(budget.starts_at).toLocaleDateString()} —{' '}
                        {new Date(budget.ends_at).toLocaleDateString()}
                      </Td>
                      <Td>{(budget.accounts?.length ?? 0) || '—'}</Td>
                      <Td>{(budget.tags?.length ?? 0) || '—'}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-3">
                          <Link
                            to="/budgets/$budgetId"
                            params={{ budgetId: budget.id }}
                            className="text-sm text-primary hover:underline"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => setConfirmBudget(budget)}
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
        open={confirmBudget !== null}
        onOpenChange={(open) => !open && setConfirmBudget(null)}
        title="Delete budget"
        description={
          confirmBudget
            ? `Delete budget "${confirmBudget.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => confirmBudget && handleDelete(confirmBudget)}
      />
    </RequireAuth>
  )
}