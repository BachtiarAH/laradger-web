import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { useMoney } from '../../lib/money'
import { RequireAuth } from '../../components/RequireAuth'
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  SortableTableHeader,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  Td,
  Th,
  type SortDirection,
} from '../../components/ui'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet'
import { cn } from '../../lib/utils'
import {
  ArrowRight,
  ChevronRight,
  Eye,
  Folder,
  Plus,
  Search,
  Wallet,
  X,
} from 'lucide-react'
import type { Account, AccountType } from '../../lib/types'

// ── helpers ──────────────────────────────────────────────────────────────

/** Asset and expense accounts grow on the debit side; the rest on the credit side. */
function isDebitNormal(type: AccountType): boolean {
  return type === 'asset' || type === 'expense'
}

const accountTypeLabels: Record<AccountType, string> = {
  asset: '1 - Aset',
  liability: '2 - Liabilitas',
  equity: '3 - Ekuitas',
  income: '4 - Pendapatan',
  expense: '5/6 - Beban',
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Renders `text` with every case-insensitive match of `keyword` wrapped in a
 * `<mark>`. Done with React nodes rather than `dangerouslySetInnerHTML` so no
 * markup is ever injected, and the highlight colour lives in one class instead
 * of a page-level `<style>` block.
 */
function Highlight({ text, keyword }: { text: string; keyword: string }) {
  const kw = keyword.trim()
  if (!kw) return <>{text}</>

  const parts = text.split(new RegExp(`(${escapeRegex(kw)})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === kw.toLowerCase() ? (
          <mark
            key={i}
            className="rounded bg-amber-100 px-0.5 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  )
}

// ── Statistics ───────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  hint,
  loading,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  loading?: boolean
}) {
  return (
    <Card className="bg-muted/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
        {loading ? <Skeleton className="h-7 w-24" /> : value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}

function StatisticsCards({
  accounts,
  loading,
  getAggregatedNet,
}: {
  accounts: Account[]
  loading: boolean
  getAggregatedNet: (a: Account) => number
}) {
  const { idr } = useMoney()

  // Roll up header totals from the roots only, otherwise every parent's roll-up
  // would be counted again on top of its children.
  const isRoot = (a: Account) => a.parent_id == null && (a.depth === 0 || !a.code.includes('-'))
  const hasRoots = accounts.some(isRoot)
  const sumByType = (types: AccountType[]) => {
    if (hasRoots) {
      return accounts
        .filter((a) => isRoot(a) && types.includes(a.type))
        .reduce((sum, a) => sum + getAggregatedNet(a), 0)
    }
    return accounts
      .filter((a) => types.includes(a.type))
      .reduce((sum, a) => sum + Number(a.net ?? a.balance ?? 0), 0)
  }

  const assets = sumByType(['asset'])
  const liabilities = sumByType(['liability'])
  const equity = sumByType(['equity'])
  const revenue = sumByType(['income'])

  const childrenIds = new Set(accounts.map((a) => a.parent_id).filter(Boolean))
  const headerCount = accounts.filter((a) => childrenIds.has(a.id)).length
  const detailCount = accounts.length - headerCount
  const activeCount = accounts.filter((a) => a.status === 'active').length

  return (
    <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-5">
      <StatTile
        label="Total Aset"
        value={idr(assets)}
        hint="Normal: Debit"
        loading={loading}
      />
      <StatTile
        label="Liabilitas"
        value={idr(liabilities)}
        hint="Normal: Kredit"
        loading={loading}
      />
      <StatTile
        label="Ekuitas Modal"
        value={idr(equity)}
        hint="Modal & saldo laba"
        loading={loading}
      />
      <StatTile
        label="Pendapatan"
        value={idr(revenue)}
        hint="Normal: Kredit"
        loading={loading}
      />
      <div className="col-span-2 lg:col-span-1">
        <StatTile
          label="Akun Aktif"
          value={activeCount}
          hint={`${headerCount} induk · ${detailCount} transaksi`}
          loading={loading}
        />
      </div>
    </div>
  )
}

// ── Route ────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/accounts/')({
  component: AccountsPage,
})

type SortBy = 'code' | 'name' | 'category' | 'balance'

const sortLabelMap: Record<SortBy, string> = {
  code: 'Kode Akun',
  name: 'Nama Akun',
  category: 'Kategori',
  balance: 'Saldo Berjalan',
}

function AccountsPage() {
  const navigate = useNavigate()
  const { idr } = useMoney()

  const [search, setSearch] = React.useState('')
  const [filterCategory, setFilterCategory] = React.useState('ALL')
  const [filterNodeType, setFilterNodeType] = React.useState('ALL')
  const [filterNonZero, setFilterNonZero] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<'tree' | 'flat'>('tree')
  const [sortBy, setSortBy] = React.useState<SortBy>('code')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc')
  const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set())
  const [drawerAccount, setDrawerAccount] = React.useState<Account | null>(null)

  // The tree needs the full account set, so it is fetched once and filtered
  // client-side rather than paged.
  const { data, error, loading } = useFetch(
    () => api.listAccounts({ per_page: 100 }),
    [],
  )

  const allAccounts: Account[] = React.useMemo(() => data?.data ?? [], [data])

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
    // Sub-parents with a null parent_id are orphans, not top-level accounts.
    cm.set('ROOT', (cm.get('ROOT') ?? []).filter(isMainParent))
    const hs = new Set<string>()
    for (const a of allAccounts) if (cm.has(a.id)) hs.add(a.id)
    return { childrenMap: cm, hasChildrenSet: hs, accountMap: am }
  }, [allAccounts])

  const aggregatedNetMap = React.useMemo(() => {
    const map = new Map<string, number>()
    const visiting = new Set<string>()
    const directNet = (a: Account) => Number(a.net ?? a.balance ?? 0)
    const dfs = (id: string): number => {
      if (map.has(id)) return map.get(id)!
      if (visiting.has(id)) return 0
      visiting.add(id)
      const children = childrenMap.get(id) ?? []
      if (children.length === 0) {
        const value = accountMap.has(id) ? directNet(accountMap.get(id)!) : 0
        map.set(id, value)
        visiting.delete(id)
        return value
      }
      // Header accounts are not postable, so their roll-up is the sum of their
      // children only — including their own postings would double count.
      let sum = 0
      for (const c of children) sum += dfs(c.id)
      map.set(id, sum)
      visiting.delete(id)
      return sum
    }
    for (const a of allAccounts) dfs(a.id)
    return map
  }, [allAccounts, childrenMap, accountMap])

  const getAggregatedNet = React.useCallback(
    (a: Account) => aggregatedNetMap.get(a.id) ?? Number(a.net ?? a.balance ?? 0),
    [aggregatedNetMap],
  )

  const getBreadcrumb = React.useCallback(
    (acc: Account): Account[] => {
      const path: Account[] = [acc]
      let cur: Account | undefined = acc
      while (cur?.parent_id) {
        const parent = accountMap.get(cur.parent_id)
        if (!parent) break
        path.unshift(parent)
        cur = parent
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
      if (filterNonZero && getAggregatedNet(a) === 0) return false
      return true
    },
    [search, filterCategory, filterNodeType, filterNonZero, hasChildrenSet, getAggregatedNet],
  )

  // Keeps a matched descendant visible by walking its whole branch into the result.
  const nodeOrDescendantMatches = React.useCallback(
    (node: Account): boolean => {
      if (itemMatches(node)) return true
      return (childrenMap.get(node.id) ?? []).some((c) => nodeOrDescendantMatches(c))
    },
    [itemMatches, childrenMap],
  )

  const comparator = React.useCallback(
    (a: Account, b: Account): number => {
      let res = 0
      if (sortBy === 'code') res = a.code.localeCompare(b.code)
      else if (sortBy === 'name') res = a.name.localeCompare(b.name)
      else if (sortBy === 'category') res = a.type.localeCompare(b.type)
      else if (sortBy === 'balance') res = getAggregatedNet(a) - getAggregatedNet(b)
      return sortDirection === 'asc' ? res : -res
    },
    [sortBy, sortDirection, getAggregatedNet],
  )

  const renderedRows = React.useMemo(() => {
    const isSearchActive = search.trim().length > 0
    type Row = { account: Account; depth: number; hasChildren: boolean; isCollapsed: boolean }
    const rows: Row[] = []
    const visited = new Set<string>()

    if (viewMode === 'tree') {
      const traverse = (parentId: string, depth: number, ancestorVisible: boolean) => {
        const children = [...(childrenMap.get(parentId) ?? [])].sort(comparator)
        for (const node of children) {
          if (visited.has(node.id)) continue
          if (!nodeOrDescendantMatches(node)) continue
          const hasChildren = hasChildrenSet.has(node.id)
          const isCollapsed = collapsedNodes.has(node.id)
          if (ancestorVisible) {
            visited.add(node.id)
            rows.push({ account: node, depth, hasChildren, isCollapsed })
          }
          // While searching, force branches open so matches below stay visible.
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

  const toggleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDirection('asc')
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
    else setCollapsedNodes(new Set(hasChildrenSet))
  }

  const hasActiveFilters =
    search.trim() !== '' || filterCategory !== 'ALL' || filterNodeType !== 'ALL' || filterNonZero

  const resetFilters = () => {
    setSearch('')
    setFilterCategory('ALL')
    setFilterNodeType('ALL')
    setFilterNonZero(false)
    setCollapsedNodes(new Set())
  }

  return (
    <RequireAuth>
      <PageHeader
        title="Bagan Akun"
        subtitle="Chart of Accounts (PSAK / GAAP) dengan navigasi hirarki dan filter multi-dimensi"
        actions={
          <Link to="/accounts/new">
            <Button className="gap-1.5">
              <Plus className="size-4" aria-hidden />
              Tambah Akun Baru
            </Button>
          </Link>
        }
      />

      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}

      <StatisticsCards accounts={allAccounts} loading={loading} getAggregatedNet={getAggregatedNet} />

      {/* Filters */}
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cari akun">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder="Kode (mis. 1-1100) atau nama akun"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Bersihkan pencarian"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </div>
          </Field>

          <Field label="Kategori">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua kategori</SelectItem>
                <SelectItem value="asset">Assets</SelectItem>
                <SelectItem value="liability">Liabilities</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Level akun">
            <Select value={filterNodeType} onValueChange={setFilterNodeType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua level akun</SelectItem>
                <SelectItem value="HEADER">Hanya akun induk (header)</SelectItem>
                <SelectItem value="POSTABLE">Hanya akun transaksi (detail)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tampilan">
            <Select
              value={viewMode}
              onValueChange={(v) => setViewMode(v as 'tree' | 'flat')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tree">Hirarki (tree)</SelectItem>
                <SelectItem value="flat">Daftar terbuka (flat)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant={filterNonZero ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterNonZero((v) => !v)}
          >
            Hanya saldo aktif
          </Button>
          <Button variant="secondary" size="sm" onClick={resetFilters} disabled={!hasActiveFilters}>
            Reset filter
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => expandAll(true)}
            disabled={viewMode !== 'tree'}
          >
            Buka semua
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => expandAll(false)}
            disabled={viewMode !== 'tree'}
          >
            Tutup semua
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            Urutan: {sortLabelMap[sortBy]} ({sortDirection === 'asc' ? 'A-Z / terkecil' : 'Z-A / terbesar'})
          </span>
        </div>
      </Card>

      {/* Account table */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Daftar akun{' '}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({renderedRows.length} dari {allAccounts.length})
            </span>
          </h2>
          {viewMode === 'tree' && (
            <p className="text-xs text-muted-foreground">
              Gunakan chevron untuk membuka atau menutup grup akun.
            </p>
          )}
        </div>

        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <SortableTableHeader
                label="Kode Akun"
                column="code"
                activeColumn={sortBy}
                direction={sortDirection}
                onSort={toggleSort}
                className="w-44"
              />
              <SortableTableHeader
                label="Nama Akun"
                column="name"
                activeColumn={sortBy}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableTableHeader
                label="Kategori"
                column="category"
                activeColumn={sortBy}
                direction={sortDirection}
                onSort={toggleSort}
                className="w-40"
              />
              <Th className="w-28 text-center">Normal</Th>
              <SortableTableHeader
                label="Saldo Berjalan"
                column="balance"
                activeColumn={sortBy}
                direction={sortDirection}
                onSort={toggleSort}
                align="right"
                className="w-48"
              />
              <Th className="w-28 text-center">Aksi</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <Td><Skeleton className="h-4 w-16" /></Td>
                  <Td><Skeleton className="h-4 w-40" /></Td>
                  <Td><Skeleton className="h-4 w-24" /></Td>
                  <Td className="text-center"><Skeleton className="mx-auto h-4 w-14" /></Td>
                  <Td className="text-right"><Skeleton className="ml-auto h-4 w-24" /></Td>
                  <Td className="text-center"><Skeleton className="mx-auto h-4 w-16" /></Td>
                </TableRow>
              ))
            ) : renderedRows.length === 0 ? (
              <TableRow>
                <Td colSpan={6} className="p-12 text-center">
                  <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Search className="size-6" aria-hidden />
                  </div>
                  <p className="text-base font-semibold text-foreground">
                    Tidak ada akun yang cocok
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Coba sesuaikan kata kunci pencarian atau bersihkan filter Anda.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={resetFilters}
                  >
                    Reset filter
                  </Button>
                </Td>
              </TableRow>
            ) : (
              renderedRows.map(({ account, depth, hasChildren, isCollapsed }) => {
                const isHeader = hasChildren
                const balance = getAggregatedNet(account)
                const normalIsDebit = isDebitNormal(account.type)
                const breadcrumb =
                  viewMode === 'flat'
                    ? getBreadcrumb(account)
                        .map((b) => b.name)
                        .join(' › ')
                    : ''

                return (
                  <TableRow
                    key={account.id}
                    className={cn('cursor-pointer', isHeader && 'bg-muted/40 font-semibold')}
                    onClick={() => setDrawerAccount(account)}
                  >
                    <Td className="whitespace-nowrap font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <span>
                          <Highlight text={account.code} keyword={search} />
                        </span>
                        <Badge
                          value={isHeader ? 'parent' : 'child'}
                          label={isHeader ? 'Induk' : 'Transaksi'}
                          className="px-1.5 py-0 text-[10px] uppercase"
                        />
                      </div>
                    </Td>

                    <Td>
                      <div className="flex items-center">
                        {viewMode === 'tree' && (
                          <div
                            className="flex shrink-0 items-center"
                            style={{ paddingLeft: `${depth * 22}px` }}
                          >
                            {depth > 0 && (
                              <span className="mr-1 h-px w-[14px] border-t border-dashed border-border" />
                            )}
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={(e) => toggleCollapse(e, account.id)}
                                aria-label={isCollapsed ? 'Buka grup akun' : 'Tutup grup akun'}
                                aria-expanded={!isCollapsed}
                                className={cn(
                                  'mr-1.5 flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                                  isCollapsed && '-rotate-90',
                                )}
                              >
                                <ChevronRight className="size-3.5" aria-hidden />
                              </button>
                            ) : (
                              <span className="mr-1.5 flex size-5 items-center justify-center">
                                <span className="size-1.5 rounded-full bg-border" />
                              </span>
                            )}
                            {isHeader ? (
                              <Folder className="mr-1.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                            ) : null}
                          </div>
                        )}
                        <div className="min-w-0">
                          {breadcrumb && (
                            <div className="mb-0.5 max-w-md truncate font-mono text-[10px] text-muted-foreground">
                              {breadcrumb}
                            </div>
                          )}
                          <span className="block truncate">
                            <Highlight text={account.name} keyword={search} />
                          </span>
                        </div>
                      </div>
                    </Td>

                    <Td className="whitespace-nowrap">
                      <Badge
                        value={account.type}
                        label={accountTypeLabels[account.type]}
                      />
                    </Td>

                    <Td className="whitespace-nowrap text-center">
                      <Badge
                        value={normalIsDebit ? 'debit' : 'credit'}
                        label={normalIsDebit ? 'Debit' : 'Kredit'}
                      />
                    </Td>

                    <Td
                      className={cn(
                        'whitespace-nowrap text-right tabular-nums',
                        balance < 0
                          ? 'text-destructive font-medium'
                          : balance === 0
                            ? 'text-muted-foreground'
                            : 'text-foreground font-medium',
                      )}
                    >
                      {idr(balance)}
                    </Td>

                    <Td className="whitespace-nowrap text-center">
                      <div
                        className="flex items-center justify-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setDrawerAccount(account)}
                          aria-label={`Lihat kartu akun ${account.code}`}
                          title="Lihat kartu akun"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="size-4" aria-hidden />
                        </button>
                        <Link
                          to="/accounts/$accountId"
                          params={{ accountId: account.id }}
                          aria-label={`Buka detail akun ${account.code}`}
                          title="Buka detail akun"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </div>
                    </Td>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Account card — quick peek without leaving the list */}
      <Sheet open={drawerAccount !== null} onOpenChange={(open) => !open && setDrawerAccount(null)}>
        <SheetContent side="right" className="w-full max-w-md">
          {drawerAccount && (
            <>
              <SheetHeader>
                <div className="min-w-0">
                  <Badge
                    value={drawerAccount.type}
                    label={accountTypeLabels[drawerAccount.type]}
                  />
                  <SheetTitle className="mt-2 truncate">{drawerAccount.name}</SheetTitle>
                  <SheetDescription className="font-mono">{drawerAccount.code}</SheetDescription>
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Jalur hierarki akun
                  </p>
                  <ul className="space-y-1 rounded-lg bg-muted/50 p-3 font-mono text-xs">
                    {getBreadcrumb(drawerAccount).map((b, idx) => (
                      <li
                        key={b.id}
                        className={cn(
                          'flex items-center gap-1.5',
                          b.id === drawerAccount.id
                            ? 'font-semibold text-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        {idx > 0 ? (
                          <ChevronRight className="size-3 shrink-0" aria-hidden />
                        ) : (
                          <Wallet className="size-3 shrink-0" aria-hidden />
                        )}
                        <span className="truncate">
                          {b.code} - {b.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Saldo berjalan saat ini
                    {hasChildrenSet.has(drawerAccount.id) && ' (roll-up anak)'}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">
                    {idr(getAggregatedNet(drawerAccount))}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      value={isDebitNormal(drawerAccount.type) ? 'debit' : 'credit'}
                      label={`Normal: ${isDebitNormal(drawerAccount.type) ? 'Debit' : 'Kredit'}`}
                    />
                    <Badge
                      value={hasChildrenSet.has(drawerAccount.id) ? 'parent' : 'child'}
                      label={hasChildrenSet.has(drawerAccount.id) ? 'Akun induk' : 'Akun transaksi'}
                    />
                    <Badge value={drawerAccount.status} />
                  </div>
                  {drawerAccount.children_count > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {drawerAccount.children_count} akun anak tertaut
                    </p>
                  )}
                </div>
              </div>

              <SheetFooter>
                <Button variant="secondary" onClick={() => setDrawerAccount(null)}>
                  Tutup
                </Button>
                <Button
                  onClick={() =>
                    navigate({
                      to: '/accounts/$accountId',
                      params: { accountId: drawerAccount.id },
                    })
                  }
                >
                  Buka detail
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </RequireAuth>
  )
}
