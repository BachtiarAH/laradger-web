import * as React from 'react'
import { api } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import type { JournalTemplate, JournalTemplatePeriod, Tag } from '../lib/types'
import {
  Button,
  ErrorBox,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui'
import { LineEditor, createBlankLine, type LineDraft } from './LineEditor'
import { TagInput } from './TagInput'

const PERIODS: { value: JournalTemplatePeriod; label: string }[] = [
  { value: 'daily', label: 'Harian (setiap hari)' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
]

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function toLineDraft(line?: {
  account_id: string
  debit: string | number | null
  credit: string | number | null
  description: string | null
}): LineDraft {
  if (!line) return createBlankLine()
  return {
    account_id: line.account_id,
    debit: line.debit != null ? String(line.debit) : '',
    credit: line.credit != null ? String(line.credit) : '',
    description: line.description ?? '',
  }
}

export function TemplateForm({
  initial,
  onSubmit,
  submitLabel = 'Save',
  loading,
}: {
  initial?: JournalTemplate | null
  onSubmit: (payload: Parameters<typeof api.createJournalTemplate>[0]) => Promise<void>
  submitLabel?: string
  loading?: boolean
}) {
  const [name, setName] = React.useState(initial?.name ?? '')
  const [description, setDescription] = React.useState(initial?.description ?? '')
  const [periodType, setPeriodType] = React.useState<JournalTemplatePeriod>(
    initial?.period_type ?? 'daily',
  )
  const [dayOfWeek, setDayOfWeek] = React.useState(
    initial?.day_of_week != null ? String(initial.day_of_week) : '1',
  )
  const [dayOfMonth, setDayOfMonth] = React.useState(
    initial?.day_of_month != null ? String(initial.day_of_month) : '1',
  )
  const [isActive, setIsActive] = React.useState(initial?.is_active ?? true)
  const [lines, setLines] = React.useState<LineDraft[]>(
    initial?.lines && initial.lines.length > 0
      ? initial.lines.map(toLineDraft)
      : [createBlankLine()],
  )
  const [tagIds, setTagIds] = React.useState<string[]>(
    initial?.tags?.map((t) => t.id) ?? [],
  )
  const [error, setError] = React.useState<unknown>(null)

  const accounts = useFetch(() => api.listAccounts({ per_page: 100 }), [])
  const tags = useFetch(() => api.listTags({ per_page: 100 }), [])
  const [extraTags, setExtraTags] = React.useState<Tag[]>([])
  const allTags = React.useMemo(() => [...(tags.data?.data ?? []), ...extraTags], [tags.data, extraTags])

  const buildPayload = () => {
    const base = {
      name,
      ...(description ? { description } : {}),
      period_type: periodType,
      is_active: isActive,
      lines: lines.map((line) => ({
        account_id: line.account_id,
        ...(line.debit ? { debit: Number(line.debit) } : {}),
        ...(line.credit ? { credit: Number(line.credit) } : {}),
        ...(line.description ? { description: line.description } : {}),
      })),
      ...(tagIds.length > 0 ? { tags: tagIds } : {}),
    }
    if (periodType === 'weekly') {
      return { ...base, day_of_week: Number(dayOfWeek), day_of_month: null }
    }
    if (periodType === 'monthly') {
      return { ...base, day_of_month: Number(dayOfMonth), day_of_week: null }
    }
    return { ...base, day_of_week: null, day_of_month: null }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!lines[0]?.account_id) {
      setError(new Error('Each line must have an account selected.'))
      return
    }
    try {
      await onSubmit(buildPayload())
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <Input
            id="name"
            required
            maxLength={255}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Description" htmlFor="description">
          <Input
            id="description"
            maxLength={255}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Periodisitas" htmlFor="period_type">
          <Select
            value={periodType}
            onValueChange={(v) => setPeriodType(v as JournalTemplatePeriod)}
          >
            <SelectTrigger id="period_type" className="w-full min-w-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {periodType === 'weekly' && (
          <Field label="Hari dalam minggu" htmlFor="day_of_week">
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger id="day_of_week" className="w-full min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day, index) => (
                  <SelectItem key={index} value={String(index)}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {periodType === 'monthly' && (
          <Field label="Tanggal dalam bulan" htmlFor="day_of_month">
            <Input
              id="day_of_month"
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
            />
          </Field>
        )}
        <div className="flex min-w-0 items-end pb-2">
          <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 shrink-0 rounded border-input" />
            <span className="min-w-0 break-words leading-tight">Aktif (otomatis dibuat tiap periode)</span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Lines</h3>
        <LineEditor accounts={accounts.data?.data} lines={lines} onChange={setLines} />
      </div>

      <Field label="Tags">
        <TagInput tags={allTags} selectedIds={tagIds} onChange={setTagIds} onTagCreated={(t) => setExtraTags((prev) => [...prev, t])} />
      </Field>

      <p className="text-xs text-muted-foreground">
        Jurnal yang dibuat dari template ini berstatus draft dengan nominal default di atas — Anda tetap bisa mengeditnya sebelum di-post.
      </p>

      {error != null && <ErrorBox error={error} />}
      <div className="flex gap-2">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
