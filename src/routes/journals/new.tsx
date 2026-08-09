import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import {
  LineEditor,
  createBlankLine,
  type LineDraft,
} from '../../components/LineEditor'
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  LoadingBox,
  PageHeader,
  Select,
} from '../../components/ui'
import type { JournalSource, JournalStatus } from '../../lib/types'

export const Route = createFileRoute('/journals/new')({
  component: NewJournalPage,
})

function NewJournalPage() {
  const navigate = useNavigate()
  const [transactionDate, setTransactionDate] = React.useState(
    () => new Date().toISOString().slice(0, 10),
  )
  const [description, setDescription] = React.useState('')
  const [reference, setReference] = React.useState('')
  const [status, setStatus] = React.useState<JournalStatus>('draft')
  const [source] = React.useState<JournalSource>('manual')
  const [lines, setLines] = React.useState<LineDraft[]>([])
  const [tagIds, setTagIds] = React.useState<string[]>([])
  const [error, setError] = React.useState<unknown>(null)
  const [saving, setSaving] = React.useState(false)

  const accounts = useFetch(() => api.listAccounts({ per_page: 100 }), [])
  const tags = useFetch(() => api.listTags({ per_page: 100 }), [])

  React.useEffect(() => {
    if (accounts.data && lines.length === 0) {
      setLines([createBlankLine(accounts.data.data)])
    }
  }, [accounts.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTag = (id: string) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const payload = {
      transaction_date: transactionDate,
      description,
      reference,
      status,
      source,
      lines: lines.map((line) => ({
        account_id: line.account_id,
        ...(line.debit ? { debit: Number(line.debit) } : {}),
        ...(line.credit ? { credit: Number(line.credit) } : {}),
        ...(line.description ? { description: line.description } : {}),
      })),
      ...(tagIds.length > 0 ? { tags: tagIds } : {}),
    }

    if (!payload.lines[0]?.account_id) {
      setError(new Error('Each line must have an account selected.'))
      return
    }
    const hasAmount = payload.lines.some(
      (line) => (line.debit ?? 0) > 0 || (line.credit ?? 0) > 0,
    )
    if (!hasAmount) {
      setError(new Error('At least one line must have a debit or credit amount.'))
      return
    }

    setSaving(true)
    try {
      const result = await api.createJournal(payload)
      navigate({
        to: '/journals/$journalId',
        params: { journalId: result.data.id },
      })
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <RequireAuth>
      <PageHeader
        title="New journal"
        subtitle="Create a journal entry with balanced debit/credit lines"
        actions={
          <Button
            variant="secondary"
            onClick={() => navigate({ to: '/journals' })}
          >
            Back
          </Button>
        }
      />

      {accounts.loading || tags.loading ? (
        <Card className="p-4"><LoadingBox label="Loading accounts and tags…" /></Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Field label="Transaction date" htmlFor="transaction_date">
                <Input
                  id="transaction_date"
                  type="date"
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </Field>
              <Field label="Reference" htmlFor="reference">
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </Field>
              <Field label="Status" htmlFor="status">
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as JournalStatus)}
                >
                  <option value="draft">draft</option>
                  <option value="posted">posted</option>
                </Select>
              </Field>
              <Field label="Source" htmlFor="source">
                <Input id="source" disabled value={source} />
              </Field>
            </div>
            <Field label="Description" htmlFor="description">
              <Input
                id="description"
                required
                maxLength={255}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Lines
            </h2>
            <LineEditor accounts={accounts.data?.data ?? []} lines={lines} onChange={setLines} />
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tags
            </h2>
            {tags.data?.data.length === 0 ? (
              <p className="text-sm text-gray-500">No tags available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.data?.data.map((tag) => (
                  <label
                    key={tag.id}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                      tagIds.includes(tag.id)
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={tagIds.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            )}
          </Card>

          {error != null && <ErrorBox error={error} />}
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              Create journal
            </Button>
          </div>
        </form>
      )}
    </RequireAuth>
  )
}
