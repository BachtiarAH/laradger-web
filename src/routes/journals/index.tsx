import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
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
  Field,
  Input,
  LoadingBox,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from '../../components/ui'

const validateSearch = z.object({
  page: z.number().int().min(1).catch(1).default(1),
  status: z
    .enum(['draft', 'posted', 'archived'])
    .optional()
    .catch(undefined),
  source: z
    .enum(['manual', 'imported', 'system'])
    .optional()
    .catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/journals/')({
  validateSearch,
  component: JournalsPage,
})

function JournalsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const setSearch = (patch: Partial<typeof search>) => {
    navigate({ search: { ...search, ...patch } })
  }

  const { data, error, loading } = useFetch(
    () =>
      api.listJournals({
        page: search.page,
        per_page: 15,
        status: search.status,
        source: search.source,
        from: search.from,
        to: search.to,
      }),
    [search.page, search.status, search.source, search.from, search.to],
  )

  return (
    <RequireAuth>
      <PageHeader
        title="Journals"
        subtitle="Journal entries with lines and tags"
        actions={
          <Link to="/journals/new">
            <Button>New journal</Button>
          </Link>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <Field label="Status">
            <Select
              value={search.status ?? ''}
              onChange={(e) =>
                setSearch({ status: (e.target.value || undefined) as never, page: 1 })
              }
            >
              <option value="">All statuses</option>
              <option value="draft">draft</option>
              <option value="posted">posted</option>
              <option value="archived">archived</option>
            </Select>
          </Field>
          <Field label="Source">
            <Select
              value={search.source ?? ''}
              onChange={(e) =>
                setSearch({ source: (e.target.value || undefined) as never, page: 1 })
              }
            >
              <option value="">All sources</option>
              <option value="manual">manual</option>
              <option value="imported">imported</option>
              <option value="system">system</option>
            </Select>
          </Field>
          <Field label="From">
            <Input
              type="date"
              value={search.from ?? ''}
              onChange={(e) =>
                setSearch({ from: e.target.value || undefined, page: 1 })
              }
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={search.to ?? ''}
              onChange={(e) =>
                setSearch({ to: e.target.value || undefined, page: 1 })
              }
            />
          </Field>
          <div className="flex items-end">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() =>
                navigate({ search: { page: 1 } })
              }
            >
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}

      <Card>
        {loading && <LoadingBox label="Loading journals…" />}
        {!loading && data && (
          <>
            {data.data.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">
                No journals found.{' '}
                <Link to="/journals/new" className="text-indigo-600 dark:text-indigo-400">
                  Create your first journal
                </Link>
                .
              </p>
            ) : (
              <Table>
                <thead className="border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <Th>Reference</Th>
                    <Th>Description</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th>Source</Th>
                    <Th>Lines</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data.data.map((journal) => (
                    <tr key={journal.id}>
                      <Td>{journal.reference || '—'}</Td>
                      <Td className="max-w-xs truncate">{journal.description}</Td>
                      <Td>{new Date(journal.transaction_date).toLocaleDateString()}</Td>
                      <Td><Badge value={journal.status} /></Td>
                      <Td><Badge value={journal.source} /></Td>
                      <Td>{journal.lines?.length ?? '—'}</Td>
                      <Td className="text-right">
                        <Link
                          to="/journals/$journalId"
                          params={{ journalId: journal.id }}
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
                onPageChange={(page) => setSearch({ page })}
              />
            </div>
          </>
        )}
      </Card>
    </RequireAuth>
  )
}
