import * as React from 'react'
import type { Placement } from '../../lib/dashboardSchema'
import { widgetColSpanClass } from '../../lib/dashboardSchema'
import { WidgetWrapper } from './WidgetWrapper'
import { WidgetRenderer } from './WidgetRenderer'
import type { WidgetConfig } from '../../lib/dashboardSchema'

type Props = {
  widgets: WidgetConfig[]
  placement: Placement
  isEditing: boolean
  onRemove: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onEdit: (id: string) => void
}

export function WidgetGrid({ widgets, placement, isEditing, onRemove, onMove, onEdit }: Props) {
  const filtered = widgets.filter((w) => w.placement === placement).sort((a, b) => a.position - b.position)
  if (filtered.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">Belum ada widget di slot {placement}. Tambah widget.</p>
  }
  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-min">
      {filtered.map((w) => (
        <div key={w.id} className={widgetColSpanClass(w.w)}>
          <WidgetWrapper widget={w} isEditing={isEditing} onRemove={() => onRemove(w.id)} onMoveUp={() => onMove(w.id, -1)} onMoveDown={() => onMove(w.id, 1)} onEdit={() => onEdit(w.id)}>
            <WidgetRenderer widget={w} />
          </WidgetWrapper>
        </div>
      ))}
    </div>
  )
}
