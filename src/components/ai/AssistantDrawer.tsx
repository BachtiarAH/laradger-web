import { Link } from '@tanstack/react-router'
import * as React from 'react'
import {
  Bot,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { AiActionDraft, AiConversation, AiMessage } from '../../lib/types'
import { Button, ErrorBox } from '../ui'
import { DraftCard } from './DraftCard'
import { MarkdownText } from './MarkdownText'
import { cn } from '../../lib/utils'

/**
 * The assistant, as a drawer.
 *
 * Chatting is synchronous: the reply comes back with the request, because the
 * user is waiting for it. Work that does not need an answer right now goes
 * through the drafting input on the AI Drafts page, which is queued.
 */
export function AssistantDrawer() {
  const [open, setOpen] = React.useState(false)
  const [conversation, setConversation] = React.useState<AiConversation | null>(null)
  const [messages, setMessages] = React.useState<AiMessage[]>([])
  const [drafts, setDrafts] = React.useState<AiActionDraft[]>([])
  // The badge is its own count, deliberately not the draft list. `listAiDrafts`
  // is not scoped to a conversation, so folding it into `drafts` made the drawer
  // open on a wall of cards from the Drafts page that had nothing to do with the
  // chat the user was looking at.
  const [pendingCount, setPendingCount] = React.useState(0)
  const [input, setInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<unknown>(null)

  const scrollRef = React.useRef<HTMLDivElement>(null)

  const scrollToEnd = React.useCallback(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [])

  React.useEffect(() => {
    if (open) scrollToEnd()
  }, [open, messages.length, drafts.length, scrollToEnd])

  // The badge counts pending drafts even while the drawer is shut.
  React.useEffect(() => {
    if (open) return
    let active = true
    api
      .listAiDrafts('pending')
      .then((all) => active && setPendingCount(all.length))
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
    } catch (err) {
      setError(err)
    } finally {
      setSending(false)
    }
  }

  const send = async () => {
    const message = input.trim()
    if (!message || sending) return

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

      const turn = await api.sendAiMessage(target.id, message)

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${prev.length}`,
          role: 'assistant',
          content: turn.reply,
          tool_calls: null,
          created_at: new Date().toISOString(),
        },
      ])

      setDrafts((prev) => [...prev, ...turn.drafts])
    } catch (err) {
      setError(err)
    } finally {
      setSending(false)
    }
  }

  const handleSettled = (settled: AiActionDraft) => {
    setDrafts((prev) => prev.map((d) => (d.id === settled.id ? settled : d)))
    if (settled.status !== 'pending') {
      setPendingCount((n) => Math.max(0, n - 1))
    }
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
        {pendingCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
            {pendingCount}
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
              disabled={sending}
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
                .then((data) => {
                  setConversation(data.conversation)
                  setMessages(data.messages)
                  setDrafts(data.drafts)
                })
                .catch(setError)
            }
            className="border-b border-border px-4 py-2 text-left text-xs text-muted-foreground hover:bg-muted"
          >
            Muat ulang percakapan ini
          </button>
        )}

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !sending && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Tanya apa saja tentang pembukuan.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>&ldquo;Berapa yang bisa saya keluarkan bulan ini?&rdquo;</li>
                <li>&ldquo;Akun mana yang hasn&rsquo;t ada transaksinya?&rdquo;</li>
                <li>&ldquo;Jelaskan jurnal saya minggu ini&rdquo;</li>
              </ul>
              <p className="mt-3 text-xs">
                Untuk mencatat transaksi tanpa menunggu, pakai input di halaman{' '}
                <span className="font-medium">AI Drafts</span>.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              // Only the last user turn is still awaiting its reply.
              pending={sending && index === messages.length - 1 && message.role === 'user'}
            />
          ))}

          {drafts.length > 0 && (
            <section className="space-y-2 pt-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Diusulkan di percakapan ini
                </h3>
                <Link
                  to="/ai/drafts"
                  className="text-[11px] font-medium text-primary hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Semua draft
                </Link>
              </div>
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
              placeholder="Tanya sesuatu…"
              value={input}
              maxLength={4000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <Button onClick={send} loading={sending} disabled={!input.trim()}>
              <Send className="size-4" aria-hidden />
            </Button>
          </div>
        </footer>
      </aside>
    </div>
  )
}

function MessageBubble({
  message,
  pending = false,
}: {
  message: AiMessage
  pending?: boolean
}) {
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
      {pending && (
        <p className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Menjawab…
        </p>
      )}
    </div>
  )
}
