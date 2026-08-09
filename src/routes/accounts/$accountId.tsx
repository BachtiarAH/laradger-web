import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { AccountForm } from '../../components/AccountForm'
import { RequireAuth } from '../../components/RequireAuth'
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
  const [deleting, setDeleting] = React.useState(false)
  const [actionError, setActionError] = React.useState<unknown>(null)

  const { data, error, loading, reload } = useFetch(
    () => api.getAccount(accountId),
    [accountId],
  )
  const account = data?.data

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
    if (!account) return
    if (!window.confirm(`Delete account "${account.code} — ${account.name}"?`)) return
    setDeleting(true)
    setActionError(null)
    try {
      await api.deleteAccount(accountId)
      navigate({ to: '/accounts' })
    } catch (err) {
      setActionError(err)
      setDeleting(false)
    }
  }

  return (
    <RequireAuth>
      <PageHeader
        title={account ? `${account.code} — ${account.name}` : 'Account'}
        subtitle={account ? `Account ${account.id}` : undefined}
        actions={
          account && (
            <>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
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
      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}
      {loading && <Card className="p-4"><LoadingBox label="Loading account…" /></Card>}

      {account && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Details
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Type</dt>
                <dd className="mt-1"><Badge value={account.type} /></dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                <dd className="mt-1"><Badge value={account.status} /></dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Currency</dt>
                <dd>{account.currency}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Parent</dt>
                <dd>
                  {account.parent ? (
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {account.parent.code} — {account.parent.name}
                    </span>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500 dark:text-gray-400">Children</dt>
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
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
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
    </RequireAuth>
  )
}
