import { safeParseWidgets, widgetArraySchema, type Placement, type WidgetConfig } from './dashboardSchema'
import { getTenant } from './api'

function widgetStorageKey(): string {
  const tenant = getTenant()
  const slug = tenant?.slug ?? 'no-tenant'
  // per-tenant + per-user (user id from auth optional) — fallback to slug only for MVP
  try {
    const userRaw = localStorage.getItem('ledgify.user')
    const user = userRaw ? JSON.parse(userRaw) as { id: string } : null
    if (user?.id) return `ledgify.widgets.${slug}.${user.id}`
  } catch { /* ignore */ }
  return `ledgify.widgets.${slug}`
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'w-accounts', placement: 'dashboard:grid', w: '1', position: 0, title: 'Accounts', viz: 'scorecard', vizConfig: { dataSource: 'accounts', metric: 'count', filters: {}, variables: [], compare: 'none' } },
  { id: 'w-journals', placement: 'dashboard:grid', w: '1', position: 1, title: 'Journals', viz: 'scorecard', vizConfig: { dataSource: 'journals', metric: 'count', filters: {}, variables: [], compare: 'none' } },
  { id: 'w-budgets', placement: 'dashboard:grid', w: '1', position: 2, title: 'Budgets', viz: 'scorecard', vizConfig: { dataSource: 'budgets', metric: 'count', filters: {}, variables: [], compare: 'none' } },
  { id: 'w-tags', placement: 'dashboard:grid', w: '1', position: 3, title: 'Tags', viz: 'scorecard', vizConfig: { dataSource: 'tags', metric: 'count', filters: {}, variables: [], compare: 'none' } },
]

export function loadWidgets(): WidgetConfig[] {
  try {
    const raw = localStorage.getItem(widgetStorageKey())
    if (!raw) return DEFAULT_WIDGETS
    const parsed = JSON.parse(raw)
    const safe = safeParseWidgets(parsed)
    if (safe.length === 0) return DEFAULT_WIDGETS
    return safe
  } catch {
    return DEFAULT_WIDGETS
  }
}

export function saveWidgets(widgets: WidgetConfig[]): void {
  try {
    const validated = widgetArraySchema.parse(widgets)
    localStorage.setItem(widgetStorageKey(), JSON.stringify(validated))
  } catch {
    // ignore invalid
  }
}

export function widgetsForPlacement(widgets: WidgetConfig[], placement: Placement): WidgetConfig[] {
  return widgets
    .filter((w) => w.placement === placement)
    .sort((a, b) => a.position - b.position)
}

export function nextWidgetId(): string {
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
