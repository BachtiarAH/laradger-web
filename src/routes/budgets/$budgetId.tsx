import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { ApiError, api } from '../../lib/api'
import { BudgetForm } from '../../components/BudgetForm'
import { RequireAuth } from '../../components/RequireAuth'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { NotFound } from '../../components/NotFound'
import {
  Button,
  Card,
  ErrorBox,
  LoadingBox,
  PageHeader,
} from '../../components/ui'
import { useFetch } from '../../lib/useFetch'

export const Route = createFileRoute('/budgets/$budgetId')({
  component: BudgetDetailPage,
})

function formatAmount(value: string | null | undefined): string {
  if (!value) return '—'
  const n = Number(value)
  return Number.isNaN(n) ? value : n.toLocaleString()
}

function BudgetDetailPage() {
  const { budgetId } = Route.useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [actionError, setActionError] = React.useState<unknown>(null)

  const { data, error, loading, reload } = useFetch(
    () => api.getBudget(budgetId),
    [budgetId],
  )
  const budget = data?.data
  const isNotFound = error instanceof ApiError && error.status === 404

  const handleSubmit = async (payload: Parameters<typeof api.updateBudget>[1]) => {
    setSaving(true)
    setActionError(null)
    try {
      await api.updateBudget(budgetId, payload)
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
      await api.deleteBudget(budgetId)
      navigate({ to: '/budgets' })
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  if (isNotFound) {
    return (
      <RequireAuth>
        <NotFound
          title="Budget not found"
          description={`No budget found with ID “${budgetId}”. It may have been deleted or does not exist.`}
          backTo="/budgets"
          backLabel="Back to budgets"
        />
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <PageHeader
        title={budget ? budget.name : 'Budget'}
        subtitle={budget ? `Budget ${budget.id}` : undefined}
        actions={
          budget && (
            <>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <Button variant="secondary" onClick={() => navigate({ to: '/budgets' })}>
                Back
              </Button>
            </>
          )
        }
      />

      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {error != null && !isNotFound && <div className="mb-4"><ErrorBox error={error} /></div>}
      {loading && <Card className="p-4"><LoadingBox label="Loading budget…" /></Card>}

      {budget && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Details
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="mt-1 text-xl font-bold text-foreground">
                  {formatAmount(budget.amount)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Period</dt>
                <dd className="mt-1">
                  {new Date(budget.starts_at).toLocaleDateString()} —{' '}
                  {new Date(budget.ends_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tipe</dt>
                <dd className="mt-1">{budget.period_type === 'monthly' ? 'Bulanan' : 'Custom'}{budget.is_recurring ? ' • Otomatis' : ''}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Description</dt>
                <dd className="mt-1">{budget.description || '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Accounts</dt>
                <dd className="mt-1">
                  {(budget.accounts ?? []).length > 0
                    ? budget.accounts
                        ?.map((a) => `${a.code} — ${a.name}`)
                        .join(', ')
                    : '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Tags</dt>
                <dd className="mt-1">
                  {(budget.tags ?? []).length > 0
                    ? budget.tags?.map((t) => t.name).join(', ')
                    : '—'}
                </dd>
              </div>
            </dl>
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Edit
            </h2>
            <BudgetForm
              initial={budget}
              onSubmit={handleSubmit}
              submitLabel="Save changes"
              loading={saving}
            />
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete budget"
        description={
          budget ? `Delete budget "${budget.name}"? This action cannot be undone.` : ''
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </RequireAuth>
  )
}