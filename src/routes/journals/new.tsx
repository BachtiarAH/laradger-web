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
import { AiDraftPanel, type AiDraftResult } from '../../components/AiDraftPanel'
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
} from '../../components/ui'
import type { JournalSource, JournalStatus, Tag } from '../../lib/types'
import { TagInput } from '../../components/TagInput'

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

  const accounts = useFetch(() => api.listAccounts({ per_page: 20 }), [])
  const tags = useFetch(() => api.listTags({ per_page: 100 }), [])
  const nextRef = useFetch(() => api.nextJournalReference(), [])
  const [extraTags, setExtraTags] = React.useState<Tag[]>([])
  const allTags = React.useMemo(() => [...(tags.data?.data ?? []), ...extraTags], [tags.data, extraTags])

  React.useEffect(() => {
    if (nextRef.data && !reference) {
      setReference(nextRef.data)
    }
  }, [nextRef.data]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (lines.length === 0) {
      setLines([createBlankLine()])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyDraft = (result: AiDraftResult) => {
    if (result.transaction_date) {
      setTransactionDate(result.transaction_date.slice(0, 10))
    }
    if (result.description) {
      setDescription(result.description)
    }
    if (result.lines.length > 0) {
      setLines(
        result.lines.map((line) => ({
          account_id: line.account_id,
          debit: line.debit ?? '',
          credit: line.credit ?? '',
          description: line.description ?? '',
        })),
      )
    }
    if (result.tagIds.length > 0) {
      setTagIds(result.tagIds)
    }
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

      {tags.loading ? (
        <Card className="p-4"><LoadingBox label="Loading tags…" /></Card>
      ) : (
        <>
          <AiDraftPanel
            accounts={accounts.data?.data ?? []}
            tags={allTags}
            onApply={handleApplyDraft}
          />
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
                  value={status}
                  onValueChange={(value) => setStatus(value as JournalStatus)}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">draft</SelectItem>
                    <SelectItem value="posted">posted</SelectItem>
                  </SelectContent>
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
            <h2 className="text-lg font-semibold text-foreground">
              Lines
            </h2>
            <LineEditor lines={lines} onChange={setLines} />
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-foreground">
              Tags
            </h2>
            <TagInput tags={allTags} selectedIds={tagIds} onChange={setTagIds} onTagCreated={(t) => setExtraTags((prev) => [...prev, t])} />
          </Card>

          {error != null && <ErrorBox error={error} />}
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              Create journal
            </Button>
          </div>
          </form>
        </>
      )}
    </RequireAuth>
  )
}