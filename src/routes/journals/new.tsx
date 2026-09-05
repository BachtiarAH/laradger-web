import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { ApiError, api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import {
  LineEditor,
  createBlankLine,
  type LineDraft,
} from '../../components/LineEditor'
import { AiDraftPanel, type AiDraftResult } from '../../components/AiDraftPanel'
import {
  AllocationAdjustmentsPanel,
  type AdjustmentDraft,
} from '../../components/AllocationAdjustmentsPanel'
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
  const [transactionDate, setTransactionDate] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [nextReference, setNextReference] = React.useState('')
  const [referenceCustom, setReferenceCustom] = React.useState(false)
  const [customReference, setCustomReference] = React.useState('')
  const [status, setStatus] = React.useState<JournalStatus>('draft')
  const [source] = React.useState<JournalSource>('manual')
  const [lines, setLines] = React.useState<LineDraft[]>([])
  const [tagIds, setTagIds] = React.useState<string[]>([])
  const [adjustments, setAdjustments] = React.useState<AdjustmentDraft[]>([])
  const [error, setError] = React.useState<unknown>(null)
  const [saving, setSaving] = React.useState(false)

  const accounts = useFetch(() => api.listAccounts({ per_page: 20 }), [])
  const tags = useFetch(() => api.listTags({ per_page: 100 }), [])
  const nextRef = useFetch(() => api.nextJournalReference(), [])
  const lineErrors = React.useMemo<Record<number, string>>(() => {
    if (error instanceof ApiError && error.errors) {
      const map: Record<number, string> = {}
      for (const [field, msgs] of Object.entries(error.errors)) {
        const m = field.match(/^lines\.(\d+)\.account_id$/)
        if (m && msgs[0]) map[Number(m[1])] = msgs[0]
      }
      return map
    }
    return {}
  }, [error])
  const [extraTags, setExtraTags] = React.useState<Tag[]>([])
  const allTags = React.useMemo(() => [...(tags.data?.data ?? []), ...extraTags], [tags.data, extraTags])

  React.useEffect(() => {
    if (nextRef.data) {
      setNextReference(nextRef.data)
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
    if (referenceCustom) {
      const trimmed = customReference.trim()
      if (!trimmed) {
        setError(new Error('Custom reference cannot be empty — enter a value or click “Use auto-generate”.'))
        return
      }
      if (trimmed.length > 255) {
        setError(new Error('Reference must not exceed 255 characters.'))
        return
      }
    }
    const linesPayload = lines.map((line) => ({
      account_id: line.account_id,
      ...(line.debit ? { debit: Number(line.debit) } : {}),
      ...(line.credit ? { credit: Number(line.credit) } : {}),
      ...(line.description ? { description: line.description } : {}),
    }))
    const payload = {
      transaction_date: transactionDate,
      description,
      ...(referenceCustom && customReference.trim() ? { reference: customReference.trim() } : {}),
      status,
      source,
      lines: linesPayload,
      ...(tagIds.length > 0 ? { tags: tagIds } : {}),
      ...(status === 'posted' && adjustments.length > 0
        ? {
            allocation_adjustments: adjustments.map((adj) => ({
              action: adj.action,
              allocation_id: adj.allocation_id,
              account_id: adj.account_id,
              amount: Number(adj.amount),
            })),
          }
        : {}),
    } as Parameters<typeof api.createJournal>[0]

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
    const incompleteAdjustment = adjustments.find(
      (adj) =>
        !adj.account_id ||
        !adj.allocation_id ||
        !(Number(adj.amount) > 0),
    )
    if (incompleteAdjustment) {
      setError(new Error('Every allocation adjustment needs an account, an allocation, and a positive amount.'))
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
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate({ to: '/transactions/new' })}
            >
              Quick Transaction
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate({ to: '/journals' })}
            >
              Back
            </Button>
          </div>
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
              {referenceCustom ? (
                <Field label="Reference" htmlFor="reference">
                  <Input
                    id="reference"
                    value={customReference}
                    onChange={(e) => setCustomReference(e.target.value)}
                    placeholder={nextReference ? `Auto: ${nextReference}` : 'Custom reference'}
                    maxLength={255}
                  />
                  <div className="mt-1 flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setReferenceCustom(false)
                        setCustomReference('')
                      }}
                    >
                      Use auto-generate
                    </Button>
                  </div>
                </Field>
              ) : (
                <Field label="Reference">
                  <div className="flex items-center gap-2">
                    <Input disabled value="Auto-generated" className="font-mono" />
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 px-2.5"
                      onClick={() => setReferenceCustom(true)}
                    >
                      Custom
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Will be generated server-side (JRN-YYYY-XXXX, unique per tenant, retry-safe). Click Custom to set manually — not sent when auto, so no race.</p>
                </Field>
              )}
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
            <LineEditor
              lines={lines}
              onChange={(next) => {
                setLines(next)
                if (error instanceof ApiError && error.errors) {
                  const hasLineErr = Object.keys(error.errors).some((k) => k.startsWith('lines.'))
                  if (hasLineErr) setError(null)
                }
              }}
              lineErrors={lineErrors}
            />
          </Card>

          <Card className="p-6">
            <AllocationAdjustmentsPanel
              status={status}
              lineAccountIds={lines.map((line) => line.account_id).filter(Boolean)}
              adjustments={adjustments}
              onChange={setAdjustments}
            />
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