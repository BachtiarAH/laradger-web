import * as React from 'react'
import { Card } from '../ui'
import type { WidgetConfig } from '../../lib/dashboardSchema'

type Props = {
  widget: WidgetConfig
  isEditing: boolean
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: () => void
  children: React.ReactNode
}

export function WidgetWrapper({ widget, isEditing, onRemove, onMoveUp, onMoveDown, onEdit, children }: Props) {
  return (
    <Card className="relative flex h-full flex-col p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-foreground">{widget.title}</h3>
        {isEditing && (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={onMoveUp} className="rounded px-1.5 py-1 text-xs ring-1 ring-border hover:bg-muted">↑</button>
            <button type="button" onClick={onMoveDown} className="rounded px-1.5 py-1 text-xs ring-1 ring-border hover:bg-muted">↓</button>
            <button type="button" onClick={onEdit} className="rounded px-1.5 py-1 text-xs ring-1 ring-border hover:bg-muted">Edit</button>
            <button type="button" onClick={onRemove} className="rounded bg-destructive px-1.5 py-1 text-xs text-destructive-foreground hover:bg-destructive/90">✕</button>
          </div>
        )}
      </div>
      <div className="min-h-16 flex-1">{children}</div>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">{widget.viz}</span>
        <span className="truncate">{widget.placement}</span>
        <span className="ml-auto">w:{widget.w}</span>
      </div>
    </Card>
  )
}
