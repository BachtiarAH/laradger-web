import * as React from 'react'
import { Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import type {
  Account,
  AccountType,
  JournalDraft,
  JournalDraftLine,
  Tag,
} from '../lib/types'
import { Button, Card, ErrorBox } from '../components/ui'
import { AccountSelect } from './AccountSelect'
import { CreateAccountDialog } from './CreateAccountDialog'
import { cn } from '../lib/utils'

export type AiDraftResultLine = {
  account_id: string
  debit: string
  credit: string
  description: string
}

export type AiDraftResult = {
  transaction_date: string | null
  description: string | null
  lines: AiDraftResultLine[]
  tagIds: string[]
}

type ResolvedLine = {
  suggested: JournalDraftLine
  account_id: string | null
}

const CREATE_ACCOUNT_VALUE = '__create__'

function findAccountMatch(
  accounts: Account[],
  name?: string,
  type?: AccountType,
): Account | undefined {
  if (!name) return undefined
  const lower = name.toLowerCase()
  const exact = accounts.find((a) => a.name.toLowerCase() === lower)
  if (exact) return exact
  const pool = type ? accounts.filter((a) => a.type === type) : accounts
  return pool.find(
    (a) =>
      a.name.toLowerCase().includes(lower) ||
      lower.includes(a.name.toLowerCase()),
  )
}

export function AiDraftPanel({
  accounts,
  tags,
  onApply,
}: {
  accounts: Account[]
  tags: Tag[]
  onApply: (draft: AiDraftResult) => void
}) {
  const [statement, setStatement] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<unknown>(null)
  const [draft, setDraft] = React.useState<JournalDraft | null>(null)
  const [resolved, setResolved] = React.useState<ResolvedLine[] | null>(null)
  const [selectedTags, setSelectedTags] = React.useState<string[]>([])
  const [createdAccounts, setCreatedAccounts] = React.useState<Account[]>([])
  const [createForIndex, setCreateForIndex] = React.useState<number | null>(null)

  const allAccounts = React.useMemo(() => {
    const merged = [...accounts, ...createdAccounts]
    return merged.filter(
      (a, i) => merged.findIndex((x) => x.id === a.id) === i,
    )
  }, [accounts, createdAccounts])

  const suggestedTags = draft?.tags ?? []

  const handleGenerate = async () => {
    if (!statement.trim()) return
    setLoading(true)
    setError(null)
    setDraft(null)
    setResolved(null)
    try {
      const result = await api.aiDraftJournal(statement)
      setDraft(result)
      setResolved(
        (result.lines ?? []).map((line) => ({
          suggested: line,
          account_id:
            findAccountMatch(
              allAccounts,
              line.account_name,
              line.account_type,
            )?.id ?? null,
        })),
      )
      setSelectedTags(
        (result.tags ?? []).filter((name) =>
          tags.some((tag) => tag.name.toLowerCase() === name.toLowerCase()),
        ),
      )
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAccountSelect = (index: number, value: string) => {
    if (value === CREATE_ACCOUNT_VALUE) {
      setCreateForIndex(index)
      return
    }
    setResolved((prev) =>
      prev?.map((line, i) =>
        i === index ? { ...line, account_id: value } : line,
      ) ?? null,
    )
  }

  const handleCreatedAccount = (account: Account) => {
    setCreatedAccounts((prev) => [...prev, account])
    if (createForIndex != null) {
      setResolved((prev) =>
        prev?.map((line, i) =>
          i === createForIndex ? { ...line, account_id: account.id } : line,
        ) ?? null,
      )
    }
    setCreateForIndex(null)
  }

  const toggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    )
  }

  const handleApply = () => {
    if (!draft || !resolved) return
    if (resolved.some((line) => !line.account_id)) return
    const tagIds = tags
      .filter((tag) =>
        selectedTags.some(
          (name) => tag.name.toLowerCase() === name.toLowerCase(),
        ),
      )
      .map((tag) => tag.id)
    onApply({
      transaction_date: draft.transaction_date ?? null,
      description: draft.description ?? null,
      lines: resolved.map((line) => ({
        account_id: line.account_id!,
        debit: line.suggested.debit ?? '',
        credit: line.suggested.credit ?? '',
        description: line.suggested.description ?? '',
      })),
      tagIds,
    })
  }

  const allResolved = (resolved ?? []).every((line) => line.account_id)

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">
          AI draft
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Describe the transaction in plain language and generate a draft journal
        to review before saving.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <textarea
          className="min-h-20 w-full flex-1 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30"
          placeholder="e.g. Spent $45.50 on groceries at the supermarket with cash"
          maxLength={2000}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
        />
        <Button onClick={handleGenerate} loading={loading} disabled={!statement.trim()}>
          Generate draft
        </Button>
      </div>

      {error != null && <ErrorBox error={error} />}

      {draft && resolved && (
        <div className="space-y-4 border-t border-border pt-4">
          {resolved.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              The AI could not produce any lines. Try a more specific statement.
            </p>
          ) : (
            <>
              {draft.description && (
                <p className="text-sm">
                  <span className="font-medium text-foreground">Description:</span>{' '}
                  {draft.description}
                </p>
              )}
              {draft.transaction_date && (
                <p className="text-sm">
                  <span className="font-medium text-foreground">Date:</span>{' '}
                  {draft.transaction_date}
                </p>
              )}
              <div className="space-y-2">
                {resolved.map((line, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border p-2"
                  >
                    <div className="col-span-4">
                      <AccountSelect
                        value={line.account_id}
                        onValueChange={(value) => {
                          if (value === CREATE_ACCOUNT_VALUE) {
                            handleAccountSelect(index, CREATE_ACCOUNT_VALUE)
                          } else {
                            handleAccountSelect(index, value ?? '')
                          }
                        }}
                        placeholder="Select account…"
                      />
                      {line.suggested.account_name && (
                        <button
                          type="button"
                          className="mt-1 text-xs text-primary hover:underline"
                          onClick={() => handleAccountSelect(index, CREATE_ACCOUNT_VALUE)}
                        >
                          + Create new account
                        </button>
                      )}
                      {line.suggested.account_name && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          suggested: {line.suggested.account_name}
                          {line.suggested.account_type
                            ? ` (${line.suggested.account_type})`
                            : ''}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 text-sm">
                      {line.suggested.debit
                        ? Number(line.suggested.debit).toLocaleString()
                        : '—'}
                    </div>
                    <div className="col-span-2 text-sm">
                      {line.suggested.credit
                        ? Number(line.suggested.credit).toLocaleString()
                        : '—'}
                    </div>
                    <div className="col-span-4 truncate text-sm text-muted-foreground">
                      {line.suggested.description || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {suggestedTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Suggested tags
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((name) => {
                  const exists = tags.some(
                    (tag) => tag.name.toLowerCase() === name.toLowerCase(),
                  )
                  const checked = selectedTags.includes(name)
                  return (
                    <label
                      key={name}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors',
                        checked
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input text-muted-foreground hover:bg-muted hover:text-foreground',
                        !exists && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        disabled={!exists}
                        onChange={() => toggleTag(name)}
                      />
                      {name}
                      {!exists && <span className="text-xs">(not in org)</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {allResolved
                ? 'Review the lines above, then apply to the form.'
                : 'Resolve all account suggestions before applying.'}
            </p>
            <Button onClick={handleApply} disabled={!allResolved}>
              Apply to form
            </Button>
          </div>
        </div>
      )}

      <CreateAccountDialog
        open={createForIndex != null}
        onOpenChange={(open) => !open && setCreateForIndex(null)}
        suggested={
          createForIndex != null
            ? {
                name: resolved?.[createForIndex]?.suggested.account_name,
                type: resolved?.[createForIndex]?.suggested.account_type,
              }
            : undefined
        }
        description="The AI suggested an account that is not in this organization yet."
        onCreated={handleCreatedAccount}
      />
    </Card>
  )
}