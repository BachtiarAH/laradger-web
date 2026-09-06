import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { RequireAuth } from '../../components/RequireAuth'
import { Pagination } from '../../components/Pagination'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Badge } from '../../components/ui/badge'
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  LoadingBox,
  PageHeader,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  Td,
  Th,
} from '../../components/ui'
import type { Allocation, AllocationStatus } from '../../lib/types'

export const Route = createFileRoute('/allocations/')({
  component: AllocationsPage,
})

function formatAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  return Number.isNaN(n) ? String(value) : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function renderStatusBadge(status: AllocationStatus) {
  switch (status) {
    case 'active':
      return <Badge variant="default">Active</Badge>
    case 'upcoming':
      return <Badge variant="secondary">Upcoming</Badge>
    case 'fulfilled':
    case 'completed':
      return <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">Fulfilled</Badge>
    case 'skipped':
    case 'expired':
      return <Badge variant="secondary">Expired</Badge>
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function AllocationsPage() {
  const navigate = useNavigate()
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [confirmDelete, setConfirmDelete] = React.useState<Allocation | null>(null)
  const [actionError, setActionError] = React.useState<unknown>(null)

  const { data, error, loading, reload } = useFetch(
    () =>
      api.listAllocations({
        page,
        per_page: 15,
        search: debouncedSearch || undefined,
      }),
    [page, debouncedSearch],
  )

  const handleDelete = async (allocation: Allocation) => {
    setActionError(null)
    try {
      await api.deleteAllocation(allocation.id)
      await reload()
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  return (
    <RequireAuth>
      <PageHeader
        title="Allocations"
        subtitle="Financial planning envelopes — realized automatically from expenses across any asset account"
        actions={
          <Link to="/allocations/new">
            <Button>New allocation</Button>
          </Link>
        }
      />

      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}

      <Card className="mb-4 p-4">
        <Field label="Search name">
          <Input
            placeholder="Search allocations…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </Field>
      </Card>

      <Card>
        {loading && !data && <LoadingBox label="Loading allocations…" />}
        {data && (
          <>
            {data.data.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No allocations yet.{' '}
                <Link to="/allocations/new" className="font-medium text-primary hover:underline">
                  Create your first allocation
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Name</Th>
                    <Th>Plan Type</Th>
                    <Th>Planned / Target</Th>
                    <Th>Realized / Used</Th>
                    <Th>Remaining</Th>
                    <Th>Progress</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((allocation) => {
                    const percent = Math.min(100, Math.max(0, allocation.progress_percent ?? 0))
                    return (
                      <TableRow
                        key={allocation.id}
                        className="cursor-pointer"
                        onClick={(e) => {
                          const target = e.target as HTMLElement
                          if (target.closest('a, button')) return
                          navigate({ to: '/allocations/$allocationId', params: { allocationId: allocation.id } })
                        }}
                      >
                        <Td>
                          <Link
                            to="/allocations/$allocationId"
                            params={{ allocationId: allocation.id }}
                            className="font-medium text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {allocation.name}
                          </Link>
                          {allocation.description && (
                            <p className="mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground">
                              {allocation.description}
                            </p>
                          )}
                        </Td>
                        <Td className="text-sm">
                          <span className="capitalize">{allocation.type ?? 'recurring'}</span>
                          {allocation.type !== 'one_time' && allocation.period_type && (
                            <span className="text-xs text-muted-foreground"> ({allocation.period_type})</span>
                          )}
                        </Td>
                        <Td className="font-medium">{formatAmount(allocation.target_amount)}</Td>
                        <Td className="text-foreground">
                          <div>{formatAmount(allocation.realized_amount ?? '0.00')}</div>
                          {Number(allocation.manual_realized_amount ?? 0) > 0 && (
                            <div className="text-[11px] text-muted-foreground">
                              (Manual: {formatAmount(allocation.manual_realized_amount)})
                            </div>
                          )}
                        </Td>
                        <Td className="font-medium text-primary">{formatAmount(allocation.remaining_amount ?? allocation.target_amount)}</Td>
                        <Td>
                          <div className="w-24">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>{percent}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                              <div
                                className={`h-full rounded-full ${percent >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </Td>
                        <Td>{renderStatusBadge(allocation.status)}</Td>
                        <Td className="text-right">
                          <div className="flex justify-end gap-3">
                            <Link
                              to="/allocations/$allocationId"
                              params={{ allocationId: allocation.id }}
                              className="text-sm text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Open
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setConfirmDelete(allocation)
                              }}
                              className="text-sm text-destructive hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </Td>
                      </TableRow>
                    )
                  })}
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
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete allocation"
        description={
          confirmDelete
            ? `Delete allocation "${confirmDelete.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </RequireAuth>
  )
}
