import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
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
import type { Account, JournalLine, Tag } from '../../lib/types'

export const Route = createFileRoute('/journals/$journalId')({
  component: JournalDetailPage,
})

const EMPTY_ACCOUNT_ID = ''

function JournalDetailPage() {
  const { journalId } = Route.useParams()
  const navigate = useNavigate()

  const { data, error, loading, reload } = useFetch(
    () => api.getJournal(journalId),
    [journalId],
  )
  const journal = data?.data
  const isDraft = journal?.status === 'draft'
  const isPosted = journal?.status === 'posted'

  const accounts = useFetch(() => api.listAccounts({ per_page: 100 }), [])
  const tags = useFetch(() => api.listTags({ per_page: 100 }), [])

  const [actionError, setActionError] = React.useState<unknown>(null)
  const [busy, setBusy] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [editingLineId, setEditingLineId] = React.useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [confirmReverse, setConfirmReverse] = React.useState(false)
  const [confirmLine, setConfirmLine] = React.useState<JournalLine | null>(null)

  // Edit journal form
  const [formDate, setFormDate] = React.useState('')
  const [formDescription, setFormDescription] = React.useState('')
  const [formReference, setFormReference] = React.useState('')
  const [formStatus, setFormStatus] = React.useState<'draft' | 'posted'>('draft')

  // Add line form
  const [newLine, setNewLine] = React.useState({
    account_id: EMPTY_ACCOUNT_ID,
    debit: '',
    credit: '',
    description: '',
  })

  // Attach tag
  const [attachTagId, setAttachTagId] = React.useState('')

  React.useEffect(() => {
    if (journal) {
      setFormDate(journal.transaction_date.slice(0, 10))
      setFormDescription(journal.description)
      setFormReference(journal.reference)
      setFormStatus(journal.status === 'draft' ? 'draft' : 'posted')
    }
  }, [journal])

  const accountName = (accountId: string) => {
    const account = accounts.data?.data.find((a) => a.id === accountId)
    return account ? `${account.code} — ${account.name}` : accountId
  }

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null)
    setBusy(true)
    try {
      await action()
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  const handleSaveJournal = () => {
    const original = journal!
    const payload = {
      transaction_date: formDate,
      description: formDescription,
      reference: formReference,
      status: formStatus,
      source: original.source,
      lines: (original.lines ?? []).map((line) => ({
        account_id: line.account_id,
        debit: Number(line.debit),
        credit: Number(line.credit),
        description: line.description ?? undefined,
      })),
      tags: (original.tags ?? []).map((tag) => tag.id),
    }
    return runAction(async () => {
      await api.updateJournal(journalId, payload)
      setEditing(false)
    })
  }

  const handleDelete = async () => {
    setActionError(null)
    try {
      await api.deleteJournal(journalId)
      navigate({ to: '/journals' })
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  const handleReverse = async () => {
    setActionError(null)
    try {
      const result = await api.reverseJournal(journalId)
      navigate({ to: '/journals/$journalId', params: { journalId: result.data.id } })
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  const handleAddLine = () => {
    if (!newLine.account_id) {
      setActionError(new Error('Select an account for the new line.'))
      return
    }
    const payload = {
      journal_id: journalId,
      account_id: newLine.account_id,
      ...(newLine.debit ? { debit: Number(newLine.debit) } : {}),
      ...(newLine.credit ? { credit: Number(newLine.credit) } : {}),
      ...(newLine.description ? { description: newLine.description } : {}),
    }
    return runAction(async () => {
      await api.createJournalLine(payload)
      setNewLine({
        account_id: EMPTY_ACCOUNT_ID,
        debit: '',
        credit: '',
        description: '',
      })
    })
  }

  const handleDeleteLine = async (line: JournalLine) => {
    setActionError(null)
    try {
      await api.deleteJournalLine(line.id)
      setEditingLineId(null)
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  const handleUpdateLine = (
    line: JournalLine,
    draft: { account_id: string; debit: string; credit: string; description: string },
  ) => {
    const payload = {
      journal_id: journalId,
      account_id: draft.account_id,
      ...(draft.debit ? { debit: Number(draft.debit) } : {}),
      ...(draft.credit ? { credit: Number(draft.credit) } : {}),
      ...(draft.description ? { description: draft.description } : {}),
    }
    return runAction(async () => {
      await api.updateJournalLine(line.id, payload)
      setEditingLineId(null)
    })
  }

  const handleAttachTag = () => {
    if (!attachTagId) return
    return runAction(async () => {
      await api.attachJournalTag(journalId, attachTagId)
      setAttachTagId('')
    })
  }

  const attachedTagIds = new Set((journal?.tags ?? []).map((tag) => tag.id))
  const availableTags = (tags.data?.data ?? []).filter(
    (tag) => !attachedTagIds.has(tag.id),
  )

  const lines = journal?.lines ?? []
  const totalDebit = lines
    .reduce((sum, line) => sum + (Number(line.debit) || 0), 0)
    .toFixed(2)
  const totalCredit = lines
    .reduce((sum, line) => sum + (Number(line.credit) || 0), 0)
    .toFixed(2)

  return (
    <RequireAuth>
      <PageHeader
        title={journal ? journal.reference || 'Journal' : 'Journal'}
        subtitle={journal ? `Journal ${journal.id}` : undefined}
        actions={
          journal && (
            <>
              <Button variant="secondary" onClick={() => navigate({ to: '/journals' })}>
                Back
              </Button>
              {isDraft && (
                <Button variant="success" onClick={() => handleSaveJournal()} loading={busy}>
                  Post
                </Button>
              )}
              {isDraft && (
                <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
                  {editing ? 'Cancel edit' : 'Edit'}
                </Button>
              )}
              {isPosted && (
                <Button onClick={() => setConfirmReverse(true)}>
                  Reverse
                </Button>
              )}
              {isDraft && (
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              )}
            </>
          )
        }
      />

      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}
      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {loading && <Card className="p-4"><LoadingBox label="Loading journal…" /></Card>}

      {journal && (
        <>
          <Card className="mb-4 p-6">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-1"><Badge value={journal.status} /></dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="mt-1"><Badge value={journal.source} /></dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Transaction date</dt>
                <dd>{new Date(journal.transaction_date).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created by</dt>
                <dd>{journal.user?.name ?? journal.user_id}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Description</dt>
                <dd>{journal.description || '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{formatDate(journal.updated_at)}</dd>
              </div>
              {journal.reverse_from_id && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Reversal of</dt>
                  <dd className="font-mono text-xs">{journal.reverse_from_id}</dd>
                </div>
              )}
            </dl>
          </Card>

          {editing && (
            <Card className="mb-4 space-y-4 p-6">
              <h2 className="text-lg font-semibold text-foreground">
                Edit journal
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Transaction date">
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </Field>
                <Field label="Reference">
                  <Input
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={formStatus}
                    onValueChange={(value) =>
                      setFormStatus(value as 'draft' | 'posted')
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">draft</SelectItem>
                      <SelectItem value="posted">posted</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Description">
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </Field>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveJournal}
                  loading={busy}
                  disabled={!isDraft}
                >
                  Save changes
                </Button>
              </div>
            </Card>
          )}

          <Card className="mb-4">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">
                Lines
              </h2>
              <div className="text-sm text-muted-foreground">
                Debit <span className="font-medium text-foreground">{totalDebit}</span>
                <span className="mx-2">/</span>
                Credit{' '}
                <span className="font-medium text-foreground">{totalCredit}</span>
              </div>
            </div>
            {lines.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No lines on this journal.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Account</Th>
                    <Th>Debit</Th>
                    <Th>Credit</Th>
                    <Th>Description</Th>
                    {isDraft && <Th className="text-right">Actions</Th>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) =>
                    editingLineId === line.id ? (
                      <LineEditRow
                        key={line.id}
                        line={line}
                        accounts={accounts.data?.data ?? []}
                        busy={busy}
                        onCancel={() => setEditingLineId(null)}
                        onSave={(patch) => handleUpdateLine(line, patch)}
                      />
                    ) : (
                      <TableRow key={line.id}>
                        <Td>{accountName(line.account_id)}</Td>
                        <Td>{line.debit ? Number(line.debit).toLocaleString() : '—'}</Td>
                        <Td>{line.credit ? Number(line.credit).toLocaleString() : '—'}</Td>
                        <Td>{line.description || '—'}</Td>
                        {isDraft && (
                          <Td className="text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                className="text-sm text-primary hover:underline"
                                onClick={() => setEditingLineId(line.id)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-sm text-destructive hover:underline"
                                onClick={() => setConfirmLine(line)}
                              >
                                Delete
                              </button>
                            </div>
                          </Td>
                        )}
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            )}

            {isDraft && (
              <div className="border-t border-border p-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Add line
                </h3>
                <div className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-4">
                    <Field label="Account">
                      <Select
                        value={newLine.account_id || undefined}
                        onValueChange={(value) =>
                          setNewLine((prev) => ({ ...prev, account_id: value }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select account…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(accounts.data?.data ?? []).map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} — {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Debit">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newLine.debit}
                        onChange={(e) =>
                          setNewLine((prev) => ({ ...prev, debit: e.target.value }))
                        }
                      />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Credit">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newLine.credit}
                        onChange={(e) =>
                          setNewLine((prev) => ({ ...prev, credit: e.target.value }))
                        }
                      />
                    </Field>
                  </div>
                  <div className="col-span-3">
                    <Field label="Description">
                      <Input
                        value={newLine.description}
                        onChange={(e) =>
                          setNewLine((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="secondary"
                      onClick={handleAddLine}
                      loading={busy}
                      className="w-full !px-2 !py-1.5"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Tags
            </h2>
            {(journal.tags ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags attached.</p>
            ) : (
              <div className="mb-4 flex flex-wrap gap-2">
                {journal.tags?.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-full border border-input px-3 py-1 text-sm"
                  >
                    {tag.name} <Badge value={tag.type} />
                  </span>
                ))}
              </div>
            )}
            {isDraft && (
              <div className="flex max-w-md items-end gap-2">
                <Field label="Attach tag">
                  <Select
                    value={attachTagId || undefined}
                    onValueChange={setAttachTagId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select tag…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map((tag: Tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Button
                  variant="secondary"
                  onClick={handleAttachTag}
                  loading={busy}
                  disabled={!attachTagId}
                >
                  Attach
                </Button>
              </div>
            )}
          </Card>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete journal"
        description={
          journal
            ? `Delete journal "${journal.reference}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={confirmReverse}
        onOpenChange={setConfirmReverse}
        title="Reverse journal"
        description="Create a reversal journal entry for this transaction?"
        confirmLabel="Reverse"
        onConfirm={handleReverse}
      />

      <ConfirmDialog
        open={confirmLine !== null}
        onOpenChange={(open) => !open && setConfirmLine(null)}
        title="Delete line"
        description="Delete this journal line?"
        confirmLabel="Delete"
        onConfirm={() => confirmLine && handleDeleteLine(confirmLine)}
      />
    </RequireAuth>
  )
}

function LineEditRow({
  line,
  accounts,
  busy,
  onCancel,
  onSave,
}: {
  line: JournalLine
  accounts: Account[]
  busy: boolean
  onCancel: () => void
  onSave: (draft: {
    account_id: string
    debit: string
    credit: string
    description: string
  }) => void
}) {
  const [accountId, setAccountId] = React.useState(line.account_id)
  const [debit, setDebit] = React.useState(line.debit ?? '')
  const [credit, setCredit] = React.useState(line.credit ?? '')
  const [description, setDescription] = React.useState(line.description ?? '')

  return (
    <TableRow>
      <Td>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.code} — {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Td>
      <Td>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={debit}
          onChange={(e) => setDebit(e.target.value)}
        />
      </Td>
      <Td>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={credit}
          onChange={(e) => setCredit(e.target.value)}
        />
      </Td>
      <Td>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Td>
      <Td className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            className="!px-2 !py-1 text-xs"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="!px-2 !py-1 text-xs"
            loading={busy}
            onClick={() =>
              onSave({
                account_id: accountId,
                debit,
                credit,
                description,
              })
            }
          >
            Save
          </Button>
        </div>
      </Td>
    </TableRow>
  )
}