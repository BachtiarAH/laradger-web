import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * A small, dependency-free Markdown renderer for assistant replies.
 *
 * Everything is rendered as React elements, never as HTML, so model output
 * cannot inject markup — there is no `dangerouslySetInnerHTML` anywhere here.
 * That is the reason this exists instead of a library: adding a dependency
 * needs approval, and the subset models actually emit in chat replies is small.
 *
 * Supported: headings, bold, italic, inline code, fenced code blocks,
 * unordered and ordered lists, blockquotes, horizontal rules, links, GFM
 * tables, and hard line breaks. Anything else renders as its own text node.
 */
export function MarkdownText({ text }: { text: string }) {
  const blocks = React.useMemo(() => parseBlocks(text ?? ''), [text])

  if (blocks.length === 0) return null

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <MarkdownBlock key={index} block={block} index={index} />
      ))}
    </div>
  )
}

type Alignment = 'left' | 'center' | 'right'

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'table'; header: string[]; align: Alignment[]; rows: string[][] }
  | { kind: 'hr' }

/**
 * Split one table row into cells, honouring `\|` so a pipe can appear in the
 * text. Leading and trailing pipes are optional, which is how models actually
 * write them.
 */
function splitRow(line: string): string[] {
  let body = line.trim()

  if (body.startsWith('|')) body = body.slice(1)
  if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1)

  const cells: string[] = []
  let current = ''

  for (let k = 0; k < body.length; k++) {
    const char = body[k]

    if (char === '\\' && body[k + 1] === '|') {
      current += '|'
      k++
      continue
    }

    if (char === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())

  return cells
}

/** `|:---|---:|` style row: every cell is nothing but an optional colon and dashes. */
function isDelimiterRow(line: string | undefined): boolean {
  if (line === undefined || !line.includes('|')) return false

  const cells = splitRow(line)

  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell))
}

function isTableStart(lines: string[], index: number): boolean {
  return (lines[index] ?? '').includes('|') && isDelimiterRow(lines[index + 1])
}

function alignmentOf(cell: string): Alignment {
  const left = cell.startsWith(':')
  const right = cell.endsWith(':')

  if (left && right) return 'center'
  if (right) return 'right'

  return 'left'
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    if (isTableStart(lines, i)) {
      const header = splitRow(lines[i])
      const align = splitRow(lines[i + 1]).map(alignmentOf)
      i += 2

      const rows: string[][] = []

      // A table ends at a blank line or the first line that is not a row. Cells
      // are padded to the header width so a short row cannot shift the columns.
      while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
        const cells = splitRow(lines[i])
        rows.push(header.map((_, column) => cells[column] ?? ''))
        i++
      }

      blocks.push({ kind: 'table', header, align, rows })
      continue
    }

    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      const body: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i])
        i++
      }
      i++ // closing fence
      blocks.push({ kind: 'code', lang: fence[1] ?? '', text: body.join('\n') })
      continue
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push({ kind: 'hr' })
      i++
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      blocks.push({ kind: 'h', level: heading[1].length, text: heading[2] })
      i++
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const body: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ''))
        i++
      }
      blocks.push({ kind: 'quote', text: body.join('\n') })
      continue
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
        i++
      }
      blocks.push({ kind: 'ul', items })
      continue
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''))
        i++
      }
      blocks.push({ kind: 'ol', items })
      continue
    }

    // Paragraph: run until a blank line or the start of another block. The table
    // check matters most: without it a table that follows a text line on the
    // next row gets swallowed into the paragraph as raw pipes.
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !isTableStart(lines, i)
    ) {
      para.push(lines[i])
      i++
    }
    blocks.push({ kind: 'p', text: para.join('\n') })
  }

  return blocks
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]]+\]\([^)\s]+\))/g

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let n = 0

  INLINE.lastIndex = 0

  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${keyPrefix}-${n++}`

    if (token.startsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      )
    } else if (token.startsWith('[')) {
      const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
      const href = link?.[2] ?? ''
      const safe = /^https?:\/\//i.test(href)
      nodes.push(
        safe ? (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {link?.[1]}
          </a>
        ) : (
          <span key={key}>{link?.[1]}</span>
        ),
      )
    } else {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      )
    }

    last = match.index + token.length
  }

  if (last < text.length) nodes.push(text.slice(last))

  return nodes
}

function headingClass(level: number): string {
  if (level <= 1) return 'text-base font-bold'
  if (level === 2) return 'text-sm font-bold'
  return 'text-sm font-semibold'
}

export function MarkdownBlock({ block, index }: { block: Block; index: number }) {
  const key = `b${index}`

  switch (block.kind) {
    case 'h': {
      const Tag = (`h${Math.min(block.level + 2, 6)}`) as 'h3'
      return (
        <Tag key={key} className={headingClass(block.level)}>
          {renderInline(block.text, key)}
        </Tag>
      )
    }
    case 'p':
      return (
        <p key={key} className="whitespace-pre-wrap">
          {renderInline(block.text, key)}
        </p>
      )
    case 'ul':
      return (
        <ul key={key} className="ml-4 list-disc space-y-1">
          {block.items.map((item, n) => (
            <li key={`${key}-${n}`}>{renderInline(item, `${key}-${n}`)}</li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol key={key} className="ml-4 list-decimal space-y-1">
          {block.items.map((item, n) => (
            <li key={`${key}-${n}`}>{renderInline(item, `${key}-${n}`)}</li>
          ))}
        </ol>
      )
    case 'quote':
      return (
        <blockquote
          key={key}
          className="border-l-2 border-border pl-3 text-muted-foreground"
        >
          {renderInline(block.text, key)}
        </blockquote>
      )
    case 'code':
      return (
        <pre
          key={key}
          className="overflow-x-auto rounded bg-muted p-2 font-mono text-[11px] leading-relaxed"
        >
          <code>{block.text}</code>
        </pre>
      )
    case 'table':
      return (
        <div
          key={key}
          className="overflow-x-auto rounded border border-border"
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {block.header.map((cell, column) => (
                  <th
                    key={column}
                    scope="col"
                    className={cn(
                      'whitespace-nowrap px-2 py-1.5 font-semibold text-muted-foreground',
                      columnClass(block.align[column], cell),
                    )}
                  >
                    {renderInline(cell, `${key}-h${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-b border-border last:border-0">
                  {row.map((cell, column) => (
                    <td
                      key={column}
                      className={cn(
                        'px-2 py-1.5 align-top',
                        columnClass(block.align[column], cell),
                      )}
                    >
                      {renderInline(cell, `${key}-${r}-${column}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'hr':
      return <hr key={key} className="border-border" />
  }
}

const ALIGN_CLASS: Record<Alignment, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

/**
 * Money in a column of numbers is unreadable unless the digits line up. Models
 * usually write `|---|` and leave the alignment implied, so a cell that is
 * plainly a number is right-aligned and given tabular figures regardless.
 *
 * Handles `8.500.000`, `0,00`, `+3.600.000` and the Unicode minus that models
 * reach for. An em dash is not a number and stays left.
 */
const NUMERIC = /^[\sRp]*[-+−]?\s*[\d.,]+\s*%?$/

function columnClass(align: Alignment | undefined, cell: string): string {
  const numeric = NUMERIC.test(cell.trim())

  if (align === 'center') return 'text-center'
  if (align === 'right' || numeric) {
    return cn('text-right', numeric && 'tabular-nums')
  }

  return 'text-left'
}

export { parseBlocks as parseMarkdown }
