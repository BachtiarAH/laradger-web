import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import { Pagination } from '../../components/Pagination'
import { ConfirmDialog } from '../../components/ConfirmDialog'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import type { JournalTemplate } from '../../lib/types'

export const Route = createFileRoute('/templates/')({
  component: TemplatesPage,
})

const PERIOD_LABEL: Record<string, string> = {
  daily: 'Harian',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
}

function TemplatesPage() {
  const navigate = useNavigate()
  const [page, setPage] = React.useState(1)
  const [periodType, setPeriodType] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [confirmDelete, setConfirmDelete] = React.useState<JournalTemplate | null>(null)
  const [genTemplate, setGenTemplate] = React.useState<JournalTemplate | null>(null)
  const [genDate, setGenDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [generating, setGenerating] = React.useState(false)
  const [actionError, setActionError] = React.useState<unknown>(null)
  const [busy, setBusy] = React.useState(false)

  const { data, error, loading, reload } = useFetch(
    () =>
      api.listJournalTemplates({
        page,
        per_page: 15,
        period_type: periodType || undefined,
        search: search || undefined,
      }),
    [page, periodType, search],
  )

  const handleDelete = async (template: JournalTemplate) => {
    setActionError(null)
    setBusy(true)
    try {
      await api.deleteJournalTemplate(template.id)
      setConfirmDelete(null)
      reload()
    } catch (err) {
      setActionError(err)
      throw err
    } finally {
      setBusy(false)
    }
  }

  const handleGenerate = async () => {
    if (!genTemplate) return
    setActionError(null)
    setGenerating(true)
    try {
      const result = await api.generateJournalFromTemplate(genTemplate.id, {
        transaction_date: genDate,
      })
      setGenTemplate(null)
      navigate({ to: '/journals/$journalId', params: { journalId: result.data.id } })
    } catch (err) {
      setActionError(err)
      throw err
    } finally {
      setGenerating(false)
    }
  }

  const resetFilters = () => {
    setPeriodType('')
    setSearch('')
    setPage(1)
  }

  return (
    <RequireAuth>
      <PageHeader
        title="Templates"
        subtitle="Jurnal berulang yang dibuat otomatis setiap periode"
        actions={
          <Link to="/templates/new">
            <Button>New template</Button>
          </Link>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Search">
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Cari template…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </Field>
          <Field label="Periodisitas">
            <Select value={periodType || undefined} onValueChange={(v) => { setPeriodType(v); setPage(1) }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Semua" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Harian</SelectItem>
                <SelectItem value="weekly">Mingguan</SelectItem>
                <SelectItem value="monthly">Bulanan</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button variant="secondary" className="w-full" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}
      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}

      <Card>
        {loading && <LoadingBox label="Loading templates…" />}
        {!loading && data && (
          <>
            {data.data.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No templates found.{' '}
                <Link to="/templates/new" className="font-medium text-primary hover:underline">
                  Create your first template
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Name</Th>
                    <Th>Period</Th>
                    <Th>Status</Th>
                    <Th>Lines</Th>
                    <Th>Next run</Th>
                    <Th className="text-right">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((template) => (
                    <TableRow
                      key={template.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement
                        if (target.closest('a, button')) return
                        navigate({ to: '/templates/$templateId', params: { templateId: template.id } })
                      }}
                    >
                      <Td>
                        <Link
                          to="/templates/$templateId"
                          params={{ templateId: template.id }}
                          className="font-medium text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {template.name}
                        </Link>
                      </Td>
                      <Td>{PERIOD_LABEL[template.period_type] ?? template.period_type}</Td>
                      <Td><Badge value={template.is_active ? 'active' : 'inactive'} /></Td>
                      <Td>{template.lines_count ?? template.lines?.length ?? '—'}</Td>
                      <Td>{template.next_run_at ? formatDate(template.next_run_at) : '—'}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="text-sm text-primary hover:underline"
                            onClick={() => setGenTemplate(template)}
                          >
                            Generate
                          </button>
                          <Link
                            to="/templates/$templateId"
                            params={{ templateId: template.id }}
                            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            className="text-sm text-destructive hover:underline"
                            onClick={() => setConfirmDelete(template)}
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

      <Dialog open={genTemplate !== null} onOpenChange={(open) => !open && setGenTemplate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate jurnal dari template</DialogTitle>
            <DialogDescription>
              {genTemplate
                ? `Buat jurnal draft baru dari "${genTemplate.name}" dengan tanggal transaksi berikut. Anda tetap bisa mengedit nominalnya setelah dibuat.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <Field label="Transaction date" htmlFor="genDate">
            <Input
              id="genDate"
              type="date"
              required
              value={genDate}
              onChange={(e) => setGenDate(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setGenTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} loading={generating}>
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete template"
        description={
          confirmDelete
            ? `Delete template "${confirmDelete.name}"? This will not remove journals already generated from it.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </RequireAuth>
  )
}
