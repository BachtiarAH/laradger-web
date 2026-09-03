import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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
  Table,
  TableBody,
  TableHeader,
  TableRow,
  Td,
  Th,
} from '../../components/ui'
import type { Allocation } from '../../lib/types'

export const Route = createFileRoute('/allocations/')({
  component: AllocationsPage,
})

function formatAmount(value: string | null | undefined): string {
  if (!value) return '—'
  const n = Number(value)
  return Number.isNaN(n) ? value : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function AllocationsPage() {
  const navigate = useNavigate()
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [confirmDelete, setConfirmDelete] = React.useState<Allocation | null>(null)
  const [actionError, setActionError] = React.useState<unknown>(null)

  const { data, error, loading, reload } = useFetch(
    () =>
      api.listAllocations({
        page,
        per_page: 15,
        search: search || undefined,
      }),
    [page, search],
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
        subtitle="Reserve part of an account balance for a purpose — no journal entries are created"
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
        {loading && <LoadingBox label="Loading allocations…" />}
        {!loading && data && (
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
                    <Th>Description</Th>
                    <Th>Target amount</Th>
                    <Th>Total allocated</Th>
                    <Th>Accounts</Th>
                    <Th className="text-right">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((allocation) => (
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
                      </Td>
                      <Td className="max-w-[220px] truncate">{allocation.description || '—'}</Td>
                      <Td>{formatAmount(allocation.target_amount)}</Td>
                      <Td>{formatAmount(allocation.total_allocated)}</Td>
                      <Td>{allocation.accounts?.length ?? 0}</Td>
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
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete allocation"
        description={
          confirmDelete
            ? `Delete allocation "${confirmDelete.name}"? All money reserved on accounts will be released. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </RequireAuth>
  )
}
