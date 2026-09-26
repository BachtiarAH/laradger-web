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
import { LineBalanceHint } from './LineBalanceHint'
import { TagInput } from './TagInput'

const PERIODS: { value: JournalTemplatePeriod; label: string }[] = [
  { value: 'daily', label: 'Harian (setiap hari)' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
]

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const NO_ALLOCATION = '__none__'

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
  const [showOnDashboard, setShowOnDashboard] = React.useState(initial?.show_on_dashboard ?? true)
  const [allocationId, setAllocationId] = React.useState(
    initial?.allocation_id ?? NO_ALLOCATION,
  )
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
  const allocations = useFetch(
    () => api.listAllocations({ status: 'active', per_page: 100 }),
    [],
  )
  const [extraTags, setExtraTags] = React.useState<Tag[]>([])
  const allTags = React.useMemo(() => [...(tags.data?.data ?? []), ...extraTags], [tags.data, extraTags])
  const allocationOptions = allocations.data?.data ?? []

  const buildPayload = () => {
    const base = {
      name,
      ...(description ? { description } : {}),
      period_type: periodType,
      is_active: isActive,
      show_on_dashboard: showOnDashboard,
      allocation_id: allocationId === NO_ALLOCATION ? null : allocationId,
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
        <div className="flex min-w-0 flex-col gap-2 pb-2">
          <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 shrink-0 rounded border-input" />
            <span className="min-w-0 break-words leading-tight">Aktif (otomatis dibuat tiap periode)</span>
          </label>
          <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={showOnDashboard} onChange={(e) => setShowOnDashboard(e.target.checked)} className="h-4 w-4 shrink-0 rounded border-input" />
            <span className="min-w-0 break-words leading-tight">Tampilkan di dashboard</span>
          </label>
        </div>
      </div>

      <p className="-mt-2 text-xs text-muted-foreground">
        Template yang tidak ditampilkan tetap berjalan dan membuat jurnal sesuai jadwalnya.
      </p>

      <Field label="Allocation" htmlFor="journal-template-allocation">
        <Select value={allocationId} onValueChange={setAllocationId}>
          <SelectTrigger id="journal-template-allocation" className="w-full">
            <SelectValue placeholder="Auto-detect (no explicit allocation)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_ALLOCATION}>Auto-detect (no explicit allocation)</SelectItem>
            {allocationOptions.map((allocation) => (
              <SelectItem key={allocation.id} value={allocation.id}>
                {allocation.name}
              </SelectItem>
            ))}
            {initial?.allocation && !allocationOptions.some((allocation) => allocation.id === initial.allocation?.id) && (
              <SelectItem value={initial.allocation.id}>
                {initial.allocation.name} · Current
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Auto-detect wins when all expense lines match one active allocation. The selected allocation is only a fallback when there is no match; no match means no allocation, while multiple or partial matches stop generation.
        </p>
        {allocations.error != null && (
          <p className="mt-1 text-xs text-destructive">Failed to load allocations.</p>
        )}
      </Field>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Lines</h3>
        <LineEditor accounts={accounts.data?.data} lines={lines} onChange={setLines} />
        <LineBalanceHint lines={lines} />
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
