import * as React from 'react'
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Sparkles,
  Tag,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { AiActionDraft } from '../../lib/types'
import { Button, ErrorBox } from '../ui'
import { DraftPayloadForm } from './DraftPayloadForm'
import { DraftSummary } from './DraftSummary'
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
  const [payload, setPayload] = React.useState<Record<string, any>>(draft.payload)
  const [busy, setBusy] = React.useState<null | 'execute' | 'reject' | 'save'>(null)
  const [error, setError] = React.useState<unknown>(null)

  const pending = draft.status === 'pending'
  const failed = draft.status === 'failed'
  // Mirrors the server's `isEditable`. A failed draft is normally failed because
  // the payload is wrong, and the fix is to correct it and run it again — hiding
  // the buttons here would leave the only option being to throw it away and ask
  // the assistant to produce the same thing a second time.
  const actionable = pending || failed
  const dirty = React.useMemo(
    () => JSON.stringify(payload) !== JSON.stringify(draft.payload),
    [payload, draft.payload],
  )

  // What one click will actually do, counting only the drafts still to run. A
  // prerequisite already applied is skipped server-side, so counting it would
  // promise work that does not happen.
  const dependsOn = draft.depends_on ?? []
  const chain = dependsOn.filter(
    (dependency) => dependency.status === 'pending' || dependency.status === 'failed',
  )
  // Rejected or failed prerequisites can never be run, so the server refuses the
  // whole chain. Saying so up front beats a 409 the user has to interpret.
  const blocked = dependsOn.filter(
    (dependency) =>
      dependency.status !== 'pending' &&
      dependency.status !== 'failed' &&
      dependency.status !== 'executed',
  )

  // A settled draft is immutable server-side, so freeze the local copy.
  React.useEffect(() => {
    if (!editing) setPayload(draft.payload)
  }, [draft.payload, editing])

  /** @returns whether the save succeeded, so callers can gate on it. */
  const handleSave = async (): Promise<boolean> => {
    setBusy('save')
    setError(null)
    try {
      const saved = await api.updateAiDraft(draft.id, payload)
      onSettled(saved)
      setEditing(false)
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      setBusy(null)
    }
  }

  const handleExecute = async () => {
    // Approving sends the *stored* payload, so unsaved edits have to land
    // first. If the save fails, stop: running the old payload while the form
    // shows the new one would approve something the user never reviewed.
    if (dirty && !(await handleSave())) return

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
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
            <ActionPill tool={draft.tool} />
          </div>
          <p className="mt-1 truncate text-sm font-medium text-foreground">
            {draft.title}
          </p>
        </div>
        <StatusPill status={draft.status} />
      </div>

      {actionable && blocked.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Tidak bisa dijalankan: {blocked.map((d) => `&ldquo;${d.title}&rdquo;`).join(', ')}{' '}
            sudah dibuang atau gagal. Ubah isi draft ini untuk melepas referensinya.
          </span>
        </p>
      )}

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

      {/* A rejected or failed draft is read-only: there is nothing left to edit. */}
      {editing && actionable ? (
        <div className="mt-3 space-y-3">
          <DraftPayloadForm draft={{ ...draft, payload }} onChange={setPayload} />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} loading={busy === 'save'}>
              Simpan perubahan
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setPayload(draft.payload)
                setEditing(false)
              }}
              disabled={busy !== null}
            >
              Batal
            </Button>
            {dirty && (
              <span className="text-xs text-muted-foreground">
                Belum disimpan — menyetujui akan menyimpannya dulu.
              </span>
            )}
          </div>
        </div>
      ) : (
        <>
          {expanded && (
            <div className="mt-3">
              <DraftSummary draft={{ ...draft, payload }} />
            </div>
          )}

          {actionable && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* The button says what it will do, not just that it acts. A chain is
                  one decision — the drafts it covers are all on screen — so it is
                  offered as one click rather than as a puzzle about ordering. */}
              {chain.length > 0 && (
                <p className="w-full text-[11px] text-muted-foreground">
                  Menjalankan ini juga akan membuat, berurutan:{' '}
                  {chain.map((dependency) => dependency.title).join(' → lalu → ')}
                </p>
              )}

              <Button
                size="sm"
                onClick={handleExecute}
                loading={busy === 'execute'}
                disabled={busy !== null || blocked.length > 0}
              >
                <Check className="size-4" aria-hidden />
                {chain.length > 0
                  ? `Setujui ${chain.length + 1} draft`
                  : failed
                    ? 'Coba lagi'
                    : 'Setujui & jalankan'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditing(true)}
                disabled={busy !== null}
              >
                <Pencil className="size-3.5" aria-hidden />
                Ubah isi
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

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <ChevronUp className="size-3.5" aria-hidden />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden />
            )}
            {expanded ? 'Sembunyikan detail' : 'Lihat detail'}
          </button>
        </>
      )}
    </div>
  )
}

/**
 * What the action does, in words.
 *
 * A raw tool name says what the *code* calls it, not what will happen to the
 * ledger, and it is the only thing distinguishing a journal from a tag at a
 * glance. Anything not listed here falls back to the tool name rather than a
 * generic word, so a new tool is never silently unlabelled.
 */
const ACTION_META: Record<string, { label: string; icon: LucideIcon; className: string }> = {
  journal_create: {
    label: 'Jurnal',
    icon: BookOpen,
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  },
  tag_create: {
    label: 'Tag',
    icon: Tag,
    className: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  },
  account_create: {
    label: 'Akun',
    icon: Wallet,
    className: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
  },
}

function ActionPill({ tool }: { tool: string }) {
  const meta = ACTION_META[tool]
  const Icon = meta?.icon

  return (
    <span
      title={tool}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        meta?.className ?? 'bg-muted text-muted-foreground',
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden />}
      {meta?.label ?? tool}
    </span>
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
