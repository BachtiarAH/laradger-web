import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import {
  Button,
  Card,
  ErrorBox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  Td,
  Th,
} from '../../components/ui'
import { Button as ShadButton } from '../../components/ui/button'
import { Table as RawTable, TableHead, TableCell } from '../../components/ui/table'
import { cn } from '../../lib/utils'
import {
  Search,
  Plus,
  Download,
  List,
  LayoutList,
  Eye,
  Folder,
  FileText,
  X,
} from 'lucide-react'
import type { Account } from '../../lib/types'

// ── helpers ──────────────────────────────────────────────────────────────
function formatIDR(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Rp 0'
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  if (n === 0) return 'Rp 0'
  const isNeg = n < 0
  const abs = Math.abs(n).toLocaleString('id-ID')
  return isNeg ? `(Rp ${abs})` : `Rp ${abs}`
}

function isDebitNormal(type: Account['type']): boolean {
  return type === 'asset' || type === 'expense'
}

function categoryBadge(type: Account['type']): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    asset: { label: '1 - Aset', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900' },
    liability: { label: '2 - Liabilitas', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900' },
    equity: { label: '3 - Ekuitas', className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900' },
    income: { label: '4 - Pendapatan', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900' },
    expense: { label: '5/6 - Beban', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900' },
  }
  return map[type] ?? { label: type, className: 'bg-muted text-muted-foreground border-border' }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function highlight(text: string, keyword: string): string {
  if (!keyword) return text
  try {
    const re = new RegExp(`(${escapeRegex(keyword)})`, 'gi')
    return text.replace(re, '<mark>$1</mark>')
  } catch {
    return text
  }
}

// ── Statistics ───────────────────────────────────────────────────────────
function StatisticsCards({ accounts, loading }: { accounts: Account[]; loading: boolean }) {
  const sum = (types: string[]) =>
    accounts
      .filter((a) => types.includes(a.type))
      .reduce((s, a) => s + Number(a.net ?? a.balance ?? 0), 0)

  const assets = sum(['asset'])
  const liabilities = sum(['liability'])
  const equity = sum(['equity'])
  const revenue = sum(['income'])

  // header = has children, detail = leaf
  const childrenIds = new Set(accounts.map((a) => a.parent_id).filter(Boolean))
  const headerCount = accounts.filter((a) => childrenIds.has(a.id)).length
  const detailCount = accounts.length - headerCount
  const activeCount = accounts.filter((a) => a.status === 'active').length

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
      <Card className="p-3.5 border-foreground/10 shadow-xs">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Aset</span>
        <p className="text-base sm:text-lg font-bold mt-1">{loading ? <Skeleton className="h-6 w-24" /> : fmt(assets)}</p>
        <span className="text-[11px] text-emerald-600 flex items-center gap-0.5 mt-0.5 font-medium">● Normal: Debit</span>
      </Card>
      <Card className="p-3.5 border-foreground/10 shadow-xs">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Liabilitas</span>
        <p className="text-base sm:text-lg font-bold mt-1">{loading ? <Skeleton className="h-6 w-24" /> : fmt(liabilities)}</p>
        <span className="text-[11px] text-amber-600 flex items-center gap-0.5 mt-0.5 font-medium">● Normal: Kredit</span>
      </Card>
      <Card className="p-3.5 border-foreground/10 shadow-xs">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ekuitas Modal</span>
        <p className="text-base sm:text-lg font-bold mt-1">{loading ? <Skeleton className="h-6 w-24" /> : fmt(equity)}</p>
        <span className="text-[11px] text-indigo-600 flex items-center gap-0.5 mt-0.5 font-medium">● Modal &amp; Saldo Laba</span>
      </Card>
      <Card className="p-3.5 border-foreground/10 shadow-xs">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendapatan YTD</span>
        <p className="text-base sm:text-lg font-bold mt-1">{loading ? <Skeleton className="h-6 w-24" /> : fmt(revenue)}</p>
        <span className="text-[11px] text-emerald-600 flex items-center gap-0.5 mt-0.5 font-medium">● Normal: Kredit</span>
      </Card>
      <Card className="p-3.5 border-foreground/10 shadow-xs col-span-2 sm:col-span-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Akun Terdaftar</span>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-base sm:text-lg font-bold">{loading ? <Skeleton className="h-6 w-8" /> : activeCount}</p>
          <span className="text-xs text-muted-foreground">akun aktif</span>
        </div>
        <span className="text-[11px] text-muted-foreground mt-0.5 block">
          {headerCount} Induk • {detailCount} Transaksi
        </span>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/accounts/')({
  component: AccountsPage,
})

type SortBy = 'code' | 'name' | 'category' | 'balance'
type SortOrder = 'asc' | 'desc'

function AccountsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = React.useState('')
  const [filterCategory, setFilterCategory] = React.useState('ALL')
  const [filterNodeType, setFilterNodeType] = React.useState('ALL')
  const [filterNonZero, setFilterNonZero] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<'tree' | 'flat'>('tree')
  const [sortBy, setSortBy] = React.useState<SortBy>('code')
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc')
  const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set())
  const [confirmAccount, setConfirmAccount] = React.useState<Account | null>(null)
  const [actionError, setActionError] = React.useState<unknown>(null)
  const [drawerAccount, setDrawerAccount] = React.useState<Account | null>(null)

  // fetch all accounts client-side (per_page large) – tree needs full set
  const { data, error, loading, reload } = useFetch(
    () => api.listAccounts({ per_page: 100 }),
    [],
  )

  const allAccounts: Account[] = React.useMemo(() => data?.data ?? [], [data])

  // build hierarchy map + helper sets — only main parents may be ROOT
  const { childrenMap, hasChildrenSet, accountMap } = React.useMemo(() => {
    const cm = new Map<string, Account[]>()
    const am = new Map<string, Account>()
    const isMainParent = (a: Account) =>
      a.parent_id == null && (a.depth === 0 || !a.code.includes('-'))
    for (const a of allAccounts) {
      am.set(a.id, a)
      const pid = a.parent_id ?? 'ROOT'
      if (!cm.has(pid)) cm.set(pid, [])
      cm.get(pid)!.push(a)
    }
    // filter ROOT to only main parents — sub-parents with null parent_id (orphans) must not appear as top-level
    const root = cm.get('ROOT') ?? []
    const filteredRoot = root.filter(isMainParent)
    cm.set('ROOT', filteredRoot)
    const hs = new Set<string>()
    for (const a of allAccounts) if (cm.has(a.id)) hs.add(a.id)
    return { childrenMap: cm, hasChildrenSet: hs, accountMap: am }
  }, [allAccounts])

  const getBreadcrumb = React.useCallback(
    (acc: Account): Account[] => {
      const path: Account[] = [acc]
      let cur: Account | undefined = acc
      while (cur?.parent_id) {
        const p = accountMap.get(cur.parent_id)
        if (!p) break
        path.unshift(p)
        cur = p
      }
      return path
    },
    [accountMap],
  )

  const itemMatches = React.useCallback(
    (a: Account): boolean => {
      const kw = search.trim().toLowerCase()
      if (kw && !(a.code.toLowerCase().includes(kw) || a.name.toLowerCase().includes(kw))) return false
      if (filterCategory !== 'ALL' && a.type !== filterCategory) return false
      if (filterNodeType === 'HEADER' && !hasChildrenSet.has(a.id)) return false
      if (filterNodeType === 'POSTABLE' && hasChildrenSet.has(a.id)) return false
      if (filterNonZero && Number(a.net ?? a.balance ?? 0) === 0) return false
      return true
    },
    [search, filterCategory, filterNodeType, filterNonZero, hasChildrenSet],
  )

  // check if node or any descendant matches (for tree pruning)
  const nodeOrDescendantMatches = React.useCallback(
    (node: Account): boolean => {
      if (itemMatches(node)) return true
      const children = childrenMap.get(node.id) ?? []
      return children.some((c) => nodeOrDescendantMatches(c))
    },
    [itemMatches, childrenMap],
  )

  const comparator = React.useCallback(
    (a: Account, b: Account): number => {
      let res = 0
      if (sortBy === 'code') res = a.code.localeCompare(b.code)
      else if (sortBy === 'name') res = a.name.localeCompare(b.name)
      else if (sortBy === 'category') res = a.type.localeCompare(b.type)
      else if (sortBy === 'balance') res = Number(a.net ?? a.balance ?? 0) - Number(b.net ?? b.balance ?? 0)
      return sortOrder === 'asc' ? res : -res
    },
    [sortBy, sortOrder],
  )

  const renderedRows = React.useMemo(() => {
    const isSearchActive = search.trim().length > 0
    type Row = { account: Account; depth: number; hasChildren: boolean; isCollapsed: boolean }
    const rows: Row[] = []
    const visited = new Set<string>()

    if (viewMode === 'tree') {
      const traverse = (parentId: string, depth: number, ancestorVisible: boolean) => {
        let children = [...(childrenMap.get(parentId) ?? [])].sort(comparator)
        for (const node of children) {
          if (visited.has(node.id)) continue
          if (!nodeOrDescendantMatches(node)) continue
          const hasChildren = hasChildrenSet.has(node.id)
          const isCollapsed = collapsedNodes.has(node.id)
          if (ancestorVisible) {
            visited.add(node.id)
            rows.push({ account: node, depth, hasChildren, isCollapsed })
          }
          const shouldShowChildren = ancestorVisible && (!isCollapsed || isSearchActive)
          if (hasChildren) traverse(node.id, depth + 1, shouldShowChildren)
        }
      }
      traverse('ROOT', 0, true)
    } else {
      const filtered = allAccounts.filter(itemMatches).sort(comparator)
      for (const a of filtered) rows.push({ account: a, depth: 0, hasChildren: false, isCollapsed: false })
    }
    return rows
  }, [viewMode, allAccounts, childrenMap, hasChildrenSet, collapsedNodes, search, comparator, itemMatches, nodeOrDescendantMatches])

  const toggleSort = (col: SortBy) => {
    if (sortBy === col) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(col)
      setSortOrder('asc')
    }
  }

  const toggleCollapse = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setCollapsedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = (expand: boolean) => {
    if (expand) setCollapsedNodes(new Set())
    else {
      const allHeaders = new Set<string>()
      for (const id of hasChildrenSet) allHeaders.add(id)
      setCollapsedNodes(allHeaders)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setFilterCategory('ALL')
    setFilterNodeType('ALL')
    setFilterNonZero(false)
    setCollapsedNodes(new Set())
  }

  const handleDelete = async (account: Account) => {
    setActionError(null)
    try {
      await api.deleteAccount(account.id)
      await reload()
    } catch (err) {
      setActionError(err)
      throw err
    }
  }

  const sortIcon = (col: SortBy) => {
    if (sortBy !== col) return <span className="text-muted-foreground">⇅</span>
    return <span className="text-primary font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
  }

  const sortLabelMap: Record<SortBy, string> = { code: 'Kode Akun', name: 'Nama Akun', category: 'Kategori', balance: 'Saldo Berjalan' }

  return (
    <RequireAuth>
      <div className="max-w-7xl mx-auto">
        {/* Header – mimic example */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg">Bagan Akun Buku Besar</h1>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900">PSAK / GAAP</span>
              </div>
              <p className="text-xs text-muted-foreground">Chart of Accounts (COA) dengan Navigasi Hirarki &amp; Filter Multi-Dimensi</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/accounts/new">
              <Button className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4" />
                <span>Tambah Akun Baru</span>
              </Button>
            </Link>
            <ShadButton variant="outline" size="icon" className="h-9 w-9" onClick={() => {}}>
              <Download className="w-4 h-4" />
            </ShadButton>
          </div>
        </div>

        {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
        {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}

        <StatisticsCards accounts={allAccounts} loading={loading} />

        {/* Toolbar like example.txt */}
        <Card className="mb-4 p-4 bg-muted/30 gap-0">
          <div className="space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input placeholder="Cari kode (mis: 1-1100) atau nama akun..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-8 bg-background" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-0.5">✕</button>
                )}
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <div className="inline-flex bg-muted p-1 rounded-lg text-xs font-medium">
                  <ShadButton variant="ghost" size="sm" className={cn('h-7 px-3', viewMode === 'tree' ? 'bg-background shadow-xs font-semibold text-primary' : '')} onClick={() => setViewMode('tree')}>
                    <List className="w-3.5 h-3.5 mr-1.5" />
                    <span>Hirarki (Tree)</span>
                  </ShadButton>
                  <ShadButton variant="ghost" size="sm" className={cn('h-7 px-3', viewMode === 'flat' ? 'bg-background shadow-xs font-semibold text-primary' : '')} onClick={() => setViewMode('flat')}>
                    <LayoutList className="w-3.5 h-3.5 mr-1.5" />
                    <span>Daftar Terbuka (Flat)</span>
                  </ShadButton>
                </div>

                <div className={cn('flex items-center gap-1 bg-background border rounded-lg p-1 text-xs', viewMode !== 'tree' && 'opacity-40 pointer-events-none')}>
                  <ShadButton variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={() => expandAll(true)}>Buka Semua</ShadButton>
                  <span className="text-muted-foreground">|</span>
                  <ShadButton variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={() => expandAll(false)}>Tutup Semua</ShadButton>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Filter:</span>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-8 text-xs bg-background w-[200px]">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kategori</SelectItem>
                  <SelectItem value="asset">1 - Aset</SelectItem>
                  <SelectItem value="liability">2 - Liabilitas</SelectItem>
                  <SelectItem value="equity">3 - Ekuitas</SelectItem>
                  <SelectItem value="income">4 - Pendapatan</SelectItem>
                  <SelectItem value="expense">5/6 - Beban</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterNodeType} onValueChange={setFilterNodeType}>
                <SelectTrigger className="h-8 text-xs bg-background w-[200px]">
                  <SelectValue placeholder="Semua Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Level Akun</SelectItem>
                  <SelectItem value="HEADER">Hanya Akun Induk (Header)</SelectItem>
                  <SelectItem value="POSTABLE">Hanya Akun Transaksi (Detail)</SelectItem>
                </SelectContent>
              </Select>

              <ShadButton
                variant="outline"
                size="sm"
                className={cn('h-8 text-xs gap-1.5 bg-background', filterNonZero && 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950')}
                onClick={() => setFilterNonZero((v) => !v)}
              >
                <span className={cn('w-2 h-2 rounded-full', filterNonZero ? 'bg-indigo-600' : 'bg-muted-foreground/30')} />
                <span>Hanya Saldo Aktif (&gt; 0)</span>
              </ShadButton>

              <ShadButton variant="outline" size="sm" className="h-8 text-xs bg-background" onClick={resetFilters}>
                Reset Semua Filter
              </ShadButton>

              <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5 bg-primary/5 border border-primary/10 px-3 py-1 rounded-md">
                <span>{viewMode === 'tree' ? `Sorting Cabang: Terurut per induk (${sortBy.toUpperCase()} ${sortOrder.toUpperCase()})` : `Sorting Global: Seluruh akun diurutkan (${sortBy.toUpperCase()} ${sortOrder.toUpperCase()})`}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Ledger Table */}
        <Card className="overflow-hidden gap-0">
          <div className="overflow-x-auto">
            <RawTable className="min-w-[760px]">
              <TableHeader>
                <TableRow className="bg-muted/80 border-b text-xs font-semibold uppercase tracking-wider select-none">
                  <TableHead className="py-3 px-4 w-44 cursor-pointer hover:bg-muted transition-colors" onClick={() => toggleSort('code')}>
                    <div className="flex items-center gap-1.5"><span>Kode Akun</span>{sortIcon('code')}</div>
                  </TableHead>
                  <TableHead className="py-3 px-4 cursor-pointer hover:bg-muted transition-colors" onClick={() => toggleSort('name')}>
                    <div className="flex items-center gap-1.5"><span>Nama Akun &amp; Struktur Hirarki</span>{sortIcon('name')}</div>
                  </TableHead>
                  <TableHead className="py-3 px-4 w-36 cursor-pointer hover:bg-muted transition-colors" onClick={() => toggleSort('category')}>
                    <div className="flex items-center gap-1.5"><span>Kategori</span>{sortIcon('category')}</div>
                  </TableHead>
                  <TableHead className="py-3 px-3 w-28 text-center">Posisi Normal</TableHead>
                  <TableHead className="py-3 px-4 w-44 text-right cursor-pointer hover:bg-muted transition-colors" onClick={() => toggleSort('balance')}>
                    <div className="flex items-center justify-end gap-1.5"><span>Saldo Berjalan (IDR)</span>{sortIcon('balance')}</div>
                  </TableHead>
                  <TableHead className="py-3 px-4 w-28 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-sm divide-y divide-border/50">
                {loading && !data ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <Td className="py-3 px-4"><Skeleton className="h-4 w-16" /></Td>
                      <Td className="py-3 px-4"><Skeleton className="h-4 w-40" /></Td>
                      <Td className="py-3 px-4"><Skeleton className="h-4 w-20" /></Td>
                      <Td className="py-3 px-3"><Skeleton className="h-4 w-12 mx-auto" /></Td>
                      <Td className="py-3 px-4"><Skeleton className="h-4 w-20 ml-auto" /></Td>
                      <Td className="py-3 px-4"><Skeleton className="h-4 w-16 mx-auto" /></Td>
                    </TableRow>
                  ))
                ) : renderedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-3">
                          <Search className="w-8 h-8" />
                        </div>
                        <h3 className="font-semibold text-base">Tidak ada akun yang cocok</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">Coba sesuaikan kata kunci pencarian atau bersihkan filter kategori Anda.</p>
                        <ShadButton variant="outline" size="sm" className="mt-4" onClick={resetFilters}>Reset Semua Filter</ShadButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  renderedRows.map(({ account, depth, hasChildren, isCollapsed }) => {
                    const isHeader = hasChildren
                    const bgClass = isHeader ? 'bg-muted/40 font-semibold hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30' : 'hover:bg-muted/50'
                    const codeHtml = highlight(account.code, search.trim())
                    const nameHtml = highlight(account.name, search.trim())
                    const cat = categoryBadge(account.type)
                    const balanceVal = Number(account.net ?? account.balance ?? 0)
                    const balanceFmt = formatIDR(balanceVal)
                    const balanceColor = balanceVal < 0 ? 'text-destructive font-mono font-medium' : balanceVal === 0 ? 'text-muted-foreground font-mono' : 'text-foreground font-mono font-medium'
                    const normalIsDebit = isDebitNormal(account.type)
                    const indentPx = depth * 22

                    // breadcrumb for flat
                    const breadcrumb = viewMode === 'flat' ? getBreadcrumb(account).map((b) => b.name).join(' › ') : ''

                    return (
                      <TableRow key={account.id} className={cn('transition-colors border-b border-border/50 cursor-pointer group', bgClass)} onClick={() => setDrawerAccount(account)}>
                        <Td className="py-2.5 px-4 font-mono text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span dangerouslySetInnerHTML={{ __html: codeHtml }} className="font-semibold" />
                            <span className={cn('text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border', isHeader ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900' : 'bg-muted text-muted-foreground border-transparent')}>
                              {isHeader ? 'Induk' : 'Transaksi'}
                            </span>
                          </div>
                        </Td>

                        <Td className="py-2.5 px-4">
                          <div className="flex items-center">
                            {viewMode === 'tree' ? (
                              <div className="flex items-center shrink-0" style={{ paddingLeft: `${indentPx}px` }}>
                                {depth > 0 && <span className="w-[14px] h-[1px] border-t border-dashed border-border mr-1" />}
                                <span className="mr-1.5">
                                  {hasChildren ? (
                                    <button onClick={(e) => toggleCollapse(e, account.id)} className={cn('w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground transition-transform', isCollapsed ? '-rotate-90' : 'rotate-0')}>
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                  ) : (
                                    <span className="w-5 h-5 flex items-center justify-center text-muted-foreground/40"><span className="w-1.5 h-1.5 rounded-full bg-current" /></span>
                                  )}
                                </span>
                                {isHeader ? <Folder className="w-4 h-4 text-indigo-500 mr-1.5 shrink-0" /> : <FileText className="w-4 h-4 text-muted-foreground mr-1.5 shrink-0" />}
                              </div>
                            ) : null}
                            <div className="truncate">
                              {viewMode === 'flat' && <div className="text-[10px] text-muted-foreground font-mono mb-0.5 truncate max-w-md">{breadcrumb}</div>}
                              <span className={cn(isHeader ? 'font-semibold' : '', 'truncate')} dangerouslySetInnerHTML={{ __html: nameHtml }} />
                            </div>
                          </div>
                        </Td>

                        <Td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', cat.className)}>{cat.label}</span>
                        </Td>

                        <Td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={cn('px-2 py-0.5 text-[11px] font-semibold rounded-md border', normalIsDebit ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900')}>
                            {normalIsDebit ? 'Debit' : 'Kredit'}
                          </span>
                        </Td>

                        <Td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <span className={cn(balanceColor, isHeader && 'font-bold')}>{balanceFmt}</span>
                        </Td>

                        <TableCell className="py-2.5 px-4 text-center whitespace-nowrap" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setDrawerAccount(account)}
                              className="p-1.5 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-md transition-colors"
                              title="Lihat Kartu Akun"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <Link to="/accounts/$accountId" params={{ accountId: account.id }} onClick={(e) => e.stopPropagation()} className="p-1.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-md transition-colors" title="Edit akun">
                              <Plus className="w-4 h-4" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </RawTable>
          </div>

          <div className="p-3.5 bg-muted/30 border-t text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>Menampilkan {renderedRows.length} dari {allAccounts.length} akun</span>
              <span className="text-muted-foreground/50">|</span>
              <span className="font-medium text-foreground">Urutan: {sortLabelMap[sortBy]} ({sortOrder === 'asc' ? 'A-Z / Terkecil' : 'Z-A / Terbesar'})</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Tips: Pada mode <span className="font-medium text-foreground">Tree</span>, klik tanda panah chevron untuk buka/tutup grup akun.</div>
          </div>
        </Card>

        {/* Drawer – simple overlay */}
        {drawerAccount && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setDrawerAccount(null)} />
            <div className="relative w-full max-w-md bg-background shadow-2xl flex flex-col h-full border-l">
              <div className="p-5 border-b bg-muted/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{categoryBadge(drawerAccount.type).label}</span>
                  <h3 className="text-lg font-bold mt-0.5">{drawerAccount.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground">Kode: {drawerAccount.code}</p>
                </div>
                <ShadButton variant="ghost" size="icon" onClick={() => setDrawerAccount(null)}><X className="w-4 h-4" /></ShadButton>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Jalur Hirarki Akun</label>
                  <div className="p-3 bg-muted/50 rounded-xl border text-xs font-mono space-y-1">
                    {getBreadcrumb(drawerAccount).map((p, idx) => (
                      <div key={p.id} className={cn('flex items-center gap-1.5', p.id === drawerAccount.id ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'text-muted-foreground')}>
                        <span>{idx > 0 ? '└─ ' : '● '}</span>
                        <span>{p.code} - {p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl p-4">
                  <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Saldo Berjalan Saat Ini</span>
                  <div className="text-2xl font-bold font-mono mt-1">{formatIDR(Number(drawerAccount.net ?? drawerAccount.balance ?? 0))}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-background border text-indigo-800 dark:text-indigo-200 font-medium">Saldo Normal: {isDebitNormal(drawerAccount.type) ? 'DEBIT' : 'CREDIT'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-background border">Tipe: {hasChildrenSet.has(drawerAccount.id) ? 'Induk (Header)' : 'Transaksi'}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t bg-muted/30 flex items-center justify-end gap-2">
                <ShadButton variant="ghost" onClick={() => setDrawerAccount(null)}>Tutup</ShadButton>
                <ShadButton onClick={() => navigate({ to: '/accounts/$accountId', params: { accountId: drawerAccount.id } })}>Buka Detail</ShadButton>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={confirmAccount !== null}
          onOpenChange={(open) => !open && setConfirmAccount(null)}
          title="Delete account"
          description={confirmAccount ? `Delete account "${confirmAccount.code} — ${confirmAccount.name}"? This action cannot be undone.` : ''}
          confirmLabel="Delete"
          onConfirm={() => confirmAccount && handleDelete(confirmAccount)}
        />
      </div>

      <style>{`mark{background-color:#fef08a;color:#854d0e;padding:1px 3px;border-radius:2px}`}</style>
    </RequireAuth>
  )
}
