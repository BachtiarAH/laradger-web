import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import * as React from 'react'
import { ApiError, api } from '../../lib/api'
import { AllocationForm } from '../../components/AllocationForm'
import { AllocationAdjustDialog } from '../../components/AllocationAdjustDialog'
import { RequireAuth } from '../../components/RequireAuth'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { NotFound } from '../../components/NotFound'
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  LoadingBox,
  PageHeader,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  Td,
  Th,
} from '../../components/ui'
import { useFetch } from '../../lib/useFetch'
import type { AllocationAccount } from '../../lib/types'

export const Route = createFileRoute('/allocations/$allocationId')({
  component: AllocationDetailPage,
})

function formatAmount(value: string | null | undefined): string {
  if (!value) return '—'
  const n = Number(value)
  return Number.isNaN(n) ? value : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function AllocationDetailPage() {
  const { allocationId } = Route.useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [actionError, setActionError] = React.useState<unknown>(null)

  const [allocateOpen, setAllocateOpen] = React.useState(false)
  const [releaseRow, setReleaseRow] = React.useState<AllocationAccount | null>(null)

  const { data, error, loading, reload } = useFetch(
    () => api.getAllocation(allocationId),
    [allocationId],
  )
  const journals = useFetch(
    () => api.listJournals({ allocation_id: allocationId, per_page: 20 }),
    [allocationId],
  )
  const allocation = data?.data
  const isNotFound = error instanceof ApiError && error.status === 404

  const handleSubmit = async (payload: Parameters<typeof api.updateAllocation>[1]) => {
    setSaving(true)
    setActionError(null)
    try {
      await api.updateAllocation(allocationId, payload)
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setActionError(null)
    try {
      await api.deleteAllocation(allocationId)
      navigate({ to: '/allocations' })
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  const handleAdjusted = async () => {
    await reload()
    setActionError(null)
  }

  if (isNotFound) {
    return (
      <RequireAuth>
        <NotFound
          title="Allocation not found"
          description={`No allocation found with ID “${allocationId}”. It may have been deleted or does not exist.`}
          backTo="/allocations"
          backLabel="Back to allocations"
        />
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <PageHeader
        title={allocation ? allocation.name : 'Allocation'}
        subtitle={allocation ? `Allocation ${allocation.id}` : undefined}
        actions={
          allocation && (
            <>
              <Button onClick={() => setAllocateOpen(true)}>Allocate money</Button>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <Button variant="secondary" onClick={() => navigate({ to: '/allocations' })}>
                Back
              </Button>
            </>
          )
        }
      />

      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {error != null && !isNotFound && <div className="mb-4"><ErrorBox error={error} /></div>}
      {loading && <Card className="p-4"><LoadingBox label="Loading allocation…" /></Card>}

      {allocation && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Planning Details</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="mt-1 font-medium text-foreground">{allocation.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Plan Type</dt>
                  <dd className="mt-1 capitalize font-medium text-foreground">
                    {allocation.type ?? 'recurring'} {allocation.period_type ? `(${allocation.period_type})` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Planned Target</dt>
                  <dd className="mt-1 font-semibold text-foreground">{formatAmount(allocation.target_amount)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Carried Over</dt>
                  <dd className="mt-1 text-foreground">{formatAmount(allocation.carry_over_amount ?? '0.00')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Realized / Spent</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {formatAmount(allocation.realized_amount ?? '0.00')}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Remaining Unspent</dt>
                  <dd className="mt-1 font-bold text-primary">
                    {formatAmount(allocation.remaining_amount ?? allocation.target_amount)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground mb-1">
                    Progress ({Math.min(100, Math.max(0, allocation.progress_percent ?? 0))}%)
                  </dt>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, allocation.progress_percent ?? 0))}%` }}
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="mt-1 capitalize">{allocation.status}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Description</dt>
                  <dd className="mt-1">{allocation.description || '—'}</dd>
                </div>
              </dl>
            </Card>
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Edit</h2>
              <AllocationForm
                initial={allocation}
                onSubmit={handleSubmit}
                submitLabel="Save changes"
                loading={saving}
              />
            </Card>
          </div>

          <Card className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">
                Reserved on accounts{' '}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({allocation.accounts?.length ?? 0})
                </span>
              </h2>
              <Button variant="secondary" onClick={() => setAllocateOpen(true)}>
                Add reservation
              </Button>
            </div>
            {(allocation.accounts ?? []).length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No money allocated yet. Allocate part of an asset account balance to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Account</Th>
                    <Th>Currency</Th>
                    <Th>Amount</Th>
                    <Th className="text-right">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(allocation.accounts ?? []).map((row) => (
                    <TableRow key={row.account_id}>
                      <Td>
                        <span className="font-medium text-foreground">{row.code} — {row.name}</span>
                      </Td>
                      <Td>{row.currency}</Td>
                      <Td>{formatAmount(row.amount)}</Td>
                      <Td className="text-right">
                        <button
                          type="button"
                          onClick={() => setReleaseRow(row)}
                          className="text-sm text-destructive hover:underline"
                        >
                          Release
                        </button>
                      </Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card className="mt-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Realization Transactions</h2>
                <p className="text-xs text-muted-foreground">Journals fulfilling this allocation envelope</p>
              </div>
              <Link to="/transactions/new">
                <Button variant="secondary" className="text-xs h-8">New Expense</Button>
              </Link>
            </div>
            {journals.loading ? (
              <LoadingBox label="Loading realization journals…" />
            ) : (journals.data?.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No transactions have fulfilled this allocation yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Reference</Th>
                    <Th>Description</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Amount</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journals.data!.data.map((j) => (
                    <TableRow key={j.id}>
                      <Td>
                        <Link
                          to="/journals/$journalId"
                          params={{ journalId: j.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {j.reference || '—'}
                        </Link>
                      </Td>
                      <Td className="max-w-xs truncate">{j.description}</Td>
                      <Td>{new Date(j.transaction_date).toLocaleDateString()}</Td>
                      <Td><Badge value={j.status} /></Td>
                      <Td className="text-right font-medium">{formatAmount(j.total_debit)}</Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}

      <AllocationAdjustDialog
        open={allocateOpen}
        onOpenChange={setAllocateOpen}
        mode="allocate"
        allocationId={allocationId}
        accountId={null}
        onSubmitted={handleAdjusted}
      />

      <AllocationAdjustDialog
        open={releaseRow !== null}
        onOpenChange={(open) => !open && setReleaseRow(null)}
        mode="release"
        allocationId={allocationId}
        accountId={releaseRow?.account_id ?? null}
        limitAmount={releaseRow?.amount ?? null}
        onSubmitted={handleAdjusted}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete allocation"
        description={
          allocation
            ? `Delete allocation "${allocation.name}"? All money reserved on accounts will be released. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </RequireAuth>
  )
}
