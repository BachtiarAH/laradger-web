import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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
  TableBody,
  TableHeader,
  TableRow,
  Td,
  Th,
  formatDate,
} from '../../components/ui'

export const Route = createFileRoute('/audit-logs/')({
  component: AuditLogsPage,
})

function AuditLogsPage() {
  const navigate = useNavigate()
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
              <p className="p-6 text-sm text-muted-foreground">No audit logs yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Action</Th>
                    <Th>User</Th>
                    <Th>Reason</Th>
                    <Th>Created</Th>
                    <Th className="text-right">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement
                        if (target.closest('a, button')) return
                        navigate({ to: '/audit-logs/$auditLogId', params: { auditLogId: log.id } })
                      }}
                    >
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
                          className="text-sm text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                        </Link>
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
    </RequireAuth>
  )
}