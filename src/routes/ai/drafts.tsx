import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type {
  AiActionDraft,
  AiDraftRequest,
  AiDraftStatus,
} from '../../lib/types'
import { Button, ErrorBox, PageHeader } from '../../components/ui'
import { DraftCard } from '../../components/ai/DraftCard'
import { MarkdownText } from '../../components/ai/MarkdownText'
import { cn } from '../../lib/utils'

export const Route = createFileRoute('/ai/drafts')({
  component: AiDraftsPage,
})

const POLL_INTERVAL_MS = 2500

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
  const [requests, setRequests] = React.useState<AiDraftRequest[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  const [filter, setFilter] = React.useState<Filter>('pending')
  const [drafts, setDrafts] = React.useState<AiActionDraft[]>([])
  // Only the refresh button shows a spinner; the list never blanks.
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<unknown>(null)
  const [pendingCount, setPendingCount] = React.useState(0)

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

  React.useEffect(() => {
    if (!ready) return
    void loadRequests()
    if (!inFlight) return
    const timer = setInterval(() => {
      void loadRequests()
      void loadDrafts(filter)
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [ready, inFlight, filter, loadRequests, loadDrafts])

  const submit = async () => {
    const text = prompt.trim()
    if (!text || submitting) return

    setPrompt('')
    setSubmitting(true)
    setError(null)
    try {
      const created = await api.createAiDraftRequest(text)
      // Show it immediately, already in the queue.
      setRequests((prev) => [created, ...prev])
    } catch (err) {
      setError(err)
      setPrompt(text)
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

      <Card>
        <label htmlFor="draft-prompt" className="text-sm font-medium text-foreground">
          Prompt untuk didraft
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Diproses di belakang layar, jadi tidak perlu menunggu. Hasilnya tetap
          perlu kamu setujui sebelum ada yang berubah.
        </p>
        <div className="mt-3 flex items-end gap-2">
          <textarea
            id="draft-prompt"
            rows={2}
            value={prompt}
            maxLength={4000}
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
          <Button onClick={submit} loading={submitting} disabled={!prompt.trim()}>
            <Send className="size-4" aria-hidden />
            Kirim
          </Button>
        </div>
      </Card>

      {error != null && <ErrorBox error={error} />}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          Riwayat prompt
          {requests.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {requests.length} dikirim
            </span>
          )}
        </h2>
        {requests.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Belum ada prompt yang dikirim.
          </p>
        ) : (
          <ul className="space-y-2">
            {requests.map((request) => (
              <RequestRow key={request.id} request={request} />
            ))}
          </ul>
        )}
      </section>

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
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">{children}</div>
  )
}

/** One submitted prompt, with where it got to. */
function RequestRow({ request }: { request: AiDraftRequest }) {
  const status = statusMeta(request)

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

        {/* A queued turn can still have something to say. Hiding it would make
            an assistant that asked a sensible question look like a failure. */}
        {request.reply && (
          <details className="mt-2 rounded border border-border bg-muted/40 px-2.5 py-2">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Lihat jawaban asisten
            </summary>
            <div className="mt-2 text-xs text-foreground">
              <MarkdownText text={request.reply} />
            </div>
          </details>
        )}

        {request.status === 'completed' && request.drafts_count === 0 && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Tidak ada draft yang dibuat. Buka asistente di pojok kanan bawah
            untuk lanjutkan obrolan soal prompt ini.
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
        label:
          request.drafts_count > 0
            ? 'Selesai — menunggu persetujuan'
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
