import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { ApiError, api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { NotFound } from '../../components/NotFound'
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
import type { JournalLine, Tag, TagType } from '../../lib/types'
import { AccountSelect } from '../../components/AccountSelect'
import { GripVertical } from 'lucide-react'

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
  const isNotFound = error instanceof ApiError && error.status === 404
  const isDraft = journal?.status === 'draft'
  const isPosted = journal?.status === 'posted'
  const isArchived = journal?.status === 'archived'

  const tags = useFetch(() => api.listTags({ per_page: 100 }), [])

  const [actionError, setActionError] = React.useState<unknown>(null)
  const [busy, setBusy] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [editingLineId, setEditingLineId] = React.useState<string | null>(null)

  const [orderedLines, setOrderedLines] = React.useState<JournalLine[]>([])
  const [orderDirty, setOrderDirty] = React.useState(false)
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = React.useState<number | null>(null)

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
  const [freeTagName, setFreeTagName] = React.useState('')
  const [freeTagType, setFreeTagType] = React.useState<TagType>('vendor')
  const [freeTagBusy, setFreeTagBusy] = React.useState(false)

  React.useEffect(() => {
    if (journal) {
      setFormDate(journal.transaction_date.slice(0, 10))
      setFormDescription(journal.description)
      setFormReference(journal.reference)
      setFormStatus(journal.status === 'draft' ? 'draft' : 'posted')
    }
  }, [journal])

  React.useEffect(() => {
    setOrderedLines((prev) => {
      const next = journal?.lines ?? []
      const changed =
        prev.length !== next.length ||
        prev.some((line, i) => line.id !== next[i]?.id)
      if (changed) setOrderDirty(false)
      return next
    })
  }, [journal?.lines])

  const [accountLabels, setAccountLabels] = React.useState<Map<string, string>>(new Map())

  React.useEffect(() => {
    const ids = new Set<string>()
    journal?.lines?.forEach((l) => {
      if (l.account) {
        setAccountLabels((prev) => {
          const next = new Map(prev)
          next.set(l.account_id, `${l.account!.code} — ${l.account!.name}`)
          return next
        })
      } else if (!accountLabels.has(l.account_id)) {
        ids.add(l.account_id)
      }
    })
    ids.forEach((id) => {
      api
        .getAccount(id)
        .then((res) => {
          setAccountLabels((prev) => {
            const next = new Map(prev)
            next.set(id, `${res.data.code} — ${res.data.name}`)
            return next
          })
        })
        .catch(() => {})
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journal?.lines])

  const accountName = (accountId: string) => {
    return accountLabels.get(accountId) ?? accountId
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

  const handleSaveJournal = (statusOverride?: 'draft' | 'posted') => {
    const original = journal!
    const payload = {
      transaction_date: formDate,
      description: formDescription,
      reference: formReference,
      status: statusOverride ?? formStatus,
      source: original.source,
      lines: orderedLines.map((line) => ({
        account_id: line.account_id,
        debit: Number(line.debit),
        credit: Number(line.credit),
        description: line.description ?? undefined,
      })),
      tags: (original.tags ?? []).map((tag) => tag.id),
    }
    return runAction(async () => {
      await api.updateJournal(journalId, payload)
      if (statusOverride) setFormStatus(statusOverride)
      setEditing(false)
    })
  }

  const handlePost = () => handleSaveJournal('posted')

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

  const handleDragStart = (index: number) => {
    setDragIndex(index)
    setDropTargetIndex(index)
  }

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetIndex(index)
  }

  const handleDragLeave = () => {
    setDropTargetIndex(null)
  }

  const handleDrop = (index: number) => {
    setDropTargetIndex(null)
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      return
    }
    setOrderedLines((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(index, 0, moved)
      return next
    })
    setOrderDirty(true)
    setDragIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDropTargetIndex(null)
  }

  const handleSaveOrder = () => {
    if (!journal) return
    const payload = {
      transaction_date: formDate,
      description: formDescription,
      reference: formReference,
      status: formStatus,
      source: journal.source,
      lines: orderedLines.map((line) => ({
        account_id: line.account_id,
        debit: Number(line.debit),
        credit: Number(line.credit),
        description: line.description ?? undefined,
      })),
      tags: (journal.tags ?? []).map((tag) => tag.id),
    }
    return runAction(async () => {
      await api.updateJournal(journalId, payload)
      setOrderDirty(false)
    })
  }

  const handleAttachTag = () => {
    if (!attachTagId) return
    return runAction(async () => {
      await api.attachJournalTag(journalId, attachTagId)
      setAttachTagId('')
    })
  }

  const handleCreateAndAttachTag = async () => {
    const name = freeTagName.trim()
    if (!name) return
    setActionError(null)
    setFreeTagBusy(true)
    try {
      const existing = (tags.data?.data ?? []).find((t) => t.name.toLowerCase() === name.toLowerCase())
      let tagId: string
      if (existing) {
        if (attachedTagIds.has(existing.id)) {
          setActionError(new Error(`Tag "${existing.name}" sudah terpasang.`))
          return
        }
        tagId = existing.id
      } else {
        const res = await api.createTag({ name, type: freeTagType })
        tagId = res.data.id
        // refresh tags list so new tag appears in Select
        tags.reload()
      }
      await api.attachJournalTag(journalId, tagId)
      setFreeTagName('')
      reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setFreeTagBusy(false)
    }
  }

  const attachedTagIds = new Set((journal?.tags ?? []).map((tag) => tag.id))
  const availableTags = (tags.data?.data ?? []).filter(
    (tag) => !attachedTagIds.has(tag.id),
  )

  const lines = orderedLines
  const totalDebit = lines
    .reduce((sum, line) => sum + (Number(line.debit) || 0), 0)
    .toFixed(2)
  const totalCredit = lines
    .reduce((sum, line) => sum + (Number(line.credit) || 0), 0)
    .toFixed(2)

  if (isNotFound) {
    return (
      <RequireAuth>
        <NotFound
          title="Journal not found"
          description={`No journal found with ID “${journalId}”. It may have been deleted or does not exist.`}
          backTo="/journals"
          backLabel="Back to journals"
        />
      </RequireAuth>
    )
  }

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
                <Button variant="success" onClick={handlePost} loading={busy}>
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

      {error != null && !isNotFound && <div className="mb-4"><ErrorBox error={error} /></div>}
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
                  onClick={() => handleSaveJournal()}
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
              <div className="flex items-center gap-4">
                {orderDirty && isDraft && (
                  <Button variant="secondary" onClick={handleSaveOrder} loading={busy} className="!px-3 !py-1.5 text-sm">
                    Save order
                  </Button>
                )}
                <div className="text-sm text-muted-foreground">
                  Debit <span className="font-medium text-green-600">{totalDebit}</span>
                  <span className="mx-2">/</span>
                  Credit{' '}
                  <span className="font-medium text-red-600">{totalCredit}</span>
                </div>
              </div>
            </div>
            {lines.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No lines on this journal.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isDraft && <Th className="w-10" />}
                    <Th>Account</Th>
                    <Th>Debit</Th>
                    <Th>Credit</Th>
                    <Th>Description</Th>
                    {isDraft && <Th className="text-right">Actions</Th>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) =>
                    editingLineId === line.id ? (
                      <LineEditRow
                        key={line.id}
                        line={line}
                        busy={busy}
                        onCancel={() => setEditingLineId(null)}
                        onSave={(patch) => handleUpdateLine(line, patch)}
                      />
                    ) : (
                      <TableRow
                        key={line.id}
                        draggable={isDraft}
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(index)}
                        onDragEnd={handleDragEnd}
                        className={[
                          dragIndex === index ? 'opacity-50' : undefined,
                          isDraft && dragIndex !== null && dropTargetIndex === index
                            ? 'bg-primary/10 ring-1 ring-inset ring-primary'
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {isDraft && (
                          <Td className="w-10 cursor-grab text-center text-muted-foreground">
                            <GripVertical className="mx-auto h-4 w-4" />
                          </Td>
                        )}
                        <Td>{accountName(line.account_id)}</Td>
                        <Td className={line.debit ? 'text-green-600' : ''}>{line.debit ? Number(line.debit).toLocaleString() : '—'}</Td>
                        <Td className={line.credit ? 'text-red-600' : ''}>{line.credit ? Number(line.credit).toLocaleString() : '—'}</Td>
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
                      <AccountSelect
                        value={newLine.account_id || null}
                        onValueChange={(value) =>
                          setNewLine((prev) => ({ ...prev, account_id: value ?? '' }))
                        }
                        placeholder="Select account…"
                        allowCreate
                      />
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
                        className="text-green-600"
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
                        className="text-red-600"
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
            {!isArchived && (
              <div className="space-y-3">
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
                <div className="flex max-w-md items-end gap-2">
                  <Field label="Atau buat tag baru">
                    <Input
                      placeholder="Ketik nama tag…"
                      value={freeTagName}
                      onChange={(e) => setFreeTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void handleCreateAndAttachTag()
                        }
                      }}
                      maxLength={255}
                    />
                  </Field>
                  <Select value={freeTagType} onValueChange={(v) => setFreeTagType(v as TagType)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">priority</SelectItem>
                      <SelectItem value="recurring">recurring</SelectItem>
                      <SelectItem value="vendor">vendor</SelectItem>
                      <SelectItem value="tax">tax</SelectItem>
                      <SelectItem value="transfer">transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="secondary"
                    onClick={handleCreateAndAttachTag}
                    loading={freeTagBusy || busy}
                    disabled={!freeTagName.trim()}
                  >
                    Buat &amp; Attach
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Ketik bebas — kalau tag belum ada akan otomatis dibuat dengan tipe terpilih lalu dipasang ke journal.</p>
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
  busy,
  onCancel,
  onSave,
}: {
  line: JournalLine
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
      <Td className="w-10" />
      <Td>
        <AccountSelect value={accountId} onValueChange={(v) => setAccountId(v ?? '')} placeholder="Select account…" allowCreate />
      </Td>
      <Td>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={debit}
          onChange={(e) => setDebit(e.target.value)}
          className="text-green-600"
        />
      </Td>
      <Td>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={credit}
          onChange={(e) => setCredit(e.target.value)}
          className="text-red-600"
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