import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { Inbox, RefreshCw, Sparkles } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type { AiActionDraft, AiDraftStatus } from '../../lib/types'
import { Button, ErrorBox, LoadingBox, PageHeader } from '../../components/ui'
import { DraftCard } from '../../components/ai/DraftCard'
import { cn } from '../../lib/utils'

export const Route = createFileRoute('/ai/drafts')({
  component: AiDraftsPage,
})

type Filter = 'pending' | 'executed' | 'rejected' | 'failed' | 'all'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'pending', label: 'Perlu ditinjau' },
  { value: 'executed', label: 'Sudah dijalankan' },
  { value: 'failed', label: 'Gagal' },
  { value: 'rejected', label: 'Dibuang' },
  { value: 'all', label: 'Semua' },
]

/**
 * Every proposed action across all conversations.
 *
 * The assistant works in the background, so this is where a user comes back to
 * decide what actually happened. Nothing on this page has been applied until it
 * is approved.
 */
function AiDraftsPage() {
  const { token, user, tenants } = useAuth()
  const canUseTenants = (user?.tenants?.length ?? 0) > 0 || tenants.length > 0

  const [filter, setFilter] = React.useState<Filter>('pending')
  const [drafts, setDrafts] = React.useState<AiActionDraft[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [counts, setCounts] = React.useState<Record<string, number>>({})

  const load = React.useCallback(async (which: Filter) => {
    setLoading(true)
    setError(null)
    try {
      // The pending set drives the badge counts, so it is always worth having.
      const [pending, all] = await Promise.all([
        api.listAiDrafts('pending'),
        which === 'all' ? api.listAiDrafts() : Promise.resolve(null),
      ])

      const list =
        which === 'pending'
          ? pending
          : which === 'all'
            ? (all ?? [])
            : await api.listAiDrafts(which as AiDraftStatus)

      setDrafts(list)
      setCounts({ pending: pending.length })
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!token || !canUseTenants) return
    void load(filter)
  }, [token, canUseTenants, filter, load])

  const handleSettled = (settled: AiActionDraft) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === settled.id ? settled : d)),
    )
    // Approving or discarding clears it from the "needs review" view.
    if (filter === 'pending' && settled.status !== 'pending') {
      setDrafts((prev) => prev.filter((d) => d.id !== settled.id))
    }
  }

  if (!token || !canUseTenants) {
    return (
      <PageHeader
        title="Draft AI"
        subtitle="Pilih organisasi terlebih dahulu untuk melihat draft."
      />
    )
  }

  const pendingCount = counts.pending ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Draft AI"
        subtitle="Semua tindakan yang disiapkan asisten. Belum ada yang berubah sampai kamu menyetujuinya."
        actions={
          <Button variant="secondary" onClick={() => load(filter)} loading={loading}>
            <RefreshCw className="size-4" aria-hidden />
            Muat ulang
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
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

      {error != null && <ErrorBox error={error} />}

      {loading && drafts.length === 0 ? (
        <LoadingBox label="Memuat draft…" />
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
          {filter === 'pending' ? (
            <>
              <Inbox className="size-6 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium text-foreground">
                Tidak ada draft yang perlu ditinjau
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Minta asisten lewat tombol{' '}
                <Sparkles className="inline size-3.5 align-text-bottom" aria-hidden /> di
                pojok kanan bawah, lalu cek kembali di sini nanti.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tidak ada draft pada filter ini.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} onSettled={handleSettled} />
          ))}
        </div>
      )}
    </div>
  )
}
