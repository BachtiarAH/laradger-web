import { MAX_MESSAGE_CHARS } from '../../lib/receiptPrompt'

/**
 * How much of the prompt budget is gone, said only when it matters.
 *
 * Silent most of the time: a counter that is always on trains people to ignore it.
 * It appears once an attachment is close to the limit, which is the only moment
 * the number changes what someone should do — trim the receipt, or type less.
 * The prompt itself also carries a visible marker where it was cut, so this is a
 * warning rather than the only signal.
 */
export function PromptLength({ used }: { used: number }) {
  const near = used > MAX_MESSAGE_CHARS * 0.9
  if (!near) return null

  const over = used > MAX_MESSAGE_CHARS

  return (
    <p
      className={
        over
          ? 'text-right text-[11px] text-destructive'
          : 'text-right text-[11px] text-amber-700 dark:text-amber-300'
      }
    >
      {used.toLocaleString('id-ID')} / {MAX_MESSAGE_CHARS.toLocaleString('id-ID')} karakter
      {over ? ' — teks struk akan dipotong' : ' — ruang tersisa tipis'}
    </p>
  )
}
