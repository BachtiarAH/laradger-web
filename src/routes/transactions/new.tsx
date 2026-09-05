import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import * as React from 'react'
import { ApiError, api } from '../../lib/api'
import { RequireAuth } from '../../components/RequireAuth'
import { AccountSelect } from '../../components/AccountSelect'
import { TagInput } from '../../components/TagInput'
import {
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
} from '../../components/ui'
import type { QuickTransactionType, Tag } from '../../lib/types'

export const Route = createFileRoute('/transactions/new')({
  component: QuickTransactionPage,
})

const tabs: { id: QuickTransactionType; label: string; desc: string }[] = [
  { id: 'expense', label: 'Expense', desc: 'Bayar / belanja' },
  { id: 'income', label: 'Income', desc: 'Terima pemasukan' },
  { id: 'transfer', label: 'Transfer', desc: 'Pindah antar akun' },
  { id: 'debt_payment', label: 'Debt', desc: 'Bayar hutang' },
]

function QuickTransactionPage() {
  const navigate = useNavigate()
  const [type, setType] = React.useState<QuickTransactionType>('expense')
  const [amount, setAmount] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [transactionDate, setTransactionDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [tags, setTags] = React.useState<Tag[]>([])
  const [tagIds, setTagIds] = React.useState<string[]>([])
  const [assetId, setAssetId] = React.useState<string | null>(null)
  const [expenseId, setExpenseId] = React.useState<string | null>(null)
  const [incomeId, setIncomeId] = React.useState<string | null>(null)
  const [fromId, setFromId] = React.useState<string | null>(null)
  const [toId, setToId] = React.useState<string | null>(null)
  const [viaId, setViaId] = React.useState<string | null>(null)
  const [liabilityId, setLiabilityId] = React.useState<string | null>(null)
  const [expensePayment, setExpensePayment] = React.useState<'cash' | 'credit'>('cash')
  const [allocations, setAllocations] = React.useState<import('../../lib/types').Allocation[]>([])
  const [allocationId, setAllocationId] = React.useState<string | null>(null)
  const [goals, setGoals] = React.useState<import('../../lib/types').Goal[]>([])
  const [goalId, setGoalId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<unknown>(null)
  const [savingDraft, setSavingDraft] = React.useState(false)
  const [savingPosted, setSavingPosted] = React.useState(false)
  const [extraTags, setExtraTags] = React.useState<Tag[]>([])

  const allTags = React.useMemo(() => [...tags, ...extraTags], [tags, extraTags])

  React.useEffect(() => {
    api.listTags({ per_page: 100 }).then((r) => setTags(r.data)).catch(() => {})
    api.listAllocations({ per_page: 100, status: 'active' }).then((r) => setAllocations(r.data)).catch(() => {})
    api.listGoals({ per_page: 100, status: 'active' }).then((r) => setGoals(r.data)).catch(() => {})
  }, [])

  const buildPayload = (status: 'draft' | 'posted'): Parameters<typeof api.createTransaction>[0] | null => {
    if (!amount || Number(amount) <= 0) {
      setError(new Error('Amount harus > 0'))
      return null
    }
    const payload: Parameters<typeof api.createTransaction>[0] = {
      type,
      amount: Number(amount),
      description: description.trim() || `${type} ${amount}`,
      transaction_date: transactionDate,
      status,
      ...(tagIds.length ? { tags: tagIds } : {}),
      ...(type === 'expense' && allocationId ? { allocation_id: allocationId } : {}),
      ...(type === 'transfer' && goalId ? { goal_id: goalId } : {}),
    }
    if (type === 'expense') {
      if (!expenseId) { setError(new Error('Pilih Category (expense)')); return null }
      payload.expense_account_id = expenseId
      payload.payment_method = expensePayment
      if (expensePayment === 'credit') {
        if (!liabilityId) { setError(new Error('Pilih Hutang ke (liability: PayLater/CC)')); return null }
        payload.liability_account_id = liabilityId
      } else {
        if (!assetId) { setError(new Error('Pilih Paid from (asset)')); return null }
        payload.asset_account_id = assetId
      }
    } else if (type === 'income') {
      if (!assetId || !incomeId) { setError(new Error('Pilih Received to (asset) dan Source (income)')); return null }
      payload.asset_account_id = assetId
      payload.income_account_id = incomeId
    } else if (type === 'transfer') {
      if (!fromId || !toId) { setError(new Error('Pilih From dan To')); return null }
      payload.from_account_id = fromId
      payload.to_account_id = toId
      if (viaId) payload.via_account_ids = [viaId]
    } else if (type === 'debt_payment') {
      if (!assetId || !liabilityId) { setError(new Error('Pilih From (asset) dan Debt (liability)')); return null }
      payload.asset_account_id = assetId
      payload.liability_account_id = liabilityId
    }
    return payload
  }

  const handleDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const payload = buildPayload('draft')
    if (!payload) return
    setSavingDraft(true)
    try {
      const res = await api.createTransaction(payload)
      navigate({ to: '/journals/$journalId', params: { journalId: res.data.id } })
    } catch (err) { setError(err) } finally { setSavingDraft(false) }
  }

  const handlePost = async () => {
    setError(null)
    const payload = buildPayload('posted')
    if (!payload) return
    setSavingPosted(true)
    try {
      const res = await api.createTransaction(payload)
      navigate({ to: '/journals/$journalId', params: { journalId: res.data.id } })
    } catch (err) { setError(err) } finally { setSavingPosted(false) }
  }

  return (
    <RequireAuth>
      <PageHeader
        title="Quick Transaction"
        subtitle="Tanpa paham debit/credit — jurnal otomatis terbentuk"
        actions={
          <div className="flex gap-2">
            <Link to="/journals/new"><Button variant="secondary">Manual Journal</Button></Link>
            <Link to="/journals"><Button variant="secondary">Back to Journals</Button></Link>
          </div>
        }
      />

      <div className="mb-4 -mx-1 flex gap-2 overflow-x-auto overflow-y-visible px-1 py-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={`shrink-0 rounded-xl px-4 py-3 text-left ring-1 transition ${type === t.id ? 'bg-primary text-primary-foreground ring-primary' : 'bg-card ring-foreground/10 hover:ring-primary'}`}
          >
            <div className="text-sm font-semibold">{t.label}</div>
            <div className={`text-xs ${type === t.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{t.desc}</div>
          </button>
        ))}
      </div>

      <form onSubmit={handleDraft} className="space-y-4">
        <Card className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Amount" htmlFor="amount">
              <Input id="amount" type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="20000" />
            </Field>
            <Field label="Tanggal" htmlFor="date">
              <Input id="date" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
            </Field>
            <Field label="Deskripsi" htmlFor="desc">
              <Input id="desc" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === 'expense' ? 'Coffee di Kopi Kenangan' : type === 'income' ? 'Gaji September' : 'Transfer BRI → Jago'} />
            </Field>
          </div>

          {type === 'expense' && (
            <>
              <div className="flex gap-2">
                <button type="button" onClick={() => setExpensePayment('cash')} className={`rounded-lg px-3 py-2 text-sm ring-1 ${expensePayment === 'cash' ? 'bg-primary text-primary-foreground ring-primary' : 'bg-card ring-foreground/10'}`}>Tunai</button>
                <button type="button" onClick={() => setExpensePayment('credit')} className={`rounded-lg px-3 py-2 text-sm ring-1 ${expensePayment === 'credit' ? 'bg-primary text-primary-foreground ring-primary' : 'bg-card ring-foreground/10'}`}>Hutang dulu</button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {expensePayment === 'cash' ? (
                  <Field label="Paid from (Asset: BRI / Jago / Cash)">
                    <AccountSelect value={assetId} onValueChange={setAssetId} type="asset" leafOnly allowCreate lockCreateType createDescription="Akun aset sumber dana (BRI, Jago, Cash)" placeholder="Pilih akun aset..." />
                  </Field>
                ) : (
                  <Field label="Hutang ke (Liability: PayLater / CC)">
                    <AccountSelect value={liabilityId} onValueChange={setLiabilityId} type="liability" leafOnly allowCreate lockCreateType createDescription="Akun hutang — tipe otomatis liability" placeholder="Pilih PayLater/CC..." />
                  </Field>
                )}
                <Field label="Category (Expense: Coffee / Food)">
                  <AccountSelect value={expenseId} onValueChange={setExpenseId} type="expense" leafOnly allowCreate lockCreateType createDescription="Kategori pengeluaran — tipe otomatis expense" placeholder="Pilih kategori expense..." />
                </Field>
              </div>
              <Field label="Fulfill Allocation (optional)">
                <Select
                  value={allocationId ?? 'none'}
                  onValueChange={(v) => setAllocationId(v === 'none' ? null : v)}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="— None (No allocation) —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None (No allocation) —</SelectItem>
                    {allocations.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} (Remaining: {a.remaining_amount ?? a.target_amount ?? '—'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <p className="text-xs text-muted-foreground">{expensePayment === 'cash' ? 'Jurnal: Dr Expense / Cr Asset (langsung lunas)' : 'Jurnal: Dr Expense / Cr Liability (hutang naik) — lunasi nanti via tab Debt'}</p>
            </>
          )}
          {type === 'income' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Received to (Asset: BRI)">
                <AccountSelect value={assetId} onValueChange={setAssetId} type="asset" leafOnly allowCreate lockCreateType createDescription="Akun aset penerima dana" placeholder="Pilih akun aset..." />
              </Field>
              <Field label="Source (Income: Salary / Freelance)">
                <AccountSelect value={incomeId} onValueChange={setIncomeId} type="income" leafOnly allowCreate lockCreateType createDescription="Sumber pemasukan — tipe otomatis income" placeholder="Pilih source income..." />
              </Field>
            </div>
          )}
          {type === 'transfer' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="From (Asset)">
                  <AccountSelect value={fromId} onValueChange={setFromId} type="asset" leafOnly allowCreate lockCreateType createDescription="Akun aset asal transfer" placeholder="BRI..." />
                </Field>
                <Field label="Via (optional, e.g. ShopeePay)">
                  <AccountSelect value={viaId} onValueChange={setViaId} type="asset" leafOnly allowCreate allowNone noneLabel="— No via —" lockCreateType createDescription="Akun transit (opsional) — tipe asset" placeholder="Transit (opsional)" />
                </Field>
                <Field label="To (Asset)">
                  <AccountSelect value={toId} onValueChange={setToId} type="asset" leafOnly allowCreate lockCreateType createDescription="Akun aset tujuan transfer" placeholder="Jago..." />
                </Field>
              </div>
              <Field label="Contribute to Goal (optional)">
                <Select
                  value={goalId ?? 'none'}
                  onValueChange={(v) => setGoalId(v === 'none' ? null : v)}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="— None (Normal transfer) —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None (Normal transfer) —</SelectItem>
                    {goals.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} (Remaining: {g.remaining_amount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          {type === 'debt_payment' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="From (Asset: BRI)">
                <AccountSelect value={assetId} onValueChange={setAssetId} type="asset" leafOnly allowCreate lockCreateType createDescription="Akun aset sumber pembayaran" placeholder="Bayar dari..." />
              </Field>
              <Field label="Debt (Liability: PayLater / CC)">
                <AccountSelect value={liabilityId} onValueChange={setLiabilityId} type="liability" leafOnly allowCreate lockCreateType createDescription="Akun hutang — tipe otomatis liability" placeholder="Pilih hutang..." />
              </Field>
            </div>
          )}

          <Field label="Tags (optional)">
            <TagInput tags={allTags} selectedIds={tagIds} onChange={setTagIds} onTagCreated={(t) => setExtraTags((p) => [...p, t])} />
          </Field>

          {error != null && <ErrorBox error={error} />}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={savingDraft}>Save as draft</Button>
            <Button type="button" variant="secondary" loading={savingPosted} onClick={handlePost}>Save & post</Button>
          </div>
          <p className="text-xs text-muted-foreground">Default draft — cek dulu di detail journal, lalu Post. Otomatis: Expense Tunai Dr Expense/Cr Asset · Expense Hutang Dr Expense/Cr Liability · Income Dr Asset/Cr Income · Transfer Dr To/Cr From · Debt Dr Liability/Cr Asset.</p>
        </Card>
      </form>
    </RequireAuth>
  )
}
