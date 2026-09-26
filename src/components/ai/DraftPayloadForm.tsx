import * as React from 'react'
import { Plus, Tag } from 'lucide-react'
import { api } from '../../lib/api'
import type { AiActionDraft, JournalStatus, TagType } from '../../lib/types'
import { Button, Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui'
import { AccountSelect } from '../AccountSelect'
import { LineEditor, createBlankLine, type LineDraft } from '../LineEditor'
import { LineBalanceHint } from '../LineBalanceHint'
import { TagInput } from '../TagInput'

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'] as const
const TAG_TYPES: TagType[] = ['priority', 'recurring', 'vendor', 'tax', 'transfer']
const JOURNAL_STATUSES: JournalStatus[] = ['draft', 'posted', 'archived']

/**
 * A real form for a proposed action, keyed on the tool that produced it.
 *
 * The draft payload is patched key by key rather than rebuilt, so any field this
 * form does not know about survives the round trip untouched. That matters:
 * the payload is the exact body the approval will send.
 */
export function DraftPayloadForm({
  draft,
  onChange,
}: {
  draft: AiActionDraft
  onChange: (payload: Record<string, any>) => void
}) {
  switch (draft.tool) {
    case 'journal_create':
      return <JournalCreateForm draft={draft} onChange={onChange} />
    case 'account_create':
      return <AccountCreateForm draft={draft} onChange={onChange} />
    case 'tag_create':
      return <TagCreateForm draft={draft} onChange={onChange} />
    default:
      return <UnknownToolJson draft={draft} onChange={onChange} />
  }
}

/* ---------------------------------------------------------------- journal */

function JournalCreateForm({
  draft,
  onChange,
}: {
  draft: AiActionDraft
  onChange: (payload: Record<string, any>) => void
}) {
  const payload = draft.payload ?? {}
  const tags = useTags()

  const lines: LineDraft[] = React.useMemo(
    () =>
      (Array.isArray(payload.lines) ? payload.lines : []).map((line: any) => ({
        account_id: String(line.account_id ?? ''),
        debit: line.debit == null ? '' : String(line.debit),
        credit: line.credit == null ? '' : String(line.credit),
        description: line.description ?? '',
      })),
    // Re-derive only when the server sends a different payload, not on every
    // keystroke, or the caret would jump while typing.
    [draft.payload],
  )

  const pendingAccounts = React.useMemo(
    () =>
      Array.from(
        new Set(
          lines
            .map((line) => line.account_id)
            .filter((id) => id.startsWith('pending:'))
            .map((id) => id.slice('pending:'.length)),
        ),
      ),
    [lines],
  )

  const patch = (next: Record<string, any>) => onChange({ ...payload, ...next })

  // An empty string means "leave blank" and must not overwrite a real value,
  // so nullable fields are only written when non-empty.
  const text = (key: string) => (payload[key] == null ? '' : String(payload[key]))

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tanggal" htmlFor={`${draft.id}-date`}>
          <Input
            id={`${draft.id}-date`}
            type="date"
            value={text('transaction_date')}
            onChange={(e) => patch({ transaction_date: e.target.value })}
          />
        </Field>

        <Field label="Status" htmlFor={`${draft.id}-status`}>
          <Select
            value={String(payload.status ?? 'draft')}
            onValueChange={(value) => patch({ status: value })}
          >
            <SelectTrigger id={`${draft.id}-status`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOURNAL_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Keterangan" htmlFor={`${draft.id}-description`}>
        <Input
          id={`${draft.id}-description`}
          value={text('description')}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </Field>

      <Field label="Referensi" htmlFor={`${draft.id}-reference`}>
        <Input
          id={`${draft.id}-reference`}
          placeholder="otomatis"
          value={text('reference')}
          onChange={(e) => patch({ reference: e.target.value || null })}
        />
      </Field>

      <div>
        <p className="mb-1 text-sm font-medium">Baris jurnal</p>
        <LineEditor
          lines={lines}
          onChange={(next) =>
            patch({
              lines: next.map((line) => ({
                // A blank amount has to become null, not "", or the request
                // would carry an empty string where it expects a number.
                account_id: line.account_id,
                debit: line.debit === '' ? null : line.debit,
                credit: line.credit === '' ? null : line.credit,
                ...(line.description ? { description: line.description } : {}),
              })),
            })
          }
        />
        {lines.length === 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => patch({ lines: [createBlankLine()] })}
          >
            <Plus className="size-3.5" aria-hidden />
            Tambah baris
          </Button>
        )}

        {pendingAccounts.length > 0 && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            Baris ini memakai akun yang masih berupa draft:{' '}
            <span className="font-medium">{pendingAccounts.join(', ')}</span>.
            Setujui draft akunnya dulu, baru jurnal ini — kalau tidak, akun di
            baris tersebut akan kosong.
          </p>
        )}
      </div>

      <div>
        <LineBalanceHint lines={lines} />
      </div>

      {/* Tags were previously the last field with no framing, which made them
          the easiest thing in the draft to overlook. */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Tag className="size-4 text-primary" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Tag</p>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          Tag menempel ke jurnal setiap kali template atau draft ini dipakai,
          dan dipakai untuk filter. Boleh kosong, tapi tambahkan kalau nanti
          mau gampang dicari.
        </p>
        <TagInput
          tags={tags}
          selectedIds={Array.isArray(payload.tags) ? payload.tags.map(String) : []}
          onChange={(ids) => patch({ tags: ids })}
        />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- account */

function AccountCreateForm({
  draft,
  onChange,
}: {
  draft: AiActionDraft
  onChange: (payload: Record<string, any>) => void
}) {
  const payload = draft.payload ?? {}
  const patch = (next: Record<string, any>) => onChange({ ...payload, ...next })
  const text = (key: string) => (payload[key] == null ? '' : String(payload[key]))

  return (
    <div className="space-y-3">
      <Field label="Nama akun" htmlFor={`${draft.id}-name`}>
        <Input
          id={`${draft.id}-name`}
          value={text('name')}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipe" htmlFor={`${draft.id}-type`}>
          <Select
            value={String(payload.type ?? 'asset')}
            onValueChange={(value) => patch({ type: value })}
          >
            <SelectTrigger id={`${draft.id}-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Mata uang" htmlFor={`${draft.id}-currency`}>
          <Input
            id={`${draft.id}-currency`}
            maxLength={3}
            value={text('currency')}
            onChange={(e) => patch({ currency: e.target.value.toUpperCase() })}
          />
        </Field>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">Akun induk</p>
        <AccountSelect
          value={payload.parent_id ? String(payload.parent_id) : null}
          onValueChange={(value) => patch({ parent_id: value || null })}
          placeholder="Tanpa induk (akun tingkat atas)"
          allowNone
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-input"
          checked={payload.is_header === true}
          onChange={(e) => patch({ is_header: e.target.checked })}
        />
        <span>
          Jadikan akun induk (kategori)
          <span className="block text-xs text-muted-foreground">
            Akun header tidak bisa dipakai untuk mencatat transaksi.
          </span>
        </span>
      </label>
    </div>
  )
}

/* -------------------------------------------------------------------- tag */

function TagCreateForm({
  draft,
  onChange,
}: {
  draft: AiActionDraft
  onChange: (payload: Record<string, any>) => void
}) {
  const payload = draft.payload ?? {}
  const patch = (next: Record<string, any>) => onChange({ ...payload, ...next })

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nama tag" htmlFor={`${draft.id}-name`}>
        <Input
          id={`${draft.id}-name`}
          value={payload.name == null ? '' : String(payload.name)}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </Field>

      <Field label="Tipe" htmlFor={`${draft.id}-type`}>
        <Select
          value={String(payload.type ?? 'vendor')}
          onValueChange={(value) => patch({ type: value })}
        >
          <SelectTrigger id={`${draft.id}-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAG_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}

/* ---------------------------------------------------------------- unknown */

function UnknownToolJson({
  draft,
  onChange,
}: {
  draft: AiActionDraft
  onChange: (payload: Record<string, any>) => void
}) {
  const [text, setText] = React.useState(() => JSON.stringify(draft.payload, null, 2))
  const [invalid, setInvalid] = React.useState(false)

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Belum ada form untuk <span className="font-mono">{draft.tool}</span>,
        jadi masih lewat JSON.
      </p>
      <textarea
        className="min-h-40 w-full rounded-lg border border-input bg-transparent p-2.5 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        value={text}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value)
          try {
            const parsed = JSON.parse(e.target.value)
            setInvalid(false)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              onChange(parsed)
            }
          } catch {
            setInvalid(true)
          }
        }}
      />
      {invalid && (
        <p className="text-xs text-destructive">
          JSON-nya belum valid, jadi isinya belum tersimpan.
        </p>
      )}
    </div>
  )
}

function useTags() {
  const [tags, setTags] = React.useState<import('../../lib/types').Tag[]>([])

  React.useEffect(() => {
    let active = true
    api
      .listTags({ per_page: 100 })
      .then(({ data }) => active && setTags(data))
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  return tags
}
