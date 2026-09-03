import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { ApiError, api } from '../../lib/api'
import { AccountForm } from '../../components/AccountForm'
import { AllocationAdjustDialog } from '../../components/AllocationAdjustDialog'
import { RequireAuth } from '../../components/RequireAuth'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { NotFound } from '../../components/NotFound'
import type { AccountAllocationItem } from '../../lib/types'
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
  formatDate,
} from '../../components/ui'
import { useFetch } from '../../lib/useFetch'
import { useDebounce } from '../../hooks/useDebounce'

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

  // analytics
  const analyticsFetch = useFetch(
    () => api.getAccountAnalytics(accountId),
    [accountId],
  )

  // allocation summary
  const [allocateOpen, setAllocateOpen] = React.useState(false)
  const [releaseItem, setReleaseItem] = React.useState<AccountAllocationItem | null>(null)

  const allocFetch = useFetch(
    () => api.getAccountAllocations(accountId),
    [accountId, account?.type === 'asset'],
  )
  const allocations = allocFetch.data

  // journal lines
  const [jlPage, setJlPage] = React.useState(1)
  const [jlSearch, setJlSearch] = React.useState('')
  const debouncedJlSearch = useDebounce(jlSearch, 300)
  const [jlStatus, setJlStatus] = React.useState('')

  const jlFetch = useFetch(
    () =>
      api.listAccountJournalLines(accountId, {
        page: jlPage,
        per_page: 10,
        search: debouncedJlSearch || undefined,
        status: jlStatus || undefined,
      }),
    [accountId, jlPage, debouncedJlSearch, jlStatus],
  )

  const handleAllocationsChanged = async () => {
    await allocFetch.reload()
  }

  const handleSubmit = async (payload: Parameters<typeof api.updateAccount>[1]) => {
    setSaving(true)
    setActionError(null)
    try {
      await api.updateAccount(accountId, payload)
      await reload()
      await analyticsFetch.reload()
      await jlFetch.reload()
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

  const analytics = analyticsFetch.data
  const fmtCurrency = (value: string | number | null | undefined) => {
    if (value == null || value === '') return '—'
    const n = Number(value)
    if (Number.isNaN(n)) return String(value)
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
                    <Link
                      to="/accounts/$accountId"
                      params={{ accountId: account.parent.id }}
                      className="text-primary hover:underline"
                    >
                      {account.parent.code} — {account.parent.name}
                    </Link>
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

      {/* Allocations */}
      {account && account.type === 'asset' && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Allocations</h2>
              <p className="text-xs text-muted-foreground">
                Reservations never move money — the ledger balance is unchanged.
              </p>
            </div>
            <Button onClick={() => setAllocateOpen(true)} disabled={loading || allocFetch.loading}>
              Allocate money
            </Button>
          </div>

          {allocFetch.error != null && <div className="px-6 pb-4"><ErrorBox error={allocFetch.error} /></div>}
          {allocFetch.loading && !allocations && <div className="px-6 pb-4"><LoadingBox label="Loading allocations…" /></div>}

          {allocations && (
            <>
              {allocations.over_allocated && (
                <div className="mx-6 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800">
                  This account holds more reservations than its available balance. Release or
                  reallocate money to fix the over-allocation.
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Balance (posted)</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {fmtCurrency(allocations.available)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Available to allocate, excludes draft journals
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Allocated</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {fmtCurrency(allocations.total_allocated)}
                  </div>
                  <div className="text-xs text-muted-foreground">Reserved for a purpose</div>
                </div>
                <div className={`rounded-lg border p-3 ${allocations.over_allocated ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-border'}`}>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Unallocated</div>
                  <div className={`mt-1 text-lg font-semibold ${allocations.over_allocated ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                    {fmtCurrency(allocations.unallocated)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {allocations.over_allocated ? 'Over-allocated' : 'Free to allocate'}
                  </div>
                </div>
              </div>

              {allocations.items.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">
                  No money reserved on this account yet.{' '}
                  <Link to="/allocations/new" className="font-medium text-primary hover:underline">
                    Create an allocation
                  </Link>{' '}
                  then allocate part of this balance.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <Th>Allocation</Th>
                      <Th>Amount</Th>
                      <Th className="text-right">Actions</Th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.items.map((item) => (
                      <TableRow key={item.allocation_id}>
                        <Td>
                          <Link
                            to="/allocations/$allocationId"
                            params={{ allocationId: item.allocation_id }}
                            className="font-medium text-primary hover:underline"
                          >
                            {item.name}
                          </Link>
                        </Td>
                        <Td>{fmtCurrency(item.amount)}</Td>
                        <Td className="text-right">
                          <button
                            type="button"
                            onClick={() => setReleaseItem(item)}
                            className="text-sm text-destructive hover:underline"
                          >
                            Release
                          </button>
                        </Td>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </Card>
      )}

      {/* Analytics */}
      {account && (
        <Card className="mt-4 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Analytics</h2>
            {analyticsFetch.loading && <span className="text-xs text-muted-foreground">Refreshing…</span>}
          </div>
          {analyticsFetch.error != null && <div className="mb-4"><ErrorBox error={analyticsFetch.error} /></div>}
          {analyticsFetch.loading && !analytics && <LoadingBox label="Loading analytics…" />}
          {analytics && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Debit</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{fmtCurrency(analytics.totals.debit)} <span className="text-xs font-normal text-muted-foreground">{account.currency}</span></div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Credit</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{fmtCurrency(analytics.totals.credit)} <span className="text-xs font-normal text-muted-foreground">{account.currency}</span></div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Net / Balance</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{fmtCurrency(analytics.totals.net)}</div>
                  <div className="text-xs text-muted-foreground">
                    {analytics.totals.balance} {analytics.totals.balance_side}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Counts</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{analytics.counts.lines} lines</div>
                  <div className="text-sm font-medium text-foreground">{analytics.counts.journals} journals</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">By journal status</h3>
                  {Object.keys(analytics.by_status).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(analytics.by_status).map(([status, row]: [string, any]) => (
                        <div key={status} className="rounded-full border border-input px-3 py-1 text-sm">
                          <Badge value={status} /> <span className="ml-2">{fmtCurrency(row.debit)} / {fmtCurrency(row.credit)}</span> <span className="text-muted-foreground">({row.count})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Monthly (last 6)</h3>
                  {analytics.monthly.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No monthly data</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <Th>Month</Th>
                          <Th>Debit</Th>
                          <Th>Credit</Th>
                          <Th>Count</Th>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.monthly.map((m: any) => (
                          <TableRow key={m.month}>
                            <Td className="font-mono text-sm">{m.month}</Td>
                            <Td>{fmtCurrency(m.debit)}</Td>
                            <Td>{fmtCurrency(m.credit)}</Td>
                            <Td>{m.count}</Td>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Journal Lines */}
      {account && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              Journal lines <span className="ml-2 text-sm font-normal text-muted-foreground">({jlFetch.data?.total ?? 0})</span>
            </h2>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { jlFetch.reload(); analyticsFetch.reload() }}>Refresh</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-3">
            <Field label="Search">
              <Input
                placeholder="Ref / desc…"
                value={jlSearch}
                onChange={(e) => { setJlSearch(e.target.value); setJlPage(1) }}
              />
            </Field>
            <Field label="Journal status">
              <Select
                value={jlStatus || undefined}
                onValueChange={(v) => { setJlStatus(v === 'all' ? '' : v); setJlPage(1) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="posted">posted</SelectItem>
                  <SelectItem value="archived">archived</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => { setJlSearch(''); setJlStatus(''); setJlPage(1) }}
              >
                Clear
              </Button>
            </div>
          </div>

          {jlFetch.error != null && <div className="px-6 pb-4"><ErrorBox error={jlFetch.error} /></div>}
          {jlFetch.loading && !jlFetch.data && <div className="px-6 pb-4"><LoadingBox label="Loading journal lines…" /></div>}

          {jlFetch.data && (
            <>
              {jlFetch.data.data.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">No journal lines for this account.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <Th>Journal</Th>
                      <Th>Date</Th>
                      <Th>Debit</Th>
                      <Th>Credit</Th>
                      <Th>Description</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Action</Th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jlFetch.data.data.map((line) => (
                      <TableRow
                        key={line.id}
                        className="cursor-pointer"
                        onClick={(e) => {
                          const target = e.target as HTMLElement
                          if (target.closest('a, button')) return
                          navigate({ to: '/journals/$journalId', params: { journalId: line.journal_id } })
                        }}
                      >
                        <Td>
                          <Link
                            to="/journals/$journalId"
                            params={{ journalId: line.journal_id }}
                            className="font-medium text-primary hover:underline"
                            title="Buka journal preview/edit"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {line.journal?.reference ?? line.journal_id.slice(0, 8) + '…'}
                          </Link>
                        </Td>
                        <Td className="text-xs">{line.journal ? formatDate(line.journal.transaction_date) : formatDate(line.created_at)}</Td>
                        <Td>{line.debit && Number(line.debit) !== 0 ? fmtCurrency(line.debit) : '—'}</Td>
                        <Td>{line.credit && Number(line.credit) !== 0 ? fmtCurrency(line.credit) : '—'}</Td>
                        <Td className="max-w-[200px] truncate">{line.description || line.journal?.description || '—'}</Td>
                        <Td>{line.journal ? <Badge value={line.journal.status} /> : '—'}</Td>
                        <Td className="text-right">
                          <Link
                            to="/journals/$journalId"
                            params={{ journalId: line.journal_id }}
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
                  page={jlFetch.data.current_page}
                  lastPage={jlFetch.data.last_page}
                  total={jlFetch.data.total}
                  onPageChange={setJlPage}
                />
              </div>
            </>
          )}
        </Card>
      )}

      <AllocationAdjustDialog
        open={allocateOpen}
        onOpenChange={setAllocateOpen}
        mode="allocate"
        allocationId={null}
        accountId={accountId}
        limitAmount={allocations?.available ?? null}
        onSubmitted={handleAllocationsChanged}
      />

      <AllocationAdjustDialog
        open={releaseItem !== null}
        onOpenChange={(open) => !open && setReleaseItem(null)}
        mode="release"
        allocationId={releaseItem?.allocation_id ?? null}
        accountId={accountId}
        limitAmount={releaseItem?.amount ?? null}
        onSubmitted={handleAllocationsChanged}
      />

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
