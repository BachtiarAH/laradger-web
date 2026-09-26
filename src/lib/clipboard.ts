/**
 * Deciding what a paste event should do.
 *
 * Separate from the React handler so the decision is testable without a browser:
 * "is this an image, and may I stop the browser pasting it?" is the part that is
 * easy to get subtly wrong, and getting it wrong either breaks pasting text or
 * silently drops a screenshot.
 */

/** The slice of `DataTransferItem` this module needs. */
export type ClipboardItemLike = {
  kind: string
  type: string
  getAsFile?: () => File | null
}

export type ClipboardImage = {
  file: File
  /**
   * True when the clipboard also carries text.
   *
   * Copying an image out of a web page puts both an image and the page's markup
   * on the clipboard, so this is the common case and not the exotic one. The text
   * still belongs in the message box.
   */
  hasText: boolean
}

/**
 * Vector images are not something a raster OCR engine can read, and they turn up
 * when an inline `<svg>` is copied. Better to let the paste through untouched
 * than to fail recognition on a file the user reasonably expected to work.
 */
const UNREADABLE = ['image/svg+xml']

/**
 * The first image on the clipboard, or null if there is nothing to attach.
 *
 * Returns null for a plain text paste so the caller can leave the event alone
 * entirely — that is the normal case and it must keep working.
 */
export function pickClipboardImage(
  items: ArrayLike<ClipboardItemLike> | null | undefined,
): ClipboardImage | null {
  if (items == null) return null

  const list = Array.from(items)

  const hasText = list.some(
    (item) => item.kind === 'string' && item.type.startsWith('text/'),
  )

  for (const item of list) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    if (UNREADABLE.includes(item.type)) continue

    // Some browsers advertise an image type and then hand back nothing, so this
    // cannot be trusted to exist.
    const file = item.getAsFile?.()
    if (file == null || file.size === 0) continue

    return { file, hasText }
  }

  return null
}

/**
 * A name for a pasted image, since the clipboard does not supply a useful one.
 *
 * `getAsFile()` on a pasted image yields a file called "image.png" on Chrome and
 * an empty name elsewhere. Left alone, every paste would be called the same thing
 * in the prompt — and two receipts both named `image.png` cannot be told apart
 * when the assistant refers to them.
 */
export function clipboardFileName(type: string, sequence: number): string {
  // `||` rather than `??`: a type like `image/` yields an empty subtype, and
  // `??` would let that through as a filename ending in a bare dot.
  const subtype = type.split('/')[1]?.split('+')[0] || 'png'
  return `klipboard-${sequence}.${subtype}`
}
