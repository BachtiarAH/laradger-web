import * as React from 'react'
import { getTenant } from '../lib/api'
import { loadWidgets, saveWidgets } from '../lib/widgets'
import { nextWidgetId, widgetsForPlacement } from '../lib/widgets'
import type { WidgetConfig } from '../lib/dashboardSchema'
import type { Placement } from '../lib/dashboardSchema'

export function useWidgets() {
  const [widgets, setWidgets] = React.useState<WidgetConfig[]>(() => loadWidgets())
  const tenantSlug = getTenant()?.slug

  React.useEffect(() => {
    setWidgets(loadWidgets())
  }, [tenantSlug])

  const persist = React.useCallback((next: WidgetConfig[]) => {
    const sorted = next.map((w, idx) => ({ ...w, position: idx }))
    setWidgets(sorted)
    saveWidgets(sorted)
  }, [])

  const addWidget = React.useCallback((widget: Omit<WidgetConfig, 'id' | 'position'>) => {
    const newWidget: WidgetConfig = { ...widget, id: nextWidgetId(), position: widgets.length } as WidgetConfig
    persist([...widgets, newWidget])
  }, [widgets, persist])

  const updateWidget = React.useCallback((id: string, patch: Partial<WidgetConfig>) => {
    persist(widgets.map((w) => (w.id === id ? { ...w, ...patch } as WidgetConfig : w)))
  }, [widgets, persist])

  const removeWidget = React.useCallback((id: string) => {
    persist(widgets.filter((w) => w.id !== id))
  }, [widgets, persist])

  const moveWidget = React.useCallback((id: string, dir: -1 | 1) => {
    const idx = widgets.findIndex((w) => w.id === id)
    if (idx === -1) return
    const nextIdx = idx + dir
    if (nextIdx < 0 || nextIdx >= widgets.length) return
    const next = [...widgets]
    const [moved] = next.splice(idx, 1)
    next.splice(nextIdx, 0, moved)
    persist(next)
  }, [widgets, persist])

  const forPlacement = React.useCallback((placement: Placement) => widgetsForPlacement(widgets, placement), [widgets])

  return { widgets, addWidget, updateWidget, removeWidget, moveWidget, forPlacement, setWidgets: persist }
}
