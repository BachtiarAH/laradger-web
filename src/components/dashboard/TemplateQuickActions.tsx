import { Link, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { ArrowRight, FileClock, Plus, RefreshCw } from 'lucide-react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { Badge, Button, Card, ErrorBox, LoadingBox, formatDate } from '../ui'

const PERIOD_LABEL: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export function TemplateQuickActions() {
  const navigate = useNavigate()
  const { data, error, loading, reload } = useFetch(
    () => api.listJournalTemplates({ is_active: true, per_page: 4 }),
    [],
  )

  const templates = data?.data ?? []

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileClock className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Quick Templates</h2>
              {data && <Badge value="active" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {data ? `${data.total} active template${data.total === 1 ? '' : 's'}` : 'Active journal templates'}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => navigate({ to: '/templates' })}>
            Manage all
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => navigate({ to: '/templates/new' })}>
            <Plus className="size-4" aria-hidden />
            New template
          </Button>
        </div>
      </div>

      {loading && !data && <LoadingBox label="Loading quick templates…" />}
      {error != null && (
        <div className="space-y-3 px-6 py-4">
          <ErrorBox error={error} />
          <Button variant="secondary" onClick={reload}>
            <RefreshCw className="size-4" aria-hidden />
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && templates.length === 0 && (
        <div className="px-6 py-5 text-sm text-muted-foreground">
          No active templates.{' '}
          <Link to="/templates/new" className="font-medium text-primary hover:underline">
            Create one
          </Link>{' '}
          or <Link to="/templates" className="font-medium text-primary hover:underline">manage existing templates</Link>.
        </div>
      )}

      {templates.length > 0 && (
        <div className="divide-y divide-border">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to="/templates/$templateId"
                  params={{ templateId: template.id }}
                  className="truncate font-medium text-primary hover:underline"
                >
                  {template.name}
                </Link>
                {template.description && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{template.description}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {PERIOD_LABEL[template.period_type] ?? template.period_type}
                  {' · '}
                  {template.lines_count ?? template.lines?.length ?? 0} lines
                  {' · '}
                  Next {template.next_run_at ? formatDate(template.next_run_at) : 'not scheduled'}
                </p>
              </div>

              <div className="shrink-0 text-xs font-medium text-muted-foreground sm:max-w-48 sm:truncate">
                {template.allocation
                  ? `Allocation: ${template.allocation.name}`
                  : 'Auto-detect allocation'}
              </div>

              <Link
                to="/templates/$templateId"
                params={{ templateId: template.id }}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      )}

      {data && data.total > templates.length && (
        <div className="border-t border-border px-6 py-3 text-right">
          <Link to="/templates" className="text-sm font-medium text-primary hover:underline">
            View all templates
          </Link>
        </div>
      )}
    </Card>
  )
}
