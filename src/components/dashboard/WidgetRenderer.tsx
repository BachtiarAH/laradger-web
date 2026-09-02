import * as React from 'react'
import type { WidgetConfig } from '../../lib/dashboardSchema'
import { ScorecardWidget } from './ScorecardWidget'
import { TableWidget } from './TableWidget'

export function WidgetRenderer({ widget }: { widget: WidgetConfig }) {
  if (widget.viz === 'scorecard') return <ScorecardWidget widget={widget} />
  if (widget.viz === 'table') return <TableWidget widget={widget} />
  if (widget.viz === 'text') {
    return <p className="whitespace-pre-wrap text-sm text-foreground">{widget.vizConfig.markdown || '—'}</p>
  }
  if (widget.viz === 'chart') {
    return (
      <div className="flex h-32 items-center justify-center rounded bg-muted p-4 text-center text-xs text-muted-foreground">
        Chart "{widget.vizConfig.chartType}" — butuh recharts (fase 1). DataSource: {widget.vizConfig.dataSource}
      </div>
    )
  }
  return <p className="text-xs text-muted-foreground">Unknown viz { (widget as any).viz }</p>
}
