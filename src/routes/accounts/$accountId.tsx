import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { ApiError, api } from '../../lib/api'
import { AccountForm } from '../../components/AccountForm'
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
} from '../../components/ui'
import { useFetch } from '../../lib/useFetch'

export const Route = createFileRoute('/accounts/$accountId')({
  component: AccountDetailPage,
})

function AccountDetailPage() {
  const { accountId } = Route.useParams()
  const navigate = useNavigate()
  const [saving, setSaving] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [actionError, setActionError] = React.useState<unknown>(null)

  const { data, error, loading, reload } = useFetch(
    () => api.getAccount(accountId),
    [accountId],
  )
  const account = data?.data
  const isNotFound = error instanceof ApiError && error.status === 404

  const handleSubmit = async (payload: Parameters<typeof api.updateAccount>[1]) => {
    setSaving(true)
    setActionError(null)
    try {
      await api.updateAccount(accountId, payload)
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
      await api.deleteAccount(accountId)
      navigate({ to: '/accounts' })
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  if (isNotFound) {
    return (
      <RequireAuth>
        <NotFound
          title="Account not found"
          description={`No account found with ID “${accountId}”. It may have been deleted or does not exist.`}
          backTo="/accounts"
          backLabel="Back to accounts"
        />
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <PageHeader
        title={account ? `${account.code} — ${account.name}` : 'Account'}
        subtitle={account ? `Account ${account.id}` : undefined}
        actions={
          account && (
            <>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <Button variant="secondary" onClick={() => navigate({ to: '/accounts' })}>
                Back
              </Button>
            </>
          )
        }
      />

      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {error != null && !isNotFound && <div className="mb-4"><ErrorBox error={error} /></div>}
      {loading && <Card className="p-4"><LoadingBox label="Loading account…" /></Card>}

      {account && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Details
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="mt-1"><Badge value={account.type} /></dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-1"><Badge value={account.status} /></dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Currency</dt>
                <dd>{account.currency}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Parent</dt>
                <dd>
                  {account.parent ? (
                    <span className="text-primary">
                      {account.parent.code} — {account.parent.name}
                    </span>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Children</dt>
                <dd>
                  {account.children && account.children.length > 0
                    ? account.children
                        .map((child) => `${child.code} — ${child.name}`)
                        .join(', ')
                    : '—'}
                </dd>
              </div>
            </dl>
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Edit
            </h2>
            <AccountForm
              initial={account}
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
        title="Delete account"
        description={
          account
            ? `Delete account "${account.code} — ${account.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </RequireAuth>
  )
}