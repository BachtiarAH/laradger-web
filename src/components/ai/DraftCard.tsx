import * as React from 'react'
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Sparkles,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { AiActionDraft } from '../../lib/types'
import { Button, ErrorBox } from '../ui'
import { cn } from '../../lib/utils'

/**
 * One proposed action. Nothing here has happened yet — the approve button is
 * the only thing that causes it to.
 */
export function DraftCard({
  draft,
  onSettled,
}: {
  draft: AiActionDraft
  onSettled: (draft: AiActionDraft) => void
}) {
  const [expanded, setExpanded] = React.useState(draft.kind === 'write')
  const [editing, setEditing] = React.useState(false)
  const [text, setText] = React.useState(() => JSON.stringify(draft.payload, null, 2))
  const [busy, setBusy] = React.useState<null | 'execute' | 'reject' | 'save'>(null)
  const [error, setError] = React.useState<unknown>(null)

  const pending = draft.status === 'pending'

  const handleSave = async () => {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(text)
    } catch {
      setError(new Error('The payload is not valid JSON.'))
      return
    }

    setBusy('save')
    setError(null)
    try {
      onSettled(await api.updateAiDraft(draft.id, parsed))
      setEditing(false)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  const handleExecute = async () => {
    setBusy('execute')
    setError(null)
    try {
      onSettled(await api.executeAiDraft(draft.id))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  const handleReject = async () => {
    setBusy('reject')
    setError(null)
    try {
      onSettled(await api.rejectAiDraft(draft.id))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3',
        pending ? 'border-primary/40' : 'border-border opacity-80',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{draft.title}</span>
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {draft.tool}
          </p>
        </div>
        <StatusPill status={draft.status} />
      </div>

      {pending && (
        <p className="mt-2 text-xs text-muted-foreground">
          Belum ada yang berubah. Periksa dulu, lalu setujui kalau sudah benar.
        </p>
      )}

      {draft.status === 'executed' && draft.result && (
        <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {resultSummary(draft)}
        </p>
      )}

      {draft.error && (
        <p className="mt-2 flex items-start gap-1.5 rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {draft.error}
        </p>
      )}

      {error != null && <ErrorBox error={error} />}

      {pending && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handleExecute}
            loading={busy === 'execute'}
            disabled={busy !== null}
          >
            <Check className="size-4" aria-hidden />
            Setujui &amp; jalankan
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditing((v) => !v)}
            disabled={busy !== null}
          >
            <Pencil className="size-3.5" aria-hidden />
            {editing ? 'Tutup editor' : 'Ubah isi'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={handleReject}
            loading={busy === 'reject'}
            disabled={busy !== null}
          >
            <X className="size-4" aria-hidden />
            Buang
          </Button>
        </div>
      )}

      {editing && pending ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Isi persis seperti yang akan dikirim.
          </p>
          <textarea
            className="min-h-40 w-full rounded-lg border border-input bg-transparent p-2.5 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            value={text}
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} loading={busy === 'save'}>
              Simpan perubahan
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setText(JSON.stringify(draft.payload, null, 2))
                setEditing(false)
              }}
            >
              Batal
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <ChevronUp className="size-3.5" aria-hidden />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden />
            )}
            {expanded ? 'Sembunyikan detail' : 'Lihat yang akan dikirim'}
          </button>
          {expanded && (
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 font-mono text-[11px] leading-relaxed">
              {JSON.stringify(draft.payload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: AiActionDraft['status'] }) {
  const map: Record<AiActionDraft['status'], { label: string; className: string }> = {
    pending: {
      label: 'menunggu',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    },
    executed: {
      label: 'dijalankan',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    },
    rejected: {
      label: 'dibuang',
      className: 'bg-muted text-muted-foreground',
    },
    failed: {
      label: 'gagal',
      className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
    },
  }
  const item = map[status]

  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
        item.className,
      )}
    >
      {item.label}
    </span>
  )
}

/** A one-line "what actually happened", built from the tool result. */
function resultSummary(draft: AiActionDraft): string {
  const result = draft.result ?? {}
  const reference = result.reference ?? result.code ?? result.id

  if (draft.tool === 'journal_create' && reference) {
    return `Jurnal ${reference} dibuat dengan status ${result.status ?? 'draft'}.`
  }

  if (result.id) {
    return `${draft.title} — berhasil dibuat.`
  }

  return `${draft.title} — berhasil dijalankan.`
}
