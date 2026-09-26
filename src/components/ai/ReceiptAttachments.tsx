import * as React from 'react'
import {
  AlertCircle,
  Clipboard,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
} from 'lucide-react'
import { ErrorBox } from '../ui'
import type { ReceiptAttachmentsState } from '../../lib/useReceiptAttachments'
import { MAX_RECEIPTS, type Receipt } from '../../lib/receiptPrompt'
import { cn } from '../../lib/utils'

/**
 * Attaching a receipt to a prompt, and nothing else.
 *
 * The file is read in the browser and never uploaded, so the only thing this adds
 * to the prompt is text. The extracted text stays editable and removable because
 * OCR on a creased, glare-lit photo of a till receipt is good at line items and
 * unreliable at the total — and the total is the number that ends up in a journal.
 * Letting the user fix it before sending is the difference between a draft and a
 * correction.
 *
 * Presentational on purpose: the state lives in `useReceiptAttachments`, because
 * the composer that folds the receipts into the prompt has to own them, and
 * because the paste handler has to be reachable from the whole composer area
 * rather than from this strip alone.
 */
export function ReceiptAttachments({
  receipts,
  onChange,
  onAttachFile,
  state,
  disabled = false,
}: {
  receipts: Receipt[]
  onChange: (receipts: Receipt[]) => void
  /** Called with a file the user chose or pasted; the reading happens upstream. */
  onAttachFile: (file: File) => void
  state: ReceiptAttachmentsState
  disabled?: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const { busy, progress, error } = state

  const atCap = receipts.length >= MAX_RECEIPTS

  const update = (id: string, text: string) => {
    onChange(receipts.map((r) => (r.id === id ? { ...r, text } : r)))
  }

  const remove = (id: string) => {
    onChange(receipts.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Clear first: picking the same file twice in a row has to fire again.
          if (inputRef.current) inputRef.current.value = ''
          if (file) onAttachFile(file)
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy != null || atCap}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {busy != null ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Paperclip className="size-3.5" aria-hidden />
          )}
          Lampirkan struk
        </button>

        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clipboard className="size-3" aria-hidden />
          {atCap ? (
            <>Sudah {MAX_RECEIPTS} struk — lepas salah satu dulu untuk menambah.</>
          ) : (
            <>atau tempel (Ctrl+V) — dibaca di browser, filenya tidak diunggah.</>
          )}
        </span>
      </div>

      {busy != null && (
        <div className="rounded-lg border border-border px-2.5 py-2">
          <p className="flex items-center gap-1.5 text-xs text-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {progress?.label ?? 'Menyiapkan'} — {busy}
          </p>
          {progress?.ratio != null && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${Math.round(progress.ratio * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {error != null && <ErrorBox error={error} />}

      {receipts.map((receipt) => (
        <div key={receipt.id} className="rounded-lg border border-border bg-muted/40 p-2.5">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{receipt.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {receipt.pages > 1 ? `${receipt.pages} halaman` : '1 halaman'}
                {receipt.partial && ' · sebagian halaman tidak terbaca'}
                {receipt.text === '' && ' · tidak ada teks terbaca'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(receipt.id)}
              aria-label={`Lampiran ${receipt.name} dilepas`}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>

          {receipt.text === '' ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
              <AlertCircle className="size-3.5" aria-hidden />
              Tidak ada teks yang terbaca. Tuliskan struknya sendiri, atau lampirkan
              foto lain.
            </p>
          ) : (
            <textarea
              className={cn(
                'mt-2 max-h-40 w-full resize-y rounded-md border border-input bg-background px-2 py-1.5',
                'font-mono text-[11px] leading-relaxed outline-none',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              )}
              rows={4}
              value={receipt.text}
              onChange={(e) => update(receipt.id, e.target.value)}
              aria-label={`Teks hasil OCR dari ${receipt.name}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
