import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import tesseractWorkerUrl from 'tesseract.js/dist/worker.min.js?url'
import type { Receipt } from './receiptPrompt'

/**
 * Reading a receipt, in the browser.
 *
 * The image or PDF never leaves the device: it is decoded and recognised here,
 * and only the resulting text is sent — as ordinary text, inside the prompt the
 * user already types. That is the whole reason this runs client-side. A server
 * that accepted uploads would have to store them, virus-scan them, size-limit
 * them, and then run OCR on its own CPU, for something the browser can do with
 * the bytes it already has.
 *
 * The trade is honesty about the limits: tesseract reads a picture of a receipt,
 * not the receipt. Expect good line-item text and unreliable totals, which is why
 * the extracted text is editable before it is sent and every resulting draft still
 * waits for a human to approve it.
 *
 * Tesseract's WASM core and its language data are fetched from a CDN on first use;
 * only the worker script is bundled. That is the cheapest way to avoid committing
 * ~15MB of model binaries, and it is the one thing here that needs a network. Set
 * `corePath` and `langPath` in `createWorker` to self-host if that ever stops
 * being acceptable.
 */

/** Indonesian receipts mix Latin text with the odd local word; `ind+eng` covers both. */
const OCR_LANGUAGES = 'ind+eng'

/** Enough for a receipt booklet; more is a scan of something else. */
const MAX_PDF_PAGES = 5

/**
 * Receipts are photographed at a slight angle and are small on the page. Scale 2
 * is the usual sweet spot between legibility and the seconds OCR spends per page.
 */
const PDF_RENDER_SCALE = 2

/** A 40MP phone photo is already past the point where more pixels help. */
const MAX_FILE_BYTES = 25 * 1024 * 1024

const ACCEPTED = 'image/*,application/pdf'

export type OcrProgress = {
  /** Already-human, because this is shown verbatim while someone waits. */
  label: string
  /** 0..1, or null when the work does not report a fraction. */
  ratio: number | null
}

export type ReceiptText = {
  /** The file name, so the user can tell two receipts apart in the transcript. */
  name: string
  pages: number
  text: string
  /** True when pages were left unread, so the text is knowingly incomplete. */
  partial: boolean
}

// Tesseract's own status vocabulary, translated once here rather than at each call
// site. Anything unrecognised falls through to the raw status, which is still
// better than showing a user a tesseract constant.
const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'Menyiapkan mesin OCR',
  'initializing tesseract': 'Menyiapkan mesin OCR',
  'loading language traineddata': 'Mengunduh model bahasa',
  'initializing api': 'Menyiapkan pengenalan',
  'recognizing text': 'Membaca teks',
}

let worker: TesseractWorker | null = null

/**
 * The logger is bound when the worker is created, but the worker is reused, so
 * progress is routed through a mutable sink instead of a captured callback —
 * otherwise the second receipt would report into the first one's unmounted
 * component and appear to hang.
 */
let progressSink: ((progress: OcrProgress) => void) | null = null

type TesseractWorker = {
  recognize: (image: File | HTMLCanvasElement) => Promise<{ data: { text: string } }>
  terminate: () => Promise<unknown>
}

export const RECEIPT_ACCEPT = ACCEPTED

/**
 * One worker for the whole session. Building it pulls the WASM core and ~15MB of
 * language data, so paying that per receipt would make the second one feel broken.
 * Call {@link releaseOcrWorker} if that memory is ever worth giving back.
 */
async function tesseractWorker(): Promise<TesseractWorker> {
  if (worker) return worker

  const { createWorker } = await import('tesseract.js')

  worker = (await createWorker(OCR_LANGUAGES, 1, {
    // Bundled, so the app does not execute a script from a third-party origin.
    // The core and the language data still come from the CDN (see the file header).
    workerPath: tesseractWorkerUrl,
    logger: (message: { status: string; progress: number }) => {
      progressSink?.({
        label: STATUS_LABELS[message.status] ?? message.status,
        ratio: typeof message.progress === 'number' ? message.progress : null,
      })
    },
  })) as TesseractWorker

  return worker
}

/** Drop the cached worker, freeing the WASM heap. */
export async function releaseOcrWorker(): Promise<void> {
  const current = worker
  worker = null
  progressSink = null
  await current?.terminate()
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

/**
 * Collapse the blank-line storms OCR produces around receipt rules and dotted
 * leaders. Left alone, three empty lines between every item triple the character
 * count and crowd out the actual line items in a 4000-character budget.
 */
function tidy(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Read a receipt and return its text.
 *
 * @throws if the file is the wrong type or too large, or if recognition fails.
 */
export async function readReceipt(
  file: File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<ReceiptText> {
  progressSink = onProgress ?? null

  try {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(
        `File terlalu besar (${Math.round(file.size / 1024 / 1024)} MB). Maksimal ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
      )
    }

    if (isPdf(file)) {
      return await readPdf(file, onProgress)
    }

    if (file.type.startsWith('image/')) {
      return await readImage(file, onProgress)
    }

    throw new Error('Hanya gambar atau PDF yang bisa dilampirkan.')
  } finally {
    // Do not leave a stale sink pointing at a component that has since unmounted.
    progressSink = null
  }
}

async function readImage(
  file: File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<ReceiptText> {
  onProgress?.({ label: 'Menyiapkan mesin OCR', ratio: null })
  const ocr = await tesseractWorker()
  onProgress?.({ label: 'Membaca teks', ratio: 0 })

  const { data } = await ocr.recognize(file)

  return { name: file.name, pages: 1, text: tidy(data.text), partial: false }
}

async function readPdf(
  file: File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<ReceiptText> {
  onProgress?.({ label: 'Membuka PDF', ratio: null })

  // Imported here, not at the top: pdf.js is ~350KB and a session that never
  // attaches a receipt should not pay for it.
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

  // The loading task, not the document, is what owns the worker in pdf.js v6 —
  // dropping the document alone would leave the worker running.
  const loading = pdfjs.getDocument({ data: await file.arrayBuffer() })
  const document_ = await loading.promise
  // Read before the loop, because the `finally` destroys the loading task and the
  // document is not safe to touch afterwards.
  const total = document_.numPages
  const pages = Math.min(total, MAX_PDF_PAGES)
  const ocr = await tesseractWorker()
  const found: string[] = []

  try {
    for (let index = 1; index <= pages; index++) {
      onProgress?.({
        label: `Membaca halaman ${index} dari ${pages}`,
        ratio: (index - 1) / pages,
      })

      const page = await document_.getPage(index)
      const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)

      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Browser ini tidak bisa membaca PDF.')
      }

      // A PDF page with no background paints transparent pixels, and OCR reads
      // white-on-white as nothing at all. Receipt PDFs are frequently exactly
      // that, so the page is flattened onto white before it is recognised.
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)

      await page.render({ canvas, canvasContext: context, viewport }).promise

      const { data } = await ocr.recognize(canvas)
      const text = tidy(data.text)
      if (text !== '') {
        found.push(`--- halaman ${index} ---\n${text}`)
      }

      page.cleanup()
      // The page holds a decoded bitmap; the canvas is about to be collected.
      canvas.width = 0
      canvas.height = 0
    }
  } finally {
    await loading.destroy()
  }

  if (found.length === 0) {
    throw new Error('Tidak ada teks yang terbaca. Coba foto yang lebih terang dan tidak miring.')
  }

  return {
    name: file.name,
    pages,
    text: found.join('\n\n'),
    partial: total > pages,
  }
}

/**
 * Fold an OCR result into the shape the composer works with. Lives here so the
 * two entry points cannot disagree about what a receipt is.
 *
 * The id is a counter, not something derived from the text: every pasted image
 * arrives named `image.png`, and two receipts that share a name *and* an OCR
 * length would collide — making `remove()` delete the wrong one and React reuse
 * the wrong textarea.
 */
let sequence = 0

export function toReceipt(result: ReceiptText): Receipt {
  sequence += 1

  return { id: `r${sequence}`, ...result }
}
