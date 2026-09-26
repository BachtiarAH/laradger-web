import * as React from 'react'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import type {
  AiActionDraft,
  AiConversation,
  AiConversationStatus,
  AiMessage,
} from '../../lib/types'
import { Button, ErrorBox } from '../ui'
import { DraftCard } from './DraftCard'
import { MarkdownText } from './MarkdownText'
import { cn } from '../../lib/utils'

const POLL_INTERVAL_MS = 2000

/**
 * The assistant, as a drawer.
 *
 * Sending a message only queues a turn: the reply and any proposed actions are
 * produced in the background, so the user can close this and come back. The
 * drawer polls a lightweight status endpoint while work is in flight and stops
 * as soon as it settles.
 */
export function AssistantDrawer() {
  const [open, setOpen] = React.useState(false)
  const [conversation, setConversation] = React.useState<AiConversation | null>(null)
  const [messages, setMessages] = React.useState<AiMessage[]>([])
  const [drafts, setDrafts] = React.useState<AiActionDraft[]>([])
  const [status, setStatus] = React.useState<AiConversationStatus>('idle')
  const [statusError, setStatusError] = React.useState<string | null>(null)
  const [input, setInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<unknown>(null)

  const busy = status === 'queued' || status === 'running'
  const pending = drafts.filter((d) => d.status === 'pending').length
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const scrollToEnd = React.useCallback(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [])

  React.useEffect(() => {
    if (open) scrollToEnd()
  }, [open, messages.length, drafts.length, scrollToEnd])

  const applyConversation = React.useCallback(
    (data: {
      conversation: AiConversation
      messages: AiMessage[]
      drafts: AiActionDraft[]
    }) => {
      setConversation(data.conversation)
      setMessages(data.messages)
      setDrafts(data.drafts)
      setStatus(data.conversation.status)
      setStatusError(data.conversation.error)
    },
    [],
  )

  // Poll while a turn is in flight. Cleared on unmount and when it settles, so
  // a closed drawer is not still hitting the API.
  React.useEffect(() => {
    if (!open || !busy || !conversation) return

    let cancelled = false

    const tick = async () => {
      try {
        const next = await api.getAiTurnStatus(conversation.id)
        if (cancelled) return
        setStatus(next.status)
        setStatusError(next.error)
        if (next.status !== 'queued' && next.status !== 'running') {
          // Settled: pull the transcript and the drafts it produced.
          applyConversation(await api.getAiConversation(conversation.id))
        }
      } catch (err) {
        if (!cancelled) setError(err)
      }
    }

    const timer = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [open, busy, conversation, applyConversation])

  // The badge counts pending drafts even while the drawer is shut.
  React.useEffect(() => {
    if (open) return
    let active = true
    api
      .listAiDrafts('pending')
      .then((all) => active && setDrafts(all))
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [open])

  const start = async () => {
    setSending(true)
    setError(null)
    try {
      const created = await api.createAiConversation()
      setConversation(created)
      setMessages([])
      setDrafts([])
      setStatus('idle')
      setStatusError(null)
    } catch (err) {
      setError(err)
    } finally {
      setSending(false)
    }
  }

  const send = async () => {
    const message = input.trim()
    if (!message || sending || busy) return

    setInput('')
    setSending(true)
    setError(null)

    try {
      let target = conversation
      if (!target) {
        target = await api.createAiConversation()
        setConversation(target)
      }

      // Show the words immediately; the server has already recorded them.
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${prev.length}`,
          role: 'user',
          content: message,
          tool_calls: null,
          created_at: new Date().toISOString(),
        },
      ])

      const accepted = await api.sendAiMessage(target.id, message)
      setStatus(accepted.status)
      setStatusError(null)
    } catch (err) {
      setError(err)
    } finally {
      setSending(false)
    }
  }

  const handleSettled = (settled: AiActionDraft) => {
    setDrafts((prev) => prev.map((d) => (d.id === settled.id ? settled : d)))
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka asisten AI"
        className="fixed bottom-5 right-5 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Sparkles className="size-5" aria-hidden />
        {pending > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
            {pending}
          </span>
        )}
        {busy && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-sky-500 text-white">
            <Loader2 className="size-3 animate-spin" aria-hidden />
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-label="Asisten AI"
        className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">Asisten AI</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mulai percakapan baru"
              onClick={start}
              disabled={sending || busy}
            >
              <MessageSquarePlus className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tutup"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </header>

        {conversation && (
          <button
            type="button"
            onClick={() =>
              api
                .getAiConversation(conversation.id)
                .then(applyConversation)
                .catch(setError)
            }
            className="border-b border-border px-4 py-2 text-left text-xs text-muted-foreground hover:bg-muted"
          >
            Muat ulang percakapan ini
          </button>
        )}

        <StatusBanner status={status} message={statusError} />

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !busy && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Tanya apa saja tentang pembukuan.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>&ldquo;Berapa yang bisa saya keluarkan bulan ini?&rdquo;</li>
                <li>&ldquo;Saya expend 45.500 di belanja, bayar tunai&rdquo;</li>
                <li>&ldquo;Buatkan akun baru untuk biaya listrik&rdquo;</li>
              </ul>
              <p className="mt-3 text-xs">
                Permintaan dikerjakan di latar belakang, jadi tidak perlu menunggu.
                Setiap tindakan yang mengubah data akan menunggu persetujuan kamu
                dulu.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {drafts.length > 0 && (
            <section className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tindakan yang perlu ditinjau
              </h3>
              {drafts.map((draft) => (
                <DraftCard key={draft.id} draft={draft} onSettled={handleSettled} />
              ))}
            </section>
          )}

          {error != null && <ErrorBox error={error} />}
        </div>

        <footer className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              className="min-h-10 flex-1 resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
              rows={1}
              placeholder="Tulis pertanyaan atau instruksi…"
              value={input}
              maxLength={4000}
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <Button onClick={send} loading={sending} disabled={!input.trim() || busy}>
              <Send className="size-4" aria-hidden />
            </Button>
          </div>
          {busy && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Kamu boleh menutup panel ini, hasilnya nanti muncul di daftar draft.
            </p>
          )}
        </footer>
      </aside>
    </div>
  )
}

function StatusBanner({
  status,
  message,
}: {
  status: AiConversationStatus
  message: string | null
}) {
  if (status === 'idle') return null

  if (status === 'queued' || status === 'running') {
    return (
      <p className="flex items-center gap-2 border-b border-border bg-sky-50 px-4 py-2 text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-200">
        <Loader2 className="size-3.5 animate-spin shrink-0" aria-hidden />
        {status === 'queued' ? 'Terjadwal, menunggu worker…' : 'Sedang dikerjakan…'}
      </p>
    )
  }

  if (status === 'failed') {
    return (
      <p className="flex items-start gap-2 border-b border-border bg-red-50 px-4 py-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>{message ?? 'Permintaan gagal diproses.'}</span>
      </p>
    )
  }

  return (
    <p className="flex items-center gap-2 border-b border-border bg-emerald-50 px-4 py-2 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
      Selesai. Periksa draft di bawah sebelum menyetujuinya.
    </p>
  )
}

function MessageBubble({ message }: { message: AiMessage }) {
  if (message.role === 'tool') return null

  const isUser = message.role === 'user'
  const called = message.tool_calls ?? []

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'whitespace-pre-wrap bg-primary text-primary-foreground'
            : 'border border-border bg-muted text-foreground',
        )}
      >
        {isUser ? (
          message.content
        ) : (
          <MarkdownText text={message.content ?? ''} />
        )}
      </div>
      {called.length > 0 && (
        <p className="px-1 text-[11px] text-muted-foreground">
          Dicek: {called.map((call) => call.name).join(', ')}
        </p>
      )}
    </div>
  )
}
