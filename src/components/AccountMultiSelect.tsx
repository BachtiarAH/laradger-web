import * as React from 'react'
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react'
import { api } from '../lib/api'
import type { Account, AccountType } from '../lib/types'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { CreateAccountDialog } from './CreateAccountDialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

const CREATE_ACCOUNT_VALUE = '__create__'

type Props = {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  filterType?: 'income' | 'expense' | string
  allowCreate?: boolean
}

export function AccountMultiSelect({ selectedIds, onChange, placeholder = 'Search accounts…', filterType, allowCreate = false }: Props) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedAccounts, setSelectedAccounts] = React.useState<Map<string, Account>>(new Map())
  const [createOpen, setCreateOpen] = React.useState(false)

  const accountType = (filterType === 'income' || filterType === 'expense' ? filterType : undefined) as AccountType | undefined

  React.useEffect(() => {
    let active = true
    setLoading(true)
    api
      .listAccounts({ search: debouncedQuery || undefined, per_page: 20, type: filterType || undefined })
      .then((result) => {
        if (active) setAccounts(result.data)
      })
      .catch(() => {
        if (active) setAccounts([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [debouncedQuery, open, filterType])

  React.useEffect(() => {
    if (selectedIds.length === 0) {
      setSelectedAccounts(new Map())
      return
    }
    let active = true
    Promise.all(
      selectedIds.map((id) =>
        api
          .getAccount(id)
          .then((r) => r.data)
          .catch(() => null),
      ),
    ).then((results) => {
      if (!active) return
      const map = new Map<string, Account>()
      results.forEach((a) => {
        if (a) map.set(a.id, a)
      })
      accounts.forEach((a) => {
        if (selectedIds.includes(a.id)) map.set(a.id, a)
      })
      setSelectedAccounts(map)
    })
    return () => {
      active = false
    }
  }, [selectedIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((v) => v !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const remove = (id: string) => {
    onChange(selectedIds.filter((v) => v !== id))
  }

  const handleCreate = (account: Account) => {
    onChange([...selectedIds, account.id])
    setCreateOpen(false)
    setQuery('')
  }

  return (
    <div className="space-y-2">
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const acc = selectedAccounts.get(id)
            const label = acc ? `${acc.code} — ${acc.name}` : id.slice(0, 8)
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                {label}
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                  aria-label={`Remove ${label}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search by code or name…" value={query} onValueChange={setQuery} />
            <CommandList>
              {loading && <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>}
              {!loading && accounts.length === 0 && <CommandEmpty>No accounts found.</CommandEmpty>}
              <CommandGroup>
                {allowCreate && (
                  <CommandItem
                    value={CREATE_ACCOUNT_VALUE}
                    onSelect={() => {
                      setOpen(false)
                      setQuery('')
                      setCreateOpen(true)
                    }}
                    className="justify-between text-primary"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="size-4" />
                      Create new account…
                    </span>
                  </CommandItem>
                )}
                {accounts.map((account) => {
                  const isSelected = selectedIds.includes(account.id)
                  return (
                    <CommandItem
                      key={account.id}
                      value={`${account.code} ${account.name} ${account.id}`}
                      onSelect={() => toggle(account.id)}
                      className="justify-between"
                    >
                      <span>
                        {account.code} — {account.name}
                      </span>
                      <Check className={cn('size-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
        </Popover>
      {allowCreate && (
        <CreateAccountDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          suggested={{ type: accountType }}
          description={
            filterType === 'income' || filterType === 'expense'
              ? `Create a new ${filterType} account to link to this budget.`
              : undefined
          }
          onCreated={handleCreate}
        />
      )}
    </div>
  )
}
