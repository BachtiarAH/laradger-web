import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import { Pagination } from '../../components/Pagination'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import {
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
import type { Budget } from '../../lib/types'
import { AccountSelect } from '../../components/AccountSelect'
import { useWidgets } from '../../hooks/useWidgets'
import { WidgetGrid } from '../../components/dashboard/WidgetGrid'
import { AddWidgetDialog } from '../../components/dashboard/AddWidgetDialog'
import type { WidgetConfig } from '../../lib/dashboardSchema'

export const Route = createFileRoute('/budgets/')({
  component: BudgetsPage,
})

function formatAmount(value: string | null | undefined): string {
  if (!value) return '—'
  const n = Number(value)
  return Number.isNaN(n) ? value : n.toLocaleString()
}

function BudgetsPage() {
  const navigate = useNavigate()
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [startsAt, setStartsAt] = React.useState('')
  const [endsAt, setEndsAt] = React.useState('')
  const [period, setPeriod] = React.useState('')
  const [budgetType, setBudgetType] = React.useState('')
  const [tagId, setTagId] = React.useState('')
  const [accountId, setAccountId] = React.useState('')
  const [confirmBudget, setConfirmBudget] = React.useState<Budget | null>(null)
  const [actionError, setActionError] = React.useState<unknown>(null)
  const { widgets, addWidget, removeWidget, moveWidget, updateWidget } = useWidgets()
  const [isEditingWidgets, setIsEditingWidgets] = React.useState(false)
  const [widgetDialogOpen, setWidgetDialogOpen] = React.useState(false)
  const [editWidget, setEditWidget] = React.useState<WidgetConfig | null>(null)

  const { data, error, loading, reload } = useFetch(
    () =>
      api.listBudgets({
        page,
        per_page: 15,
        search: search || undefined,
        starts_at: startsAt || undefined,
        ends_at: endsAt || undefined,
        period: period || undefined,
        budget_type: budgetType || undefined,
        tag_id: tagId || undefined,
        account_id: accountId || undefined,
      }),
    [page, search, startsAt, endsAt, period, budgetType, tagId, accountId],
  )

  const tags = useFetch(() => api.listTags({ per_page: 100 }), [])

  const setFilter = (
    name: 'search' | 'starts_at' | 'ends_at' | 'period' | 'budget_type' | 'tag_id' | 'account_id',
    value: string,
  ) => {
    if (name === 'search') setSearch(value)
    if (name === 'starts_at') setStartsAt(value)
    if (name === 'ends_at') setEndsAt(value)
    if (name === 'period') setPeriod(value)
    if (name === 'budget_type') setBudgetType(value)
    if (name === 'tag_id') setTagId(value)
    if (name === 'account_id') setAccountId(value)
    setPage(1)
  }

  const resetFilters = () => {
    setSearch('')
    setStartsAt('')
    setEndsAt('')
    setPeriod('')
    setBudgetType('')
    setTagId('')
    setAccountId('')
    setPage(1)
  }

  const handleDelete = async (budget: Budget) => {
    setActionError(null)
    try {
      await api.deleteBudget(budget.id)
      await reload()
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  return (
    <RequireAuth>
      <PageHeader
        title="Budgets"
        subtitle="Budgets generik — widget bisa di atas/bawah fitur, label & logic bebas"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsEditingWidgets((v) => !v)}>{isEditingWidgets ? 'Selesai' : 'Atur widget'}</Button>
            <Button variant="secondary" onClick={() => { setEditWidget(null); setWidgetDialogOpen(true) }}>Tambah widget</Button>
            <Link to="/budgets/new">
              <Button>New budget</Button>
            </Link>
          </div>
        }
      />

      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}

      <AddWidgetDialog open={widgetDialogOpen} onOpenChange={setWidgetDialogOpen} onAdd={addWidget} initial={editWidget} mode={editWidget ? 'edit' : 'add'} onUpdate={(id, patch) => updateWidget(id, patch)} />

      <div className="mb-4">
        <WidgetGrid widgets={widgets} placement="budgets:above_filters" isEditing={isEditingWidgets} onRemove={removeWidget} onMove={moveWidget} onEdit={(id) => { const w = widgets.find((x) => x.id === id); if (w) { setEditWidget(w); setWidgetDialogOpen(true) } }} />
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <Button variant={period === '' ? 'primary' : 'secondary'} onClick={() => setFilter('period', '')}>Semua</Button>
          <Button variant={period === 'today' ? 'primary' : 'secondary'} onClick={() => setFilter('period', 'today')}>Hari ini</Button>
          <Button variant={period === 'this_week' ? 'primary' : 'secondary'} onClick={() => setFilter('period', 'this_week')}>Minggu ini</Button>
          <Button variant={period === 'this_month' ? 'primary' : 'secondary'} onClick={() => setFilter('period', 'this_month')}>Bulan ini</Button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="self-center text-xs text-muted-foreground mr-1">Tipe:</span>
          <Button variant={budgetType === '' ? 'primary' : 'secondary'} onClick={() => setFilter('budget_type', '')}>Semua tipe</Button>
          <Button variant={budgetType === 'income' ? 'primary' : 'secondary'} onClick={() => setFilter('budget_type', 'income')}>Pemasukan</Button>
          <Button variant={budgetType === 'expense' ? 'primary' : 'secondary'} onClick={() => setFilter('budget_type', 'expense')}>Pengeluaran</Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <Field label="Search name">
            <Input
              placeholder="Search budgets…"
              value={search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </Field>
          <Field label="Starts after">
            <Input
              type="date"
              value={startsAt}
              onChange={(e) => setFilter('starts_at', e.target.value)}
            />
          </Field>
          <Field label="Ends before">
            <Input
              type="date"
              value={endsAt}
              onChange={(e) => setFilter('ends_at', e.target.value)}
            />
          </Field>
          <Field label="Tag">
            <Select
              value={tagId || undefined}
              onValueChange={(value) => setFilter('tag_id', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent>
                {(tags.data?.data ?? []).map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Account">
            <AccountSelect
              value={accountId || null}
              onValueChange={(value) => setFilter('account_id', value ?? '')}
              placeholder="All accounts"
              allowNone
              noneLabel="All accounts"
            />
          </Field>
          <div className="flex items-end">
            <Button variant="secondary" className="w-full" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        </div>
        <div className="mt-3">
          <WidgetGrid widgets={widgets} placement="budgets:summary" isEditing={isEditingWidgets} onRemove={removeWidget} onMove={moveWidget} onEdit={(id) => { const w = widgets.find((x) => x.id === id); if (w) { setEditWidget(w); setWidgetDialogOpen(true) } }} />
        </div>
        {(() => {
          const s = data?.summary
          const overspend = s ? Math.max(0, Number(s.expense_actual ?? 0) - Number(s.expense_budgeted ?? 0)) : 0
          const safeMoney = s ? Number(s.income_actual ?? 0) - Number(s.expense_budgeted ?? 0) - overspend : 0
          return (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-emerald-50 px-3 py-3 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-800">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Pemasukan (Ekspektasi)</p>
                <p className="mt-1 text-sm text-muted-foreground">Dianggarkan: <span className="font-semibold text-foreground">{loading ? '…' : formatAmount(s?.income_budgeted ?? '0')}</span></p>
                <p className="text-sm text-muted-foreground">Realisasi: <span className="font-semibold text-foreground">{loading ? '…' : formatAmount(s?.income_actual ?? '0')}</span></p>
                <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Belum dianggarkan: {loading ? '…' : formatAmount(s?.unbudgeted_income ?? '0')} <span className="font-normal text-muted-foreground">({Number(s?.unbudgeted_income ?? 0) >= 0 ? 'surplus' : 'defisit'})</span></p>
                <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Uang Dingin: {loading ? '…' : formatAmount(String(safeMoney))} <span className="font-normal text-muted-foreground">(pemasukan - budget - overspend)</span></p>
              </div>
              <div className="rounded-lg bg-red-50 px-3 py-3 ring-1 ring-red-200 dark:bg-red-950/30 dark:ring-red-800">
                <p className="text-xs font-medium text-red-700 dark:text-red-300">Pengeluaran (Anggaran)</p>
                <p className="mt-1 text-sm text-muted-foreground">Dianggarkan: <span className="font-semibold text-foreground">{loading ? '…' : formatAmount(s?.expense_budgeted ?? '0')}</span></p>
                <p className="text-sm text-muted-foreground">Realisasi: <span className="font-semibold text-foreground">{loading ? '…' : formatAmount(s?.expense_actual ?? '0')}</span></p>
                <p className="mt-1 text-xs font-semibold text-red-700 dark:text-red-400">Sisa anggaran: {loading ? '…' : formatAmount(s?.remaining_expense ?? '0')} <span className="font-normal text-muted-foreground">({Number(s?.remaining_expense ?? 0) >= 0 ? 'tersisa' : 'over budget'})</span></p>
                {overspend > 0 && (
                  <p className="mt-1 text-xs font-semibold text-red-700 dark:text-red-400">Overspend: {loading ? '…' : formatAmount(String(overspend))}</p>
                )}
              </div>
              <div className="rounded-lg bg-sky-50 px-3 py-3 ring-1 ring-sky-200 dark:bg-sky-950/30 dark:ring-sky-800">
                <p className="text-xs font-medium text-sky-700 dark:text-sky-300">Akun lain (saldo)</p>
                <p className="mt-1 text-sm text-muted-foreground">Pergerakan aktual: <span className="font-semibold text-foreground">{loading ? '…' : formatAmount(s?.other_actual ?? '0')}</span></p>
                <p className="text-sm text-muted-foreground">Asset/Liabilitas/Equity</p>
              </div>
              <div className="rounded-lg bg-muted px-3 py-3 ring-1 ring-border">
                <p className="text-xs font-medium text-foreground">Ringkasan</p>
                <p className="mt-1 text-sm text-muted-foreground">Total budget: <span className="font-semibold text-foreground">{loading ? '…' : formatAmount(s?.total_budgeted ?? data?.total_amount ?? '0')}</span> <span className="text-xs">({data?.total ?? 0} budget)</span></p>
                <p className="text-sm text-muted-foreground">Total realisasi: <span className="font-semibold text-foreground">{loading ? '…' : formatAmount(s?.total_actual ?? '0')}</span></p>
                <p className="text-sm text-muted-foreground">Net dianggarkan: <span className="font-semibold text-foreground">{loading ? '…' : formatAmount(s?.net_budgeted ?? '0')}</span> <span className="text-xs">(pemasukan - pengeluaran)</span></p>
              </div>
            </div>
          )
        })()}
      </Card>

      <Card>
        {loading && <LoadingBox label="Loading budgets…" />}
        {!loading && data && (
          <>
            {data.data.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No budgets yet.{' '}
                <Link to="/budgets/new" className="font-medium text-primary hover:underline">
                  Create your first budget
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Name</Th>
                    <Th>Amount</Th>
                    <Th>Tipe anggaran</Th>
                    <Th>Period</Th>
                    <Th>Tipe</Th>
                    <Th>Accounts</Th>
                    <Th>Tags</Th>
                    <Th className="text-right">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((budget) => (
                    <TableRow
                      key={budget.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement
                        if (target.closest('a, button')) return
                        navigate({ to: '/budgets/$budgetId', params: { budgetId: budget.id } })
                      }}
                    >
                      <Td>
                        <Link
                          to="/budgets/$budgetId"
                          params={{ budgetId: budget.id }}
                          className="font-medium text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {budget.name}
                        </Link>
                      </Td>
                      <Td>{formatAmount(budget.amount)}</Td>
                      <Td>
                        {budget.budget_type === null ? (
                          <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Semua akun
                          </span>
                        ) : (
                          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${budget.budget_type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'}`}>
                            {budget.budget_type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        )}
                      </Td>
                      <Td>
                        {new Date(budget.starts_at).toLocaleDateString()} —{' '}
                        {new Date(budget.ends_at).toLocaleDateString()}
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
                          {budget.period_type === 'monthly' ? 'Bulanan' : 'Custom'}
                          {budget.is_recurring ? ' • Otomatis' : ''}
                        </span>
                      </Td>
                      <Td>{(budget.accounts?.length ?? 0) || '—'}</Td>
                      <Td>{(budget.tags?.length ?? 0) || '—'}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-3">
                          <Link
                            to="/budgets/$budgetId"
                            params={{ budgetId: budget.id }}
                            className="text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmBudget(budget)
                            }}
                            className="text-sm text-destructive hover:underline"
                          >
                            Delete
                          </button>
                        </div>
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

      <div className="mt-4">
        <WidgetGrid widgets={widgets} placement="budgets:bottom" isEditing={isEditingWidgets} onRemove={removeWidget} onMove={moveWidget} onEdit={(id) => { const w = widgets.find((x) => x.id === id); if (w) { setEditWidget(w); setWidgetDialogOpen(true) } }} />
      </div>

      <ConfirmDialog
        open={confirmBudget !== null}
        onOpenChange={(open) => !open && setConfirmBudget(null)}
        title="Delete budget"
        description={
          confirmBudget
            ? `Delete budget "${confirmBudget.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => confirmBudget && handleDelete(confirmBudget)}
      />
    </RequireAuth>
  )
}