import * as React from 'react'
import { Button, Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import type { Placement, WidgetConfig } from '../../lib/dashboardSchema'
import { placementSchema, dataSourceSchema, metricSchema, chartTypeSchema } from '../../lib/dashboardSchema'
import { AccountSelect } from '../AccountSelect'
import { useGlobalVariables } from '../../hooks/useGlobalVariables'

const placements: Placement[] = ['dashboard:grid','dashboard:top','dashboard:bottom','budgets:above_filters','budgets:summary','budgets:bottom','accounts:top','journals:top']

export function AddWidgetDialog({
  open,
  onOpenChange,
  onAdd,
  initial,
  mode = 'add',
  onUpdate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (w: Omit<WidgetConfig,'id'|'position'>) => void
  initial?: WidgetConfig | null
  mode?: 'add' | 'edit'
  onUpdate?: (id: string, patch: Partial<WidgetConfig>) => void
}) {
  const [title, setTitle] = React.useState('')
  const [placement, setPlacement] = React.useState<Placement>('dashboard:grid')
  const [viz, setViz] = React.useState<'scorecard'|'table'|'text'|'chart'>('scorecard')
  const [w, setW] = React.useState<'1'|'2'|'4'>('1')
  const [dataSource, setDataSource] = React.useState('budgets')
  const [metric, setMetric] = React.useState('count')
  const [chartType, setChartType] = React.useState('line')
  const [formula, setFormula] = React.useState('')
  const [markdown, setMarkdown] = React.useState('')
  const [variables, setVariables] = React.useState<Array<{ name: string; dataSource: string; metric: string; accountId?: string; manualValue?: number }>>([])
  const { globals, upsert: upsertGlobal, remove: removeGlobal } = useGlobalVariables()
  const [newGlobalName, setNewGlobalName] = React.useState('')
  const [newGlobalValue, setNewGlobalValue] = React.useState('')

  React.useEffect(() => {
    if (initial) {
      setTitle(initial.title)
      setPlacement(initial.placement)
      setW(initial.w as any)
      setViz(initial.viz as any)
      if (initial.viz === 'scorecard') {
        setDataSource(initial.vizConfig.dataSource)
        setMetric(initial.vizConfig.metric)
        setFormula(initial.vizConfig.formula ?? '')
        setVariables((initial.vizConfig as any).variables ?? [])
      } else if (initial.viz === 'table') {
        setDataSource(initial.vizConfig.dataSource)
      } else if (initial.viz === 'text') {
        setMarkdown(initial.vizConfig.markdown)
      } else if (initial.viz === 'chart') {
        setDataSource(initial.vizConfig.dataSource)
        setChartType(initial.vizConfig.chartType)
      }
    } else {
      setTitle(''); setPlacement('dashboard:grid'); setW('1'); setViz('scorecard'); setDataSource('budgets'); setMetric('count'); setFormula(''); setVariables([]); setMarkdown(''); setChartType('line')
    }
  }, [initial, open])

  const handleSubmit = () => {
    if (!title.trim()) return
    // sanitize variables: keep only valid name
    const cleanVars = variables.filter((v) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(v.name))
    if (mode === 'edit' && initial && onUpdate) {
      const patch: Partial<WidgetConfig> = { title: title.trim(), placement, w } as any
      if (viz === 'scorecard') (patch as any).vizConfig = { dataSource, metric, filters: {}, formula: formula || undefined, variables: cleanVars, compare: 'none' }
      if (viz === 'table') (patch as any).vizConfig = { dataSource, filters: {}, per_page: 5 }
      if (viz === 'text') (patch as any).vizConfig = { markdown }
      if (viz === 'chart') (patch as any).vizConfig = { chartType, dataSource, filters: {} }
      // viz change requires full replace, keep same id
      if (initial.viz !== viz) {
        // rebuild widget type
        const rebuilt: any = { id: initial.id, title: title.trim(), placement, w, position: initial.position, viz }
        if (viz === 'scorecard') rebuilt.vizConfig = { dataSource, metric, filters: {}, formula: formula || undefined, variables: cleanVars, compare: 'none' }
        if (viz === 'table') rebuilt.vizConfig = { dataSource, filters: {}, per_page: 5 }
        if (viz === 'text') rebuilt.vizConfig = { markdown }
        if (viz === 'chart') rebuilt.vizConfig = { chartType, dataSource, filters: {} }
        onUpdate(initial.id, rebuilt)
      } else {
        onUpdate(initial.id, patch)
      }
      onOpenChange(false)
      return
    }
    const base: any = { title: title.trim(), placement, w, viz }
    if (viz === 'scorecard') base.vizConfig = { dataSource, metric, filters: {}, formula: formula || undefined, variables: cleanVars, compare: 'none' }
    if (viz === 'table') base.vizConfig = { dataSource, filters: {}, per_page: 5 }
    if (viz === 'text') base.vizConfig = { markdown }
    if (viz === 'chart') base.vizConfig = { chartType, dataSource, filters: {} }
    onAdd(base)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{mode === 'edit' ? 'Edit widget' : 'Tambah widget generik'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Label (title)"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Uang Dingin, Net This Month, ..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Placement (slot)"><Select value={placement} onValueChange={(v) => setPlacement(v as Placement)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{placements.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Width"><Select value={w} onValueChange={(v) => setW(v as any)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 (full)</SelectItem><SelectItem value="2">2 (half)</SelectItem><SelectItem value="4">4 (quarter)</SelectItem></SelectContent></Select></Field>
          </div>
          <Field label="Jenis viz"><Select value={viz} onValueChange={(v) => setViz(v as any)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scorecard">Scorecard</SelectItem><SelectItem value="table">Table</SelectItem><SelectItem value="text">Text</SelectItem><SelectItem value="chart">Chart (fase 1: recharts)</SelectItem></SelectContent></Select></Field>

          {viz === 'scorecard' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data source"><Select value={dataSource} onValueChange={setDataSource}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{dataSourceSchema.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Metric"><Select value={metric} onValueChange={setMetric}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{metricSchema.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></Field>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-1">
                  <span className="text-sm font-medium">Formula</span>
                  <Popover>
                    <PopoverTrigger asChild><button type="button" className="rounded-full border px-1.5 text-[10px] leading-none">?</button></PopoverTrigger>
                    <PopoverContent className="w-80 text-xs leading-relaxed">
                      <p className="font-semibold">Contoh formula:</p>
                      <ul className="mt-1 list-disc pl-4 space-y-1">
                        <li><code>{'{{income_budgeted}} - {{expense_budgeted}}'}</code> — net anggaran</li>
                        <li><code>{'{{A}} - {{B}}'}</code> — pakai variabel A,B di bawah</li>
                        <li><code>{'{{kas}} + {{bank}} - {{remaining_expense}}'}</code> — uang dingin custom</li>
                      </ul>
                      <p className="mt-2 text-muted-foreground">Pakai {'{{nama_variabel}}'} yang didefinisikan di bawah. Kosong = tampil metric langsung. Formula tetap ditampilkan di widget & terbawa saat edit.</p>
                    </PopoverContent>
                  </Popover>
                </div>
                <Input value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="{{income_budgeted}} - {{expense_budgeted}} atau {{A}} - {{B}}" />
              </div>
              {formula && <p className="text-[11px] text-emerald-600">Formula aktif: <code className="rounded bg-muted px-1 py-0.5">{formula}</code></p>}

              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Variabel ({variables.length}/8) — bisa spesifik akun atau manual</p>
                  <Button variant="secondary" onClick={() => setVariables((prev) => [...prev, { name: `var${prev.length + 1}`, dataSource: 'budgets', metric: 'count' }])} disabled={variables.length >= 8}>+ Tambah variabel</Button>
                </div>
                {variables.length === 0 && <p className="text-[11px] text-muted-foreground">Belum ada variabel. Tambah variabel untuk dipakai di formula, misal <code>kas</code> → spesifik akun <code>Kas</code>, atau <code>target</code> → manual 10jt.</p>}
                {variables.map((v, idx) => (
                  <div key={idx} className="space-y-2 rounded border p-2">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                      <Field label="Nama"><Input value={v.name} onChange={(e) => setVariables((prev) => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} placeholder="kas" /></Field>
                      <Field label="Source"><Select value={v.dataSource} onValueChange={(val) => setVariables((prev) => prev.map((x, i) => i === idx ? { ...x, dataSource: val } : x))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{dataSourceSchema.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></Field>
                      {v.dataSource === 'manual' ? (
                        <Field label="Nilai manual"><Input type="number" value={(v as any).manualValue ?? ''} onChange={(e) => setVariables((prev) => prev.map((x, i) => i === idx ? { ...x, manualValue: e.target.value === '' ? undefined : Number(e.target.value) } : x))} placeholder="1000000" /></Field>
                      ) : (
                        <Field label="Metric"><Select value={v.metric} onValueChange={(val) => setVariables((prev) => prev.map((x, i) => i === idx ? { ...x, metric: val } : x))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{metricSchema.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></Field>
                      )}
                      <Button variant="secondary" onClick={() => setVariables((prev) => prev.filter((_, i) => i !== idx))}>Hapus</Button>
                    </div>
                    {(v.dataSource === 'accounts' || v.dataSource === 'journal_lines') && (
                      <div>
                        <p className="mb-1 text-xs font-medium">Spesifik akun (opsional)</p>
                        <AccountSelect value={(v as any).accountId ?? null} onValueChange={(val) => setVariables((prev) => prev.map((x, i) => i === idx ? { ...x, accountId: val ?? undefined } : x))} placeholder="Pilih akun spesifik atau kosong = semua" allowNone noneLabel="Semua akun (sesuai filter)" />
                        {(v as any).accountId && <p className="mt-1 text-[11px] text-muted-foreground">Akan pakai saldo/banyaknya akun terpilih.</p>}
                      </div>
                    )}
                    {v.dataSource === 'manual' && <p className="text-[11px] text-muted-foreground">Nilai manual dipakai langsung di formula. Bisa juga buat global di bawah.</p>}
                  </div>
                ))}
                {variables.length > 0 && <p className="text-[11px] text-muted-foreground">Gunakan di formula sebagai {'{{nama}}'}, contoh: {'{{kas}} + {{bank}} - {{target}}'}.</p>}
              </div>

              <div className="rounded-lg border border-dashed p-3 space-y-2">
                <p className="text-xs font-medium">Variabel global (dipakai lintas widget)</p>
                <p className="text-[11px] text-muted-foreground">Buat sekali, pakai di widget mana pun via {'{{nama}}'}. Disimpan per tenant+user.</p>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <Field label="Nama"><Input value={newGlobalName} onChange={(e) => setNewGlobalName(e.target.value)} placeholder="target" /></Field>
                  <Field label="Nilai"><Input type="number" value={newGlobalValue} onChange={(e) => setNewGlobalValue(e.target.value)} placeholder="10000000" /></Field>
                  <Button onClick={() => { if (!newGlobalName.trim() || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(newGlobalName.trim())) return; upsertGlobal({ name: newGlobalName.trim(), value: Number(newGlobalValue) || 0, description: '' }); setNewGlobalName(''); setNewGlobalValue('') }}>Simpan</Button>
                </div>
                {globals.length > 0 ? (
                  <div className="space-y-1">
                    {globals.map((g) => (
                      <div key={g.name} className="flex items-center justify-between rounded bg-muted px-2 py-1 text-xs">
                        <span><code>{'{{'}{g.name}{'}}'}</code> = {Number(g.value).toLocaleString()} {g.description ? `— ${g.description}` : ''}</span>
                        <div className="flex gap-1">
                          <Button variant="secondary" onClick={() => { setFormula((prev) => prev ? `${prev} + {{${g.name}}}` : `{{${g.name}}}`) }}>Pakai</Button>
                          <Button variant="secondary" onClick={() => removeGlobal(g.name)}>Hapus</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[11px] text-muted-foreground">Belum ada variabel global.</p>}
              </div>
            </>
          )}
          {viz === 'table' && (
            <Field label="Data source"><Select value={dataSource} onValueChange={setDataSource}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{dataSourceSchema.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></Field>
          )}
          {viz === 'text' && (
            <Field label="Markdown"><Input value={markdown} onChange={(e) => setMarkdown(e.target.value)} placeholder="Teks bebas, bisa catatan" /></Field>
          )}
          {viz === 'chart' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Chart type"><Select value={chartType} onValueChange={setChartType}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{chartTypeSchema.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Data source"><Select value={dataSource} onValueChange={setDataSource}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{dataSourceSchema.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></Field>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit}>{mode === 'edit' ? 'Simpan' : 'Tambah'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
