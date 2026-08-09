import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import { Pagination } from '../../components/Pagination'
import {
  Card,
  ErrorBox,
  LoadingBox,
  PageHeader,
  Table,
  Td,
  Th,
  formatDate,
} from '../../components/ui'

export const Route = createFileRoute('/audit-logs/')({
  component: AuditLogsPage,
})

function AuditLogsPage() {
  const [page, setPage] = React.useState(1)

  const { data, error, loading } = useFetch(
    () => api.listAuditLogs({ page, per_page: 15 }),
    [page],
  )

  return (
    <RequireAuth>
      <PageHeader title="Audit Logs" subtitle="Read-only audit trail" />

      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}

      <Card>
        {loading && <LoadingBox label="Loading audit logs…" />}
        {!loading && data && (
          <>
            {data.data.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No audit logs yet.</p>
            ) : (
              <Table>
                <thead className="border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <Th>Action</Th>
                    <Th>User</Th>
                    <Th>Reason</Th>
                    <Th>Created</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data.data.map((log) => (
                    <tr key={log.id}>
                      <Td>
                        <span className="font-mono text-xs">{log.action}</span>
                      </Td>
                      <Td>{log.user?.name ?? log.user_id}</Td>
                      <Td className="max-w-xs truncate">{log.reason || '—'}</Td>
                      <Td>{formatDate(log.created_at)}</Td>
                      <Td className="text-right">
                        <Link
                          to="/audit-logs/$auditLogId"
                          params={{ auditLogId: log.id }}
                          className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                        >
                          View
                        </Link>
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
