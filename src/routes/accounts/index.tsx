import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import { Pagination } from '../../components/Pagination'
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  LoadingBox,
  PageHeader,
  Table,
  Td,
  Th,
} from '../../components/ui'
import type { Account } from '../../lib/types'

export const Route = createFileRoute('/accounts/')({
  component: AccountsPage,
})

function AccountsPage() {
  const [page, setPage] = React.useState(1)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<unknown>(null)

  const { data, error, loading, reload } = useFetch(
    () => api.listAccounts({ page, per_page: 15 }),
    [page],
  )

  const handleDelete = async (account: Account) => {
    if (!window.confirm(`Delete account "${account.code} — ${account.name}"?`)) return
    setDeleting(account.id)
    setActionError(null)
    try {
      await api.deleteAccount(account.id)
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setDeleting(null)
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

      <Card>
        {loading && <LoadingBox label="Loading accounts…" />}
        {!loading && data && (
          <>
            {data.data.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">
                No accounts yet.{' '}
                <Link to="/accounts/new" className="text-indigo-600 dark:text-indigo-400">
                  Create your first account
                </Link>
                .
              </p>
            ) : (
              <Table>
                <thead className="border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <Th>Code</Th>
                    <Th>Name</Th>
                    <Th>Type</Th>
                    <Th>Currency</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data.data.map((account) => (
                    <tr key={account.id}>
                      <Td>{account.code}</Td>
                      <Td>
                        <Link
                          to="/accounts/$accountId"
                          params={{ accountId: account.id }}
                          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                        >
                          {account.name}
                        </Link>
                      </Td>
                      <Td><Badge value={account.type} /></Td>
                      <Td>{account.currency}</Td>
                      <Td><Badge value={account.status} /></Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            to="/accounts/$accountId"
                            params={{ accountId: account.id }}
                            className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={deleting === account.id}
                            onClick={() => handleDelete(account)}
                            className="text-sm text-red-600 hover:text-red-500 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
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
    </RequireAuth>
  )
}
