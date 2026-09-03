import * as React from 'react'
import type { Account } from '../lib/types'
import { Button, Input } from './ui'
import { AccountSelect } from './AccountSelect'
import { GripVertical } from 'lucide-react'

export type LineDraft = {
  account_id: string
  debit: string
  credit: string
  description: string
}

export function createBlankLine(_accounts?: Account[]): LineDraft {
  return {
    account_id: '',
    debit: '',
    credit: '',
    description: '',
  }
}

export function LineEditor({
  accounts,
  lines,
  onChange,
}: {
  accounts?: Account[]
  lines: LineDraft[]
  onChange: (lines: LineDraft[]) => void
}) {
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = React.useState<number | null>(null)

  const updateLine = (index: number, patch: Partial<LineDraft>) => {
    onChange(
      lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    )
  }

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index))
  }

  const addLine = () => {
    onChange([...lines, createBlankLine()])
  }

  const handleDragStart = (index: number) => {
    setDragIndex(index)
    setDropTargetIndex(index)
  }

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetIndex(index)
  }

  const handleDragLeave = () => {
    setDropTargetIndex(null)
  }

  const handleDrop = (index: number) => {
    setDropTargetIndex(null)
    if (dragIndex !== null && dragIndex !== index) {
      onChange((() => {
        const next = [...lines]
        const [moved] = next.splice(dragIndex, 1)
        next.splice(index, 0, moved)
        return next
      })())
    }
    setDragIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDropTargetIndex(null)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="col-span-1" />
        <div className="col-span-4">Account</div>
        <div className="col-span-2">Debit</div>
        <div className="col-span-2">Credit</div>
        <div className="col-span-2">Description</div>
        <div className="col-span-1" />
      </div>
      {lines.map((line, index) => (
        <div
          key={index}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          className={[
            'grid grid-cols-12 gap-2 rounded-md',
            dragIndex === index ? 'opacity-50' : undefined,
            dragIndex !== null && dropTargetIndex === index && dragIndex !== index
              ? 'bg-primary/10 ring-1 ring-inset ring-primary'
              : undefined,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="col-span-1 flex items-center justify-center text-muted-foreground">
            <GripVertical className="h-4 w-4 cursor-grab" />
          </div>
          <div className="col-span-4">
            <AccountSelect
              value={line.account_id || null}
              onValueChange={(value) => updateLine(index, { account_id: value ?? '' })}
              placeholder="Select account…"
              allowCreate
            />
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={line.debit}
              onChange={(e) => updateLine(index, { debit: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={line.credit}
              onChange={(e) => updateLine(index, { credit: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Input
              value={line.description}
              placeholder="Line note"
              onChange={(e) =>
                updateLine(index, { description: e.target.value })
              }
            />
          </div>
          <div className="col-span-1">
            <Button
              type="button"
              variant="danger"
              className="w-full !px-2 !py-1.5"
              onClick={() => removeLine(index)}
              disabled={lines.length <= 1}
              aria-label="Remove line"
            >
              ×
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={addLine}>
        + Add line
      </Button>
    </div>
  )
}