import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import * as React from 'react'
import { ApiError, api } from '../../lib/api'
import { GoalForm } from '../../components/GoalForm'
import { RequireAuth } from '../../components/RequireAuth'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { NotFound } from '../../components/NotFound'
import { Badge } from '../../components/ui/badge'
import {
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

export const Route = createFileRoute('/goals/$goalId')({
  component: GoalDetailPage,
})

function formatAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  return Number.isNaN(n) ? String(value) : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function GoalDetailPage() {
  const { goalId } = Route.useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [actionError, setActionError] = React.useState<unknown>(null)

  const { data, error, loading, reload } = useFetch(
    () => api.getGoal(goalId),
    [goalId],
  )
  const journals = useFetch(
    () => api.listJournals({ goal_id: goalId, per_page: 20 }),
    [goalId],
  )
  const goal = data?.data
  const isNotFound = error instanceof ApiError && error.status === 404

  const handleSubmit = async (payload: Parameters<typeof api.updateGoal>[1]) => {
    setSaving(true)
    setActionError(null)
    try {
      await api.updateGoal(goalId, payload)
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
      await api.deleteGoal(goalId)
      navigate({ to: '/goals' })
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  if (isNotFound) {
    return (
      <RequireAuth>
        <NotFound
          title="Goal not found"
          description={`No goal found with ID “${goalId}”. It may have been deleted or does not exist.`}
          backTo="/goals"
          backLabel="Back to goals"
        />
      </RequireAuth>
    )
  }

  const percent = Math.min(100, Math.max(0, goal?.progress_percent ?? 0))

  return (
    <RequireAuth>
      <PageHeader
        title={goal ? goal.name : 'Goal'}
        subtitle={goal ? `Goal ${goal.id}` : undefined}
        actions={
          goal && (
            <>
              <Link to="/transactions/new">
                <Button>Add Transfer</Button>
              </Link>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <Button variant="secondary" onClick={() => navigate({ to: '/goals' })}>
                Back
              </Button>
            </>
          )
        }
      />

      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {error != null && !isNotFound && <div className="mb-4"><ErrorBox error={error} /></div>}
      {loading && <Card className="p-4"><LoadingBox label="Loading goal…" /></Card>}

      {goal && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Goal Overview</h2>
              <Badge variant={goal.status === 'active' ? 'default' : 'outline'}>
                {goal.status}
              </Badge>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-muted-foreground">Progress towards target</span>
                <span className="text-sm font-semibold">{percent}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${percent >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Target Amount</dt>
                <dd className="mt-1 font-bold text-foreground">{formatAmount(goal.target_amount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Accumulated Amount</dt>
                <dd className="mt-1 font-bold text-green-600 dark:text-green-400">
                  {formatAmount(goal.current_amount)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Remaining to Target</dt>
                <dd className="mt-1 font-semibold text-primary">{formatAmount(goal.remaining_amount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Target Date</dt>
                <dd className="mt-1 font-medium">{goal.target_date || 'None set'}</dd>
              </div>

              <div className="col-span-2 pt-2 border-t border-border">
                <h3 className="font-medium text-foreground mb-2">Recurring Contribution Plan</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Planned per cycle</dt>
                    <dd className="mt-0.5 font-medium">
                      {goal.recurring_contribution_amount
                        ? `${formatAmount(goal.recurring_contribution_amount)} / ${goal.contribution_frequency}`
                        : 'No recurring plan'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Contributed this period</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {formatAmount(goal.actual_contribution_this_period)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Pending commitment for Safe-to-Spend</dt>
                    <dd className="mt-0.5 font-semibold text-amber-600 dark:text-amber-400">
                      {formatAmount(goal.pending_contribution_this_period)}
                    </dd>
                  </div>
                </div>
              </div>

              {goal.description && (
                <div className="col-span-2 pt-2 border-t border-border">
                  <dt className="text-muted-foreground">Description / Notes</dt>
                  <dd className="mt-1 text-foreground">{goal.description}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Edit Goal</h2>
            <GoalForm
              initial={goal}
              onSubmit={handleSubmit}
              submitLabel="Save changes"
              loading={saving}
            />
          </Card>
        </div>

        <Card className="mt-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Contribution Transfers</h2>
              <p className="text-xs text-muted-foreground">Asset transfer journals contributing to this goal</p>
            </div>
            <Link to="/transactions/new">
              <Button variant="secondary" className="text-xs h-8">New Transfer</Button>
            </Link>
          </div>
          {journals.loading ? (
            <LoadingBox label="Loading contribution journals…" />
          ) : (journals.data?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No transfer transactions have contributed to this goal yet.
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
                    <Td><Badge variant={j.status === 'posted' ? 'default' : 'secondary'}>{j.status}</Badge></Td>
                    <Td className="text-right font-medium">{formatAmount(j.total_debit)}</Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete goal"
        description={
          goal
            ? `Delete goal "${goal.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </RequireAuth>
  )
}
