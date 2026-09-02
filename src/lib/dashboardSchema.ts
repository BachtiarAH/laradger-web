import { z } from 'zod'

// Slots — where widget can be placed (grid slots per page)
export const placementSchema = z.enum([
  'dashboard:grid',
  'dashboard:top',
  'dashboard:bottom',
  'budgets:above_filters',
  'budgets:summary',
  'budgets:bottom',
  'accounts:top',
  'journals:top',
])
export type Placement = z.infer<typeof placementSchema>

// Data sources available for generic widgets
export const dataSourceSchema = z.enum([
  'accounts',
  'journals',
  'journal_lines',
  'budgets',
  'tags',
  'audit_logs',
  'manual',
])
export type DataSource = z.infer<typeof dataSourceSchema>

// Metrics — user picks what to display
export const metricSchema = z.enum([
  'count',
  'sum_amount', // budgets.amount via total_amount / summary
  'sum_debit',
  'sum_credit',
  'net',
  'income_budgeted',
  'expense_budgeted',
  'income_actual',
  'expense_actual',
  'remaining_expense',
  'unbudgeted_income',
])
export type Metric = z.infer<typeof metricSchema>

export const chartTypeSchema = z.enum([
  'line',
  'area',
  'bar',
  'stick',
  'pie',
  'circle',
  'donut',
  'radial',
])
export type ChartType = z.infer<typeof chartTypeSchema>

export const filterBagSchema = z.object({
  period: z.enum(['', 'today', 'this_week', 'this_month']).optional(),
  budget_type: z.enum(['', 'income', 'expense']).optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  tag_id: z.string().optional(),
  account_id: z.string().optional(),
  accountIds: z.array(z.string()).optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})
export type FilterBag = z.infer<typeof filterBagSchema>

const baseWidgetSchema = z.object({
  id: z.string(),
  placement: placementSchema,
  w: z.enum(['1', '2', '4']).default('1').or(z.union([z.literal(1), z.literal(2), z.literal(4)])).transform((v) => String(v) as '1'|'2'|'4'),
  position: z.number().int().default(0),
  title: z.string().min(1).max(80),
})

export const variableSchema = z.object({
  name: z.string().min(1).max(20).regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'Nama variabel harus huruf/angka/_ tanpa spasi, diawali huruf'),
  dataSource: dataSourceSchema,
  metric: metricSchema.default('count'),
  filters: filterBagSchema.optional().default({}),
  // spesifik akun — jika diisi, hitung hanya untuk akun tersebut (pakai getAccountAnalytics / listAccountJournalLines)
  accountId: z.string().uuid().optional(),
  // manual / global — jika dataSource === 'manual', pakai nilai ini langsung (bisa jadi variabel global buatan user)
  manualValue: z.number().optional(),
})
export type Variable = z.infer<typeof variableSchema>

// Variabel global buatan user — disimpan terpisah, bisa dipakai lintas widget via {{nama}}
export const globalVariableSchema = z.object({
  name: z.string().min(1).max(20).regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'Nama variabel harus huruf/angka/_ tanpa spasi'),
  value: z.number(),
  description: z.string().max(120).optional().default(''),
})
export type GlobalVariable = z.infer<typeof globalVariableSchema>
export const globalVariableArraySchema = z.array(globalVariableSchema)

export const scorecardWidgetSchema = baseWidgetSchema.extend({
  viz: z.literal('scorecard'),
  vizConfig: z.object({
    dataSource: dataSourceSchema,
    metric: metricSchema.default('count'),
    filters: filterBagSchema.optional().default({}),
    formula: z.string().max(500).optional(),
    variables: z.array(variableSchema).max(8).optional().default([]),
    compare: z.enum(['none', 'prev_period']).optional().default('none'),
  }),
})

export const tableWidgetSchema = baseWidgetSchema.extend({
  viz: z.literal('table'),
  vizConfig: z.object({
    dataSource: dataSourceSchema,
    filters: filterBagSchema.optional().default({}),
    per_page: z.number().int().min(1).max(20).default(5),
    // columns auto-derived per dataSource in v0, customizable later
  }),
})

export const textWidgetSchema = baseWidgetSchema.extend({
  viz: z.literal('text'),
  vizConfig: z.object({
    markdown: z.string().max(2000).default(''),
  }),
})

export const chartWidgetSchema = baseWidgetSchema.extend({
  viz: z.literal('chart'),
  vizConfig: z.object({
    chartType: chartTypeSchema.default('line'),
    dataSource: dataSourceSchema.default('budgets'),
    filters: filterBagSchema.optional().default({}),
    groupBy: z.string().optional(),
  }),
})

export const widgetSchema = z.discriminatedUnion('viz', [
  scorecardWidgetSchema,
  tableWidgetSchema,
  textWidgetSchema,
  chartWidgetSchema,
])
export type WidgetConfig = z.infer<typeof widgetSchema>

export const widgetArraySchema = z.array(widgetSchema)

// helper for col-span classes
export function widgetColSpanClass(w: string): string {
  if (w === '4') return 'lg:col-span-3 col-span-12'
  if (w === '2') return 'lg:col-span-6 col-span-12'
  return 'col-span-12'
}

export function safeParseWidgets(raw: unknown): WidgetConfig[] {
  const parsed = widgetArraySchema.safeParse(raw)
  if (parsed.success) return parsed.data
  return []
}
