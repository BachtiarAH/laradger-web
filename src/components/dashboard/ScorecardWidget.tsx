import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { loadGlobalVariables } from '../../lib/globalVariables'
import type { WidgetConfig } from '../../lib/dashboardSchema'

function formatNumber(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString()
}

function evalFormula(formula: string, values: Record<string, number>): number | null {
  if (!formula.trim()) return null
  // only allow {{KEY}} placeholders + numbers + +-*/() and whitespace
  let expr = formula
  for (const [k, val] of Object.entries(values)) {
    expr = expr.split(`{{${k}}}`).join(String(val))
    expr = expr.split(`{{ ${k} }}`).join(String(val))
  }
  // if still contains {{ → unresolved
  if (expr.includes('{{')) return null
  if (!/^[\d\s+\-*/().]+$/.test(expr)) return null
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${expr})`)
    const res = fn()
    return typeof res === 'number' && Number.isFinite(res) ? res : null
  } catch {
    return null
  }
}

async function fetchMetricValue(dataSource: string, metric: string, filters: any, extra?: { accountId?: string; manualValue?: number }): Promise<number> {
  if (extra?.manualValue != null) return Number(extra.manualValue)
  // spesifik akun — pakai getAccountAnalytics → net/balance
  if (extra?.accountId) {
    try {
      const analytics = await api.getAccountAnalytics(extra.accountId)
      const map: Record<string, string | number | undefined> = {
        count: analytics.counts.lines,
        sum_debit: analytics.totals.debit,
        sum_credit: analytics.totals.credit,
        net: analytics.totals.net,
        balance: analytics.totals.balance,
        sum_amount: analytics.totals.net,
      }
      const v = map[metric]
      if (v != null) return Number(v)
      return Number(analytics.totals.net ?? 0)
    } catch {
      return 0
    }
  }
  if (dataSource === 'budgets') {
    const res = await api.listBudgets({
      per_page: 1,
      period: filters.period || undefined,
      budget_type: filters.budget_type || undefined,
      tag_id: filters.tag_id || undefined,
      account_id: filters.account_id || undefined,
      search: filters.search || undefined,
    })
    const s = res.summary
    const map: Record<string, string | number | undefined> = {
      count: res.total,
      sum_amount: res.total_amount,
      income_budgeted: s?.income_budgeted,
      expense_budgeted: s?.expense_budgeted,
      income_actual: s?.income_actual,
      expense_actual: s?.expense_actual,
      remaining_expense: s?.remaining_expense,
      unbudgeted_income: s?.unbudgeted_income,
      net: s?.net_budgeted,
      sum_debit: s?.expense_actual,
      sum_credit: s?.income_actual,
    }
    const v = map[metric] ?? res.total
    return Number(v ?? 0)
  }
  if (dataSource === 'accounts') {
    const res = await api.listAccounts({ per_page: 1, search: filters.search || undefined, type: filters.type || undefined })
    return Number(res.total ?? 0)
  }
  if (dataSource === 'journals') {
    const res = await api.listJournals({ per_page: 1 })
    return Number(res.total ?? 0)
  }
  if (dataSource === 'tags') {
    const res = await api.listTags({ per_page: 1 })
    return Number(res.total ?? 0)
  }
  if (dataSource === 'journal_lines') {
    const res = await api.listJournalLines({ per_page: 1 })
    return Number(res.total ?? 0)
  }
  if (dataSource === 'manual') {
    return Number(extra?.manualValue ?? 0)
  }
  return 0
}

export function ScorecardWidget({ widget }: { widget: WidgetConfig & { viz: 'scorecard' } }) {
  const { dataSource, metric, filters, formula, variables } = widget.vizConfig as any

  // build budget filters for summary metrics
  const budgetParams = React.useMemo(() => ({
    per_page: 1,
    period: filters.period || undefined,
    budget_type: filters.budget_type || undefined,
    tag_id: filters.tag_id || undefined,
    account_id: filters.account_id || undefined,
    search: filters.search || undefined,
  }), [filters])

  const budgets = useFetch(
    () => (dataSource === 'budgets' ? api.listBudgets(budgetParams) : Promise.resolve(null as any)),
    [dataSource, JSON.stringify(budgetParams)],
  )
  const accounts = useFetch(
    () => (dataSource === 'accounts' ? api.listAccounts({ per_page: 1, search: filters.search || undefined, type: filters.type || undefined }) : Promise.resolve(null as any)),
    [dataSource, filters.search, filters.type],
  )
  const journals = useFetch(
    () => (dataSource === 'journals' ? api.listJournals({ per_page: 1 }) : Promise.resolve(null as any)),
    [dataSource],
  )
  const tags = useFetch(
    () => (dataSource === 'tags' ? api.listTags({ per_page: 1 }) : Promise.resolve(null as any)),
    [dataSource],
  )

  const vars = (variables ?? []) as Array<{ name: string; dataSource: string; metric: string; filters?: any; accountId?: string; manualValue?: number }>
  const varValues = useFetch(
    async () => {
      const globals = loadGlobalVariables()
      if (!vars.length && !globals.length) return null as Record<string, number> | null
      const entries: Array<[string, number]> = []
      for (const v of vars) {
        const val = await fetchMetricValue(v.dataSource, v.metric, v.filters ?? {}, { accountId: (v as any).accountId, manualValue: (v as any).manualValue })
        entries.push([v.name, val])
      }
      // tambahkan global vars yang belum ada di widget vars (tersedia lintas widget)
      for (const gv of globals) {
        if (!entries.some(([k]) => k === gv.name)) entries.push([gv.name, Number(gv.value)])
      }
      return Object.fromEntries(entries) as Record<string, number>
    },
    [JSON.stringify(vars)],
  )

  const loading = budgets.loading || accounts.loading || journals.loading || tags.loading || varValues.loading
  const s = budgets.data?.summary

  let raw: string | number = '—'
  let hint = ''

  if (dataSource === 'budgets') {
    const map: Record<string, string | number | undefined> = {
      count: budgets.data?.total,
      sum_amount: budgets.data?.total_amount,
      income_budgeted: s?.income_budgeted,
      expense_budgeted: s?.expense_budgeted,
      income_actual: s?.income_actual,
      expense_actual: s?.expense_actual,
      remaining_expense: s?.remaining_expense,
      unbudgeted_income: s?.unbudgeted_income,
      net: s?.net_budgeted,
    }
    raw = map[metric] ?? budgets.data?.total ?? '—'
    hint = metric === 'count' ? 'budgets' : 'IDR'
  } else if (dataSource === 'accounts') {
    raw = accounts.data?.total ?? '—'
    hint = 'accounts'
  } else if (dataSource === 'journals') {
    raw = journals.data?.total ?? '—'
    hint = 'journals'
  } else if (dataSource === 'tags') {
    raw = tags.data?.total ?? '—'
    hint = 'tags'
  } else if (dataSource === 'journal_lines') {
    raw = '—'
    hint = 'journal lines (fase 1)'
  }

  // formula: if present, eval against summary values + custom variables
  let display = raw
  let formulaNote: string | null = null
  if (formula) {
    const vals: Record<string, number> = {
      A: Number(s?.income_budgeted ?? 0),
      B: Number(s?.expense_budgeted ?? 0),
      C: Number(s?.income_actual ?? 0),
      D: Number(s?.expense_actual ?? 0),
      income_budgeted: Number(s?.income_budgeted ?? 0),
      expense_budgeted: Number(s?.expense_budgeted ?? 0),
      income_actual: Number(s?.income_actual ?? 0),
      expense_actual: Number(s?.expense_actual ?? 0),
      remaining_expense: Number(s?.remaining_expense ?? 0),
      unbudgeted_income: Number(s?.unbudgeted_income ?? 0),
      count: Number(budgets.data?.total ?? accounts.data?.total ?? journals.data?.total ?? tags.data?.total ?? 0),
      ...(varValues.data ?? {}),
    }
    // also add raw value as fallback variable `value`
    if (typeof raw === 'number') vals['value'] = raw
    else if (typeof raw === 'string' && !Number.isNaN(Number(raw))) vals['value'] = Number(raw)

    const fv = evalFormula(formula, vals)
    if (fv != null) {
      display = fv.toFixed(2)
      formulaNote = formula
    } else if (varValues.data) {
      // formula present but not yet resolvable (variables loading)
      formulaNote = formula
    }
  }

  return (
    <div>
      <p className="text-3xl font-bold text-foreground">{loading ? '…' : formatNumber(display as any)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint} {metric !== 'count' && hint === 'IDR' ? '' : `· ${metric}`}</p>
      {formulaNote && <p className="mt-1 text-[10px] text-muted-foreground">formula: {formulaNote}</p>}
      {dataSource === 'budgets' && s && metric === 'count' && (
        <p className="mt-1 text-[10px] text-muted-foreground">total_amount {formatNumber(s.total_budgeted)}</p>
      )}
    </div>
  )
}
