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
import type { Goal, GoalStatus } from '../../lib/types'

export const Route = createFileRoute('/goals/')({
  component: GoalsPage,
})

function formatAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  return Number.isNaN(n) ? String(value) : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function renderStatusBadge(status: GoalStatus) {
  switch (status) {
    case 'active':
      return <Badge variant="default">Active</Badge>
    case 'achieved':
      return <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">Achieved</Badge>
    case 'paused':
      return <Badge variant="secondary">Paused</Badge>
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function GoalsPage() {
  const navigate = useNavigate()
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [confirmDelete, setConfirmDelete] = React.useState<Goal | null>(null)
  const [actionError, setActionError] = React.useState<unknown>(null)

  const { data, error, loading, reload } = useFetch(
    () =>
      api.listGoals({
        page,
        per_page: 15,
        search: debouncedSearch || undefined,
      }),
    [page, debouncedSearch],
  )

  const handleDelete = async (goal: Goal) => {
    setActionError(null)
    try {
      await api.deleteGoal(goal.id)
      await reload()
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  return (
    <RequireAuth>
      <PageHeader
        title="Financial Goals"
        subtitle="Long-term savings targets and wishlists — accumulated via asset-to-asset transfers without inflating expenses"
        actions={
          <Link to="/goals/new">
            <Button>New goal</Button>
          </Link>
        }
      />

      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}

      <Card className="mb-4 p-4">
        <Field label="Search name">
          <Input
            placeholder="Search goals…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </Field>
      </Card>

      <Card>
        {loading && !data && <LoadingBox label="Loading goals…" />}
        {data && (
          <>
            {data.data.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No goals yet.{' '}
                <Link to="/goals/new" className="font-medium text-primary hover:underline">
                  Create your first goal
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Name</Th>
                    <Th>Target</Th>
                    <Th>Accumulated</Th>
                    <Th>Remaining</Th>
                    <Th>Plan / Cycle</Th>
                    <Th>Target Date</Th>
                    <Th>Progress</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((goal) => {
                    const percent = Math.min(100, Math.max(0, goal.progress_percent ?? 0))
                    return (
                      <TableRow
                        key={goal.id}
                        className="cursor-pointer"
                        onClick={(e) => {
                          const target = e.target as HTMLElement
                          if (target.closest('a, button')) return
                          navigate({ to: '/goals/$goalId', params: { goalId: goal.id } })
                        }}
                      >
                        <Td>
                          <Link
                            to="/goals/$goalId"
                            params={{ goalId: goal.id }}
                            className="font-medium text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {goal.name}
                          </Link>
                          {goal.description && (
                            <p className="mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground">
                              {goal.description}
                            </p>
                          )}
                        </Td>
                        <Td className="font-semibold">{formatAmount(goal.target_amount)}</Td>
                        <Td className="font-medium text-foreground">{formatAmount(goal.current_amount)}</Td>
                        <Td className="font-medium text-primary">{formatAmount(goal.remaining_amount)}</Td>
                        <Td className="text-sm">
                          {goal.recurring_contribution_amount ? (
                            <span>
                              {formatAmount(goal.recurring_contribution_amount)}
                              <span className="text-xs text-muted-foreground"> / {goal.contribution_frequency}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Td>
                        <Td className="text-sm">{goal.target_date || '—'}</Td>
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
                        <Td>{renderStatusBadge(goal.status)}</Td>
                        <Td className="text-right">
                          <div className="flex justify-end gap-3">
                            <Link
                              to="/goals/$goalId"
                              params={{ goalId: goal.id }}
                              className="text-sm text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Open
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setConfirmDelete(goal)
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
        title="Delete goal"
        description={
          confirmDelete
            ? `Delete goal "${confirmDelete.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </RequireAuth>
  )
}
