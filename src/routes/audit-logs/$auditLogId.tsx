import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { ApiError, api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import { NotFound } from '../../components/NotFound'
import {
  Button,
  Card,
  ErrorBox,
  LoadingBox,
  PageHeader,
  formatDate,
} from '../../components/ui'

export const Route = createFileRoute('/audit-logs/$auditLogId')({
  component: AuditLogDetailPage,
})

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">null</span>
  return (
    <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function AuditLogDetailPage() {
  const { auditLogId } = Route.useParams()
  const navigate = useNavigate()

  const { data, error, loading } = useFetch(
    () => api.getAuditLog(auditLogId),
    [auditLogId],
  )
  const log = data?.data
  const isNotFound = error instanceof ApiError && error.status === 404

  if (isNotFound) {
    return (
      <RequireAuth>
        <NotFound
          title="Audit log not found"
          description={`No audit log found with ID “${auditLogId}”. It may have been deleted or does not exist.`}
          backTo="/audit-logs"
          backLabel="Back to audit logs"
        />
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <PageHeader
        title="Audit Log"
        subtitle={log?.id}
        actions={
          <Button variant="secondary" onClick={() => navigate({ to: '/audit-logs' })}>
            Back
          </Button>
        }
      />

      {error != null && !isNotFound && <div className="mb-4"><ErrorBox error={error} /></div>}
      {loading && <Card className="p-4"><LoadingBox label="Loading audit log…" /></Card>}

      {log && (
        <div className="space-y-4">
          <Card className="p-6">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Action</dt>
                <dd className="mt-1 font-mono text-xs">{log.action}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">User</dt>
                <dd className="mt-1">{log.user?.name ?? log.user_id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Journal</dt>
                <dd className="mt-1 font-mono text-xs">{log.journal_id ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="mt-1">{formatDate(log.created_at)}</dd>
              </div>
              {log.reason && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Reason</dt>
                  <dd className="mt-1">{log.reason}</dd>
                </div>
              )}
            </dl>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Before
              </h2>
              <JsonBlock value={log.before} />
            </Card>
            <Card className="p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                After
              </h2>
              <JsonBlock value={log.after} />
            </Card>
          </div>
        </div>
      )}
    </RequireAuth>
  )
}