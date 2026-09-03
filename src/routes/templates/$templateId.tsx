import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { ApiError, api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import { TemplateForm } from '../../components/TemplateForm'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { NotFound } from '../../components/NotFound'
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'

export const Route = createFileRoute('/templates/$templateId')({
  component: TemplateDetailPage,
})

const PERIOD_LABEL: Record<string, string> = {
  daily: 'Harian',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
}

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function TemplateDetailPage() {
  const { templateId } = Route.useParams()
  const navigate = useNavigate()

  const { data, error, loading, reload } = useFetch(
    () => api.getJournalTemplate(templateId),
    [templateId],
  )
  const template = data?.data
  const isNotFound = error instanceof ApiError && error.status === 404

  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [generating, setGenerating] = React.useState(false)
  const [genOpen, setGenOpen] = React.useState(false)
  const [genDate, setGenDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [actionError, setActionError] = React.useState<unknown>(null)

  const accountLabels = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const line of template?.lines ?? []) {
      if (line.account) {
        map.set(line.account_id, `${line.account.code} — ${line.account.name}`)
      }
    }
    return map
  }, [template?.lines])

  const accountName = (accountId: string) => accountLabels.get(accountId) ?? accountId

  const periodDetail = () => {
    if (template?.period_type === 'weekly' && template.day_of_week != null) {
      return WEEKDAYS[template.day_of_week] ?? String(template.day_of_week)
    }
    if (template?.period_type === 'monthly' && template.day_of_month != null) {
      return `Tanggal ${template.day_of_month}`
    }
    return 'Setiap hari'
  }

  const handleSave = async (payload: Parameters<typeof api.createJournalTemplate>[0]) => {
    setSaving(true)
    try {
      await api.updateJournalTemplate(templateId, payload)
      setEditing(false)
      reload()
    } catch (err) {
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleGenerate = async () => {
    setActionError(null)
    setGenerating(true)
    try {
      const result = await api.generateJournalFromTemplate(templateId, {
        transaction_date: genDate,
      })
      setGenOpen(false)
      navigate({ to: '/journals/$journalId', params: { journalId: result.data.id } })
    } catch (err) {
      setActionError(err)
      throw err
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async () => {
    setActionError(null)
    try {
      await api.deleteJournalTemplate(templateId)
      navigate({ to: '/templates' })
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  if (isNotFound) {
    return (
      <RequireAuth>
        <NotFound
          title="Template not found"
          description={`No journal template found with ID "${templateId}".`}
          backTo="/templates"
          backLabel="Back to templates"
        />
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <PageHeader
        title={template ? template.name : 'Template'}
        subtitle={template ? `Template ${template.id}` : undefined}
        actions={
          template && (
            <>
              <Button variant="secondary" onClick={() => navigate({ to: '/templates' })}>
                Back
              </Button>
              <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
                {editing ? 'Cancel edit' : 'Edit'}
              </Button>
              <Button onClick={() => setGenOpen(true)}>
                Generate now
              </Button>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </>
          )
        }
      />

      {error != null && !isNotFound && <div className="mb-4"><ErrorBox error={error} /></div>}
      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {loading && <Card className="p-4"><LoadingBox label="Loading template…" /></Card>}

      {template && !editing && (
        <>
          <Card className="mb-4 p-6">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Periodisitas</dt>
                <dd className="mt-1">{PERIOD_LABEL[template.period_type] ?? template.period_type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Jadwal</dt>
                <dd className="mt-1">{periodDetail()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-1">{template.is_active ? 'Aktif' : 'Nonaktif'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Next run</dt>
                <dd className="mt-1">{template.next_run_at ? formatDate(template.next_run_at) : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last run</dt>
                <dd className="mt-1">{template.last_run_at ? formatDate(template.last_run_at) : '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Description</dt>
                <dd className="mt-1">{template.description || '—'}</dd>
              </div>
            </dl>
          </Card>

          <Card className="mb-4">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Lines</h2>
            </div>
            {!template.lines || template.lines.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No lines on this template.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Account</Th>
                    <Th>Debit (default)</Th>
                    <Th>Credit (default)</Th>
                    <Th>Description</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {template.lines.map((line) => (
                    <TableRow key={line.id}>
                      <Td>{accountName(line.account_id)}</Td>
                      <Td>{line.debit ? Number(line.debit).toLocaleString() : '—'}</Td>
                      <Td>{line.credit ? Number(line.credit).toLocaleString() : '—'}</Td>
                      <Td>{line.description || '—'}</Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Tags</h2>
            {!template.tags || template.tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags attached.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <span key={tag.id} className="rounded-full border border-input px-3 py-1 text-sm">
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {template && editing && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Edit template</h2>
          <TemplateForm
            initial={template}
            onSubmit={handleSave}
            submitLabel="Save changes"
            loading={saving}
          />
        </Card>
      )}

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate jurnal dari template</DialogTitle>
            <DialogDescription>
              Buat jurnal draft baru dari template ini dengan tanggal transaksi berikut. Anda tetap bisa mengedit nominalnya setelah dibuat.
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
            <Button variant="secondary" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} loading={generating}>
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete template"
        description={
          template
            ? `Delete template "${template.name}"? This will not remove journals already generated from it.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </RequireAuth>
  )
}
