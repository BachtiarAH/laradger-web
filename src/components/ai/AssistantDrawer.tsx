import { Link } from '@tanstack/react-router'
import * as React from 'react'
import {
  Bot,
  Inbox,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { usePendingDrafts } from '../../lib/pendingDrafts'
import { composePrompt, messageBudget } from '../../lib/receiptPrompt'
import { useReceiptAttachments } from '../../lib/useReceiptAttachments'
import type {
  AiActionDraft,
  AiConversation,
  AiMessage,
  AiTurnOutcome,
} from '../../lib/types'
import { Button, ErrorBox } from '../ui'
import { DraftCard } from './DraftCard'
import { MarkdownText } from './MarkdownText'
import { PromptLength } from './PromptLength'
import { ReceiptAttachments } from './ReceiptAttachments'
import { TurnOutcome } from './TurnOutcome'
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
  // Only what this conversation proposed. The pending count lives in the sidebar
  // next to AI Drafts, which is where drafts from the queued path are too - a
  // count here would promise actions this drawer does not show.
  const [drafts, setDrafts] = React.useState<AiActionDraft[]>([])
  const { refresh: refreshPendingBadge } = usePendingDrafts()
  // How many actions the last turn added to AI Drafts, or null when the last turn
  // proposed nothing. The drafts are already persisted by the time the reply
  // arrives, so the only thing missing is saying so and giving the user a way
  // across - the drawer lists this conversation's drafts, not the whole queue.
  const [added, setAdded] = React.useState<number | null>(null)
  // Set when the turn deliberately proposed nothing. Without it a refusal to
  // double-book a transaction is just an empty turn, indistinguishable from a
  // failure, and the reference that would make it actionable has nowhere to show.
  const [outcome, setOutcome] = React.useState<AiTurnOutcome | null>(null)
  const [input, setInput] = React.useState('')
  // Receipts live beside the message, not inside it: they are read in the browser
  // and the text is folded in on send, so the transcript stays a conversation
  // rather than a wall of OCR output.
  const attachments = useReceiptAttachments()
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

  const start = async () => {
    setSending(true)
    setError(null)
    try {
      const created = await api.createAiConversation()
      setConversation(created)
      setMessages([])
      setDrafts([])
      // A notice about the previous conversation's drafts would be a lie here.
      setAdded(null)
      setOutcome(null)
      attachments.reset()
    } catch (err) {
      setError(err)
    } finally {
      setSending(false)
    }
  }

  const { receipts } = attachments
  const prompt = React.useMemo(() => composePrompt(input, receipts), [input, receipts])

  const send = async () => {
    // A receipt on its own is a valid prompt — "here, book this" — so the message
    // box does not have to be filled in for there to be something to send.
    if (prompt === '' || sending) return

    const sent = prompt
    const keepReceipts = receipts
    const optimisticId = `local-${messages.length}`

    setInput('')
    attachments.reset()
    setSending(true)
    setError(null)

    try {
      let target = conversation
      if (!target) {
        target = await api.createAiConversation()
        setConversation(target)
      }

      // Show what was actually sent, not what was typed: a receipt can be trimmed
      // to fit the limit, and a bubble that disagreed with the request would make
      // the transcript a lie.
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          role: 'user',
          content: sent,
          tool_calls: null,
          created_at: new Date().toISOString(),
        },
      ])

      const turn = await api.sendAiMessage(target.id, sent)

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
      setOutcome(turn.outcome)

      if (turn.drafts.length > 0) {
        // The sidebar badge counts these too and it is not on this screen. Its own
        // 60s timer would make an action that was just built look like nothing
        // happened, which is the one thing this turn must not do.
        refreshPendingBadge()
        setAdded(turn.drafts.length)
      }
    } catch (err) {
      setError(err)
      // Re-OCRing a receipt to retry costs the user the whole upload again, so the
      // attachments come back — and the bubble that showed them goes with them, so
      // a retry does not leave the transcript showing the request twice.
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      attachments.replaceAll(keepReceipts)
    } finally {
      setSending(false)
    }
  }

  const handleSettled = (settled: AiActionDraft) => {
    setDrafts((prev) => prev.map((d) => (d.id === settled.id ? settled : d)))
    // The sidebar badge counts these too, and it is not on this screen.
    refreshPendingBadge()
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
        // Anywhere in the drawer, not just the message box: a screenshot is usually
        // pasted while the cursor happens to be in the transcript. A text paste is
        // left alone, so this never interferes with typing.
        onPaste={attachments.pasteImage}
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

          {outcome != null && drafts.length === 0 && (
            <TurnOutcome
              outcome={outcome.outcome}
              reason={outcome.reason}
              reference={outcome.reference}
            />
          )}

          {error != null && <ErrorBox error={error} />}
        </div>

        {/* Pinned rather than left in the transcript: the reply that produced these
            is at the bottom of a scrolling list, and a draft nobody notices is a
            transaction nobody books. Dismissible, so a conversation that keeps
            proposing things does not keep shouting. */}
        {added != null && (
          <div
            role="status"
            className="flex items-start gap-2 border-t border-border bg-amber-50 px-4 py-3 dark:bg-amber-950/40"
          >
            <Inbox className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-foreground">
                {added} aksi sudah masuk ke <span className="font-semibold">AI Drafts</span>.
                Belum ada yang berubah &mdash; semuanya menunggu kamu setujui.
              </p>
              <Link
                to="/ai/drafts"
                onClick={() => setOpen(false)}
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Buka AI Drafts untuk meninjaunya
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setAdded(null)}
              aria-label="Tutup pemberitahuan draft"
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        )}

        <footer className="space-y-2 border-t border-border p-3">
          <ReceiptAttachments
            receipts={receipts}
            onChange={attachments.replaceAll}
            onAttachFile={attachments.attachFile}
            state={attachments.state}
            disabled={sending}
          />

          <div className="flex items-end gap-2">
            <textarea
              className="min-h-10 flex-1 resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
              rows={1}
              placeholder={receipts.length > 0 ? 'Contoh: catat struk ini…' : 'Tanya sesuatu…'}
              value={input}
              // Capped below the server limit while a receipt is attached, so a
              // long message costs a few sentences rather than the attachment the
              // user cannot cheaply re-upload.
              maxLength={messageBudget(receipts.length)}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <Button onClick={send} loading={sending} disabled={prompt === ''}>
              <Send className="size-4" aria-hidden />
            </Button>
          </div>

          <PromptLength used={prompt.length} />
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
