import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
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
  const [addingLine, setAddingLine] = React.useState(false)

  // Attach tag
  const [attachTagId, setAttachTagId] = React.useState('')
  const [attachingTag, setAttachingTag] = React.useState(false)

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

  const handleDelete = () => {
    if (!window.confirm(`Delete journal "${journal?.reference}"?`)) return
    return runAction(async () => {
      await api.deleteJournal(journalId)
      navigate({ to: '/journals' })
    })
  }

  const handleReverse = () => {
    if (!window.confirm('Create a reversal for this journal?')) return
    return runAction(async () => {
      const result = await api.reverseJournal(journalId)
      navigate({ to: '/journals/$journalId', params: { journalId: result.data.id } })
    })
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

  const handleDeleteLine = (line: JournalLine) => {
    if (!window.confirm('Delete this journal line?')) return
    return runAction(async () => {
      await api.deleteJournalLine(line.id)
      setEditingLineId(null)
    })
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
                <Button onClick={handleReverse} loading={busy}>
                  Reverse
                </Button>
              )}
              {isDraft && (
                <Button variant="danger" onClick={handleDelete} loading={busy}>
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
                <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                <dd className="mt-1"><Badge value={journal.status} /></dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Source</dt>
                <dd className="mt-1"><Badge value={journal.source} /></dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Transaction date</dt>
                <dd>{new Date(journal.transaction_date).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Created by</dt>
                <dd>{journal.user?.name ?? journal.user_id}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500 dark:text-gray-400">Description</dt>
                <dd>{journal.description || '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500 dark:text-gray-400">Updated</dt>
                <dd>{formatDate(journal.updated_at)}</dd>
              </div>
              {journal.reverse_from_id && (
                <div className="col-span-2">
                  <dt className="text-gray-500 dark:text-gray-400">Reversal of</dt>
                  <dd className="font-mono text-xs">{journal.reverse_from_id}</dd>
                </div>
              )}
            </dl>
          </Card>

          {editing && (
            <Card className="mb-4 space-y-4 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                    onChange={(e) =>
                      setFormStatus(e.target.value as 'draft' | 'posted')
                    }
                  >
                    <option value="draft">draft</option>
                    <option value="posted">posted</option>
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
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lines
              </h2>
              <div className="text-sm text-gray-500">
                Debit <span className="font-medium text-gray-900 dark:text-white">{totalDebit}</span>
                <span className="mx-2">/</span>
                Credit{' '}
                <span className="font-medium text-gray-900 dark:text-white">{totalCredit}</span>
              </div>
            </div>
            {lines.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No lines on this journal.</p>
            ) : (
              <Table>
                <thead className="border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <Th>Account</Th>
                    <Th>Debit</Th>
                    <Th>Credit</Th>
                    <Th>Description</Th>
                    {isDraft && <Th className="text-right">Actions</Th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
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
                      <tr key={line.id}>
                        <Td>{accountName(line.account_id)}</Td>
                        <Td>{line.debit ? Number(line.debit).toLocaleString() : '—'}</Td>
                        <Td>{line.credit ? Number(line.credit).toLocaleString() : '—'}</Td>
                        <Td>{line.description || '—'}</Td>
                        {isDraft && (
                          <Td className="text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                onClick={() => setEditingLineId(line.id)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-sm text-red-600 hover:text-red-500"
                                onClick={() => handleDeleteLine(line)}
                              >
                                Delete
                              </button>
                            </div>
                          </Td>
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </Table>
            )}

            {isDraft && (
              <div className="border-t border-gray-200 p-6 dark:border-gray-800">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Add line
                </h3>
                <div className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-4">
                    <Field label="Account">
                      <Select
                        value={newLine.account_id}
                        onChange={(e) =>
                          setNewLine((prev) => ({ ...prev, account_id: e.target.value }))
                        }
                      >
                        <option value="">Select account…</option>
                        {(accounts.data?.data ?? []).map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} — {account.name}
                          </option>
                        ))}
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
                      loading={addingLine}
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
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              Tags
            </h2>
            {(journal.tags ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">No tags attached.</p>
            ) : (
              <div className="mb-4 flex flex-wrap gap-2">
                {journal.tags?.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
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
                    value={attachTagId}
                    onChange={(e) => setAttachTagId(e.target.value)}
                  >
                    <option value="">Select tag…</option>
                    {availableTags.map((tag: Tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button
                  variant="secondary"
                  onClick={handleAttachTag}
                  loading={attachingTag}
                  disabled={!attachTagId}
                >
                  Attach
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
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
    <tr>
      <td className="px-4 py-3">
        <Select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} — {account.name}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={debit}
          onChange={(e) => setDebit(e.target.value)}
        />
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={credit}
          onChange={(e) => setCredit(e.target.value)}
        />
      </td>
      <td className="px-4 py-3">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </td>
      <td className="px-4 py-3 text-right">
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
      </td>
    </tr>
  )
}
