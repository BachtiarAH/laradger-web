import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  Send,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { composePrompt, messageBudget } from '../../lib/receiptPrompt'
import { useReceiptAttachments } from '../../lib/useReceiptAttachments'
import type {
  AiActionDraft,
  AiDraftRequest,
  AiDraftStatus,
} from '../../lib/types'
import { Button, ErrorBox, PageHeader } from '../../components/ui'
import { DraftCard } from '../../components/ai/DraftCard'
import { MarkdownText } from '../../components/ai/MarkdownText'
import { PromptLength } from '../../components/ai/PromptLength'
import { ReceiptAttachments } from '../../components/ai/ReceiptAttachments'
import { TurnOutcome } from '../../components/ai/TurnOutcome'
import { usePendingDrafts } from '../../lib/pendingDrafts'
import { cn } from '../../lib/utils'

export const Route = createFileRoute('/ai/drafts')({
  component: AiDraftsPage,
})

/**
 * How often the page re-reads the status of submitted prompts, opening up as the
 * wait goes on. A turn that is going to finish usually finishes inside the first
 * couple of ticks; one that is not usually has no worker behind it.
 */
const BACKOFF_MS = [2500, 2500, 5000, 10000, 15000, 30000]

type Filter = 'pending' | 'executed' | 'failed' | 'rejected' | 'all'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'pending', label: 'Perlu ditinjau' },
  { value: 'executed', label: 'Sudah dijalankan' },
  { value: 'failed', label: 'Gagal' },
  { value: 'rejected', label: 'Dibuang' },
  { value: 'all', label: 'Semua' },
]

/**
 * Queued drafting, and every action the assistant has proposed.
 *
 * The input at the top queues a prompt rather than waiting for an answer — each
 * Enter adds a row below showing whether it is still queued, already running,
 * done, or failed. That is the difference from the assistant drawer, which
 * replies straight away.
 */
function AiDraftsPage() {
  const { token, user, tenants } = useAuth()
  const canUseTenants = (user?.tenants?.length ?? 0) > 0 || tenants.length > 0
  const ready = Boolean(token) && canUseTenants

  const [prompt, setPrompt] = React.useState('')
  // Receipts are read in the browser and folded into the prompt on submit, so a
  // batch can be queued from photographs without the server ever seeing a file.
  const attachments = useReceiptAttachments()
  const { receipts } = attachments
  const [requests, setRequests] = React.useState<AiDraftRequest[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  const [filter, setFilter] = React.useState<Filter>('pending')
  const [drafts, setDrafts] = React.useState<AiActionDraft[]>([])
  // Only the refresh button shows a spinner; the list never blanks.
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<unknown>(null)
  const [pendingCount, setPendingCount] = React.useState(0)
  const { refresh: refreshPendingBadge } = usePendingDrafts()

  const loadDrafts = React.useCallback(async (which: Filter) => {
    setLoading(true)
    try {
      const list =
        which === 'all' ? await api.listAiDrafts() : await api.listAiDrafts(which as AiDraftStatus)
      setDrafts(list)
      setPendingCount((await api.listAiDrafts('pending')).length)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRequests = React.useCallback(async () => {
    try {
      setRequests(await api.listAiDraftRequests())
    } catch {
      // The list is supplementary; a failure here must not blank the page.
    }
  }, [])

  React.useEffect(() => {
    if (!ready) return
    void loadDrafts(filter)
  }, [ready, filter, loadDrafts])

  // Follow submitted work only while something is actually in flight.
  const inFlight = requests.some(
    (r) => r.status === 'queued' || r.status === 'running',
  )

  const [visible, setVisible] = React.useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  )

  React.useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  /**
   * A turn only produces drafts when it finishes, so while one is in flight the
   * draft list cannot have changed. Polling it anyway was two of the three
   * requests per tick, spent on a list that was not going to differ — and the
   * whole tick at 2.5s worked out to 72 requests a minute against a 30/min limit,
   * so a queued prompt throttled the page watching it.
   */
  const settledKey = React.useMemo(
    () =>
      requests
        .filter((r) => r.status === 'completed' || r.status === 'failed')
        .map((r) => `${r.id}:${r.status}`)
        .sort()
        .join('|'),
    [requests],
  )

  const seenSettled = React.useRef<string | null>(null)

  React.useEffect(() => {
    // The first value is the initial load, which the mount effect already covers.
    if (seenSettled.current === null) {
      seenSettled.current = settledKey
      return
    }

    if (seenSettled.current === settledKey) return
    seenSettled.current = settledKey

    void loadDrafts(filter)
    // A turn that just finished is the one moment new drafts appear on their own,
    // and the sidebar badge counts exactly those. Its own 60s timer would make a
    // finished prompt look like nothing came of it.
    refreshPendingBadge()
  }, [settledKey, filter, loadDrafts, refreshPendingBadge])

  React.useEffect(() => {
    if (!ready) return
    void loadRequests()
  }, [ready, loadRequests])

  // Only the request statuses are polled, and only on a visible tab. A prompt with
  // no worker behind it waits forever, so the interval opens up the longer it is
  // asked and nothing has moved rather than spending the whole budget on a queue
  // position that is not going to change on its own.
  React.useEffect(() => {
    if (!ready || !inFlight || !visible) return

    let cancelled = false
    let step = 0
    let timer = 0

    const tick = async () => {
      await loadRequests()
      if (cancelled) return

      const delay = BACKOFF_MS[Math.min(step, BACKOFF_MS.length - 1)]
      step += 1
      timer = window.setTimeout(tick, delay)
    }

    timer = window.setTimeout(tick, BACKOFF_MS[0])

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [ready, inFlight, visible, loadRequests])

  const composed = React.useMemo(() => composePrompt(prompt, receipts), [prompt, receipts])

  const submit = async () => {
    const text = composed
    if (text === '' || submitting) return

    setPrompt('')
    attachments.reset()
    setSubmitting(true)
    setError(null)
    try {
      const created = await api.createAiDraftRequest(text)
      // Show it immediately, already in the queue.
      setRequests((prev) => [created, ...prev])
    } catch (err) {
      setError(err)
      // The attachments are already OCR'd; losing them to a failed POST would mean
      // making the user upload the same photographs again.
      setPrompt(prompt)
      attachments.replaceAll(receipts)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSettled = (settled: AiActionDraft) => {
    setDrafts((prev) => prev.map((d) => (d.id === settled.id ? settled : d)))
    if (filter === 'pending' && settled.status !== 'pending') {
      setDrafts((prev) => prev.filter((d) => d.id !== settled.id))
      setPendingCount((n) => Math.max(0, n - 1))
    }
    // Approving here is what the sidebar badge is counting, so it has to hear
    // about it. Its own timer would correct this a minute later, which is
    // indistinguishable from the number being wrong.
    refreshPendingBadge()
  }

  if (!ready) {
    return (
      <PageHeader
        title="Draft AI"
        subtitle="Pilih organisasi terlebih dahulu untuk melihat draft."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Draft AI"
        subtitle="Kirim prompt untuk dikerjakan di latar belakang. Setiap prompt masuk antrean dan hasilnya tinggal kamu periksa di sini."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              void loadRequests()
              void loadDrafts(filter)
            }}
            loading={loading}
          >
            <RefreshCw className="size-4" aria-hidden />
            Muat ulang
          </Button>
        }
      />

      {/* The paste handler sits on the composer card rather than the textarea, so a
          screenshot pasted while the cursor is anywhere in the prompt area is
          picked up. A text paste is left untouched. */}
      <Card onPaste={attachments.pasteImage}>
        <label htmlFor="draft-prompt" className="text-sm font-medium text-foreground">
          Prompt untuk didraft
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Diproses di belakang layar, jadi tidak perlu menunggu. Hasilnya tetap
          perlu kamu setujui sebelum ada yang berubah.
        </p>

        <div className="mt-3">
          <ReceiptAttachments
            receipts={receipts}
            onChange={attachments.replaceAll}
            onAttachFile={attachments.attachFile}
            state={attachments.state}
            disabled={submitting}
          />
        </div>

        <div className="mt-3 flex items-end gap-2">
          <textarea
            id="draft-prompt"
            rows={2}
            value={prompt}
            maxLength={messageBudget(receipts.length)}
            placeholder="e.g. Catat pengeluaran 45.500 di belanja, 120.000 di bensin, dibayar tunai"
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submit()
              }
            }}
            className="min-h-16 flex-1 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          <Button onClick={submit} loading={submitting} disabled={composed === ''}>
            <Send className="size-4" aria-hidden />
            Kirim
          </Button>
        </div>

        <PromptLength used={composed.length} />
      </Card>

      {error != null && <ErrorBox error={error} />}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Draft yang tersedia</h2>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filter === item.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.label}
                {item.value === 'pending' && pendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* No loading state for the list: drafts already on screen stay there
            while a refresh runs, so nothing blanks out. The refresh button
            carries the spinner. */}
        {drafts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
            <Inbox className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              Belum ada draft di sini
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Kirim prompt di atas, atau minta lewat asisten di pojok kanan
              bawah.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {drafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} onSettled={handleSettled} />
            ))}
          </div>
        )}
      </section>

      <PromptHistory requests={requests} />
    </div>
  )
}

/**
 * Submitted prompts, kept below the actions and folded away by default.
 *
 * This list only grows, and it used to sit above the draft cards, so after a
 * handful of prompts the thing you actually came to review was a scroll away.
 * Work in flight stays visible whatever the toggle says, because a queued turn
 * is live state and a hidden spinner reads as a hang.
 */
function PromptHistory({ requests }: { requests: AiDraftRequest[] }) {
  const [open, setOpen] = React.useState(false)
  const inFlight = requests.filter(
    (r) => r.status === 'queued' || r.status === 'running',
  )
  const settled = requests.length - inFlight.length
  const visible = open ? requests : inFlight

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          Riwayat prompt
          {requests.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {requests.length} dikirim
            </span>
          )}
        </h2>
        {requests.length > inFlight.length && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {open ? (
              <ChevronUp className="size-3.5" aria-hidden />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden />
            )}
            {open ? 'Sembunyikan riwayat' : `Lihat riwayat (${settled} selesai)`}
          </button>
        )}
      </div>

      {requests.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Belum ada prompt yang dikirim.
        </p>
      ) : visible.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">
          {settled} prompt selesai, semuanya disembunyikan. Buka di atas kalau
          perlu melihat jawabannya.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((request) => (
            <RequestRow key={request.id} request={request} />
          ))}
        </ul>
      )}
    </section>
  )
}

function Card({
  children,
  onPaste,
}: {
  children: React.ReactNode
  onPaste?: React.ClipboardEventHandler<HTMLDivElement>
}) {
  return (
    <div
      onPaste={onPaste}
      className="rounded-xl bg-card p-5 ring-1 ring-foreground/10"
    >
      {children}
    </div>
  )
}

/** One submitted prompt, with where it got to. */
function RequestRow({ request }: { request: AiDraftRequest }) {
  const status = statusMeta(request)
  // A turn that declined on purpose is not an empty result, so the outcome and
  // the reply *are* this row rather than something extra to expand.
  const declined =
    request.status === 'completed' &&
    request.drafts_count === 0 &&
    request.outcome != null

  return (
    <li className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
      <span className="mt-0.5 shrink-0">{status.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{request.prompt}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {status.label}
          {request.drafts_count > 0 && ` · ${request.drafts_count} draft`}
          {request.completed_at && ` · ${formatWhen(request.completed_at)}`}
        </p>

        {request.error && (
          <p className="mt-1 text-xs text-destructive">{request.error}</p>
        )}

        {declined && (
          <TurnOutcome
            className="mt-2"
            outcome={request.outcome!}
            reason={request.outcome_reason}
            reference={request.outcome_reference}
          />
        )}

        {/* A queued turn can still have something to say, and so can a turn that
            proposed nothing — there the reply is the answer, not a footnote. */}
        {request.reply && (
          <details
            open={declined}
            className="mt-2 rounded border border-border bg-muted/40 px-2.5 py-2"
          >
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Lihat jawaban asisten
            </summary>
            <div className="mt-2 text-xs text-foreground">
              <MarkdownText text={request.reply} />
            </div>
          </details>
        )}

        {/* No outcome and no stored reply is the only genuinely unexplained
            result, and the only one worth asking about. */}
        {request.status === 'completed' &&
          request.drafts_count === 0 &&
          !declined &&
          !request.reply && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Tidak ada draft yang dibuat dan tidak ada penjelasan yang tersimpan.
              Buka asisten di pojok kanan bawah untuk menanyakan prompt ini.
            </p>
          )}
      </div>
    </li>
  )
}

function statusMeta(request: AiDraftRequest): { label: string; icon: React.ReactNode } {
  switch (request.status) {
    case 'queued':
      return {
        label: 'In queue — menunggu worker',
        icon: (
          <span className="flex size-5 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <Plus className="size-3" aria-hidden />
          </span>
        ),
      }
    case 'running':
      return {
        label: 'In progress',
        icon: (
          <span className="flex size-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Loader2 className="size-3 animate-spin" aria-hidden />
          </span>
        ),
      }
    case 'completed':
      return {
        // A turn that proposed nothing on purpose has a verdict, not a shortfall.
        // "Selesai — belum ada draft" on a deliberate refusal reads as a failure and
        // is what sent the user to the assistant to ask what had already been said.
        label:
          request.drafts_count === 0 && request.outcome === 'already_recorded'
            ? 'Selesai — sudah tercatat, tidak diduplikasi'
            : request.drafts_count > 0
              ? 'Selesai — menunggu persetujuan'
              : request.outcome != null
                ? 'Selesai — tidak ada yang perlu dicatat'
                : 'Selesai — belum ada draft',
        icon: (
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="size-3" aria-hidden />
          </span>
        ),
      }
    default:
      return {
        label: 'Gagal',
        icon: (
          <span className="flex size-5 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
            <AlertCircle className="size-3" aria-hidden />
          </span>
        ),
      }
  }
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}
