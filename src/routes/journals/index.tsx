import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import { Pagination } from '../../components/Pagination'
import { Flag, Target } from 'lucide-react'
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  Td,
  Th,
} from '../../components/ui'

export const Route = createFileRoute('/journals/')({
  component: JournalsPage,
})

function JournalsPage() {
  const navigate = useNavigate()

  const fmtAmount = (value?: string | null) => {
    if (value == null || value === '') return '—'
    const n = Number(value)
    return Number.isNaN(n)
      ? value
      : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  const [page, setPage] = React.useState(1)
  const [status, setStatus] = React.useState('')
  const [source, setSource] = React.useState('')
  const [allocationId, setAllocationId] = React.useState('')
  const [goalId, setGoalId] = React.useState('')
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')

  const allocations = useFetch(() => api.listAllocations({ per_page: 100 }), [])
  const goals = useFetch(() => api.listGoals({ per_page: 100 }), [])

  const { data, error, loading } = useFetch(
    () =>
      api.listJournals({
        page,
        per_page: 15,
        status: status || undefined,
        source: source || undefined,
        allocation_id: allocationId || undefined,
        goal_id: goalId || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    [page, status, source, allocationId, goalId, from, to],
  )

  const resetFilters = () => {
    setStatus('')
    setSource('')
    setAllocationId('')
    setGoalId('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  const setFilter = (name: 'status' | 'source' | 'allocation_id' | 'goal_id' | 'from' | 'to', value: string) => {
    if (name === 'status') setStatus(value)
    if (name === 'source') setSource(value)
    if (name === 'allocation_id') setAllocationId(value)
    if (name === 'goal_id') setGoalId(value)
    if (name === 'from') setFrom(value)
    if (name === 'to') setTo(value)
    setPage(1)
  }

  return (
    <RequireAuth>
      <PageHeader
        title="Journals"
        subtitle="Journal entries with lines and tags"
        actions={
          <div className="flex gap-2">
            <Link to="/transactions/new">
              <Button>Quick Transaction</Button>
            </Link>
            <Link to="/journals/new">
              <Button variant="secondary">Manual Journal</Button>
            </Link>
          </div>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Field label="Status">
            <Select
              value={status || 'all'}
              onValueChange={(value) => setFilter('status', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="posted">posted</SelectItem>
                <SelectItem value="archived">archived</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Source">
            <Select
              value={source || 'all'}
              onValueChange={(value) => setFilter('source', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="manual">manual</SelectItem>
                <SelectItem value="imported">imported</SelectItem>
                <SelectItem value="system">system</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Allocation">
            <Select
              value={allocationId || 'all'}
              onValueChange={(value) => setFilter('allocation_id', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All allocations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All allocations</SelectItem>
                {(allocations.data?.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Goal">
            <Select
              value={goalId || 'all'}
              onValueChange={(value) => setFilter('goal_id', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All goals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All goals</SelectItem>
                {(goals.data?.data ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="From">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFilter('from', e.target.value)}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={to}
              onChange={(e) => setFilter('to', e.target.value)}
            />
          </Field>
        </div>
        {(status || source || allocationId || goalId || from || to) ? (
          <div className="mt-3 flex justify-end">
            <Button variant="secondary" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        ) : null}
      </Card>

      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}

      <Card>
        {loading && <LoadingBox label="Loading journals…" />}
        {!loading && data && (
          <>
            {data.data.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No journals found.{' '}
                <Link to="/journals/new" className="font-medium text-primary hover:underline">
                  Create your first journal
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Reference</Th>
                    <Th>Description</Th>
                    <Th>Planning</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th>Source</Th>
                    <Th className="text-right">Amount</Th>
                    <Th>Lines</Th>
                    <Th className="text-right">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((journal) => (
                    <TableRow
                      key={journal.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement
                        if (target.closest('a, button')) return
                        navigate({ to: '/journals/$journalId', params: { journalId: journal.id } })
                      }}
                    >
                      <Td>
                        <Link
                          to="/journals/$journalId"
                          params={{ journalId: journal.id }}
                          className="font-medium text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {journal.reference || '—'}
                        </Link>
                      </Td>
                      <Td className="max-w-xs truncate">{journal.description}</Td>
                      <Td>
                        {journal.allocation ? (
                          <Link
                            to="/allocations/$allocationId"
                            params={{ allocationId: journal.allocation_id! }}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:underline dark:bg-blue-950/40 dark:text-blue-300"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Target className="size-3 shrink-0" />
                            <span className="max-w-[120px] truncate">{journal.allocation.name}</span>
                          </Link>
                        ) : journal.goal ? (
                          <Link
                            to="/goals/$goalId"
                            params={{ goalId: journal.goal_id! }}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:underline dark:bg-emerald-950/40 dark:text-emerald-300"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Flag className="size-3 shrink-0" />
                            <span className="max-w-[120px] truncate">{journal.goal.name}</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </Td>
                      <Td>{new Date(journal.transaction_date).toLocaleDateString()}</Td>
                      <Td><Badge value={journal.status} /></Td>
                      <Td><Badge value={journal.source} /></Td>
                      <Td className="text-right">{fmtAmount(journal.total_debit)}</Td>
                      <Td>{journal.lines_count ?? journal.lines?.length ?? '—'}</Td>
                      <Td className="text-right">
                        <Link
                          to="/journals/$journalId"
                          params={{ journalId: journal.id }}
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