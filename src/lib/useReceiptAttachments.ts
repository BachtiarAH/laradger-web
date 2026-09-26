import * as React from 'react'
import { clipboardFileName, pickClipboardImage } from './clipboard'
import { readReceipt, toReceipt, type OcrProgress } from './ocr'
import { MAX_RECEIPTS, type Receipt } from './receiptPrompt'

export type ReceiptAttachmentsState = {
  /** The file currently being read, or null. Drives the spinner and the label. */
  busy: string | null
  progress: OcrProgress | null
  error: unknown
}

/**
 * Receipts for one composer: the list, the OCR run, and the paste handler.
 *
 * Shared by the assistant drawer and the AI Drafts page because the two need
 * identical behaviour, and because the state has to live wherever `receipts` does —
 * the composer that folds them into a prompt on send.
 *
 * The list is only ever updated through `setReceipts` with an updater, never from
 * a captured copy. Reading `receipts` out of the render closure is what makes the
 * second attachment of a session overwrite the first when two reads overlap, and
 * a slow OCR makes overlapping reads the normal case rather than a rare one.
 */
export function useReceiptAttachments() {
  const [receipts, setReceipts] = React.useState<Receipt[]>([])
  const [busy, setBusy] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState<OcrProgress | null>(null)
  const [error, setError] = React.useState<unknown>(null)

  // A ref, not `busy`: two pastes in the same tick both see the pre-update state
  // and would start two OCR runs over the same list.
  const reading = React.useRef(false)
  const pastedCount = React.useRef(0)

  const attachFile = React.useCallback(async (file: File) => {
    if (reading.current) return
    reading.current = true

    setBusy(file.name)
    setError(null)
    setProgress({ label: 'Menyiapkan', ratio: null })

    try {
      const result = await readReceipt(file, setProgress)
      setReceipts((previous) =>
        previous.length >= MAX_RECEIPTS ? previous : [...previous, toReceipt(result)],
      )
    } catch (err) {
      setError(err)
    } finally {
      reading.current = false
      setBusy(null)
      setProgress(null)
    }
  }, [])

  const pasteImage = React.useCallback(
    (event: React.ClipboardEvent) => {
      const picked = pickClipboardImage(event.clipboardData?.items)

      // Nothing to attach: leave the event completely alone, so pasting a word
      // into the message box keeps working.
      if (picked === null) return

      // Only swallow the paste when there is no text to insert. An image copied
      // from a web page brings its markup along, and that markup is usually what
      // the user wanted in the message box.
      if (!picked.hasText) event.preventDefault()

      // Every pasted image is called `image.png` by the clipboard, so it is
      // renamed here: the name is the only thing telling two receipts apart once
      // they are in the prompt, and the assistant refers to them by it.
      pastedCount.current += 1
      const renamed = new File(
        [picked.file],
        clipboardFileName(picked.file.type, pastedCount.current),
        { type: picked.file.type },
      )

      void attachFile(renamed)
    },
    [attachFile],
  )

  const update = React.useCallback((id: string, text: string) => {
    setReceipts((previous) =>
      previous.map((receipt) => (receipt.id === id ? { ...receipt, text } : receipt)),
    )
  }, [])

  const remove = React.useCallback((id: string) => {
    setReceipts((previous) => previous.filter((receipt) => receipt.id !== id))
  }, [])

  const replaceAll = React.useCallback((next: Receipt[]) => {
    setReceipts(next)
  }, [])

  const reset = React.useCallback(() => {
    setReceipts([])
    setError(null)
    setProgress(null)
  }, [])

  return {
    receipts,
    state: { busy, progress, error } satisfies ReceiptAttachmentsState,
    attachFile,
    pasteImage,
    update,
    remove,
    replaceAll,
    reset,
  }
}
