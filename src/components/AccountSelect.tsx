import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { api } from '../lib/api'
import type { Account } from '../lib/types'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

type Props = {
  value: string | null
  onValueChange: (value: string | null) => void
  excludeId?: string | null
  placeholder?: string
  allowNone?: boolean
  noneLabel?: string
  disabled?: boolean
}

export function AccountSelect({
  value,
  onValueChange,
  excludeId,
  placeholder = 'Select account…',
  allowNone = false,
  noneLabel = 'None',
  disabled = false,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(null)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    api
      .listAccounts({ search: debouncedQuery || undefined, per_page: 20 })
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
  }, [debouncedQuery, open])

  React.useEffect(() => {
    if (!value) {
      setSelectedAccount(null)
      return
    }
    const found = accounts.find((a) => a.id === value)
    if (found) {
      setSelectedAccount(found)
      return
    }
    let active = true
    api
      .getAccount(value)
      .then((res) => {
        if (active) setSelectedAccount(res.data)
      })
      .catch(() => {
        if (active) setSelectedAccount(null)
      })
    return () => {
      active = false
    }
  }, [value, accounts])

  const handleSelect = (id: string | null) => {
    onValueChange(id)
    setOpen(false)
    setQuery('')
  }

  const label = selectedAccount ? `${selectedAccount.code} — ${selectedAccount.name}` : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !label && 'text-muted-foreground')}>
            {label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by code or name…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>}
            {!loading && accounts.length === 0 && <CommandEmpty>No accounts found.</CommandEmpty>}
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value="__none__"
                  onSelect={() => handleSelect(null)}
                  className="justify-between"
                >
                  <span>{noneLabel}</span>
                  <Check className={cn('size-4', value == null ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              )}
              {accounts.map((account) => {
                const isExcluded = excludeId != null && account.id === excludeId
                const isSelected = value === account.id
                return (
                  <CommandItem
                    key={account.id}
                    value={`${account.code} ${account.name} ${account.id}`}
                    onSelect={() => {
                      if (!isExcluded) handleSelect(account.id)
                    }}
                    disabled={isExcluded}
                    className={cn(
                      'justify-between',
                      isExcluded && 'opacity-50',
                    )}
                  >
                    <span className="flex flex-col">
                      <span>
                        {account.code} — {account.name}
                      </span>
                      {isExcluded && (
                        <span className="text-xs text-muted-foreground">Current account (cannot be parent)</span>
                      )}
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
  )
}
