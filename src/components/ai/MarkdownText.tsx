import * as React from 'react'

/**
 * A small, dependency-free Markdown renderer for assistant replies.
 *
 * Everything is rendered as React elements, never as HTML, so model output
 * cannot inject markup — there is no `dangerouslySetInnerHTML` anywhere here.
 * That is the reason this exists instead of a library: adding a dependency
 * needs approval, and the subset models actually emit in chat replies is small.
 *
 * Supported: headings, bold, italic, inline code, fenced code blocks,
 * unordered and ordered lists, blockquotes, horizontal rules, links, and
 * hard line breaks. Anything else renders as its own text node.
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

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'hr' }

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

    // Paragraph: run until a blank line or the start of another block.
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i])
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
    case 'hr':
      return <hr key={key} className="border-border" />
  }
}

export { parseBlocks as parseMarkdown }
