import * as React from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { api } from '../lib/api'
import type { Account } from '../lib/types'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { useDebounce } from '../hooks/useDebounce'
import { CreateAccountDialog } from './CreateAccountDialog'
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

const CREATE_ACCOUNT_VALUE = '__create__'

type Props = {
  value: string | null
  onValueChange: (value: string | null) => void
  excludeId?: string | null
  placeholder?: string
  allowNone?: boolean
  noneLabel?: string
  disabled?: boolean
  allowCreate?: boolean
  type?: string
  leafOnly?: boolean
  hasError?: boolean
  lockCreateType?: boolean
  createDescription?: string
}

export function AccountSelect({
  value,
  onValueChange,
  excludeId,
  placeholder = 'Select account…',
  allowNone = false,
  noneLabel = 'None',
  disabled = false,
  allowCreate = false,
  type,
  leafOnly = false,
  hasError = false,
  lockCreateType = false,
  createDescription,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    api
      .listAccounts({ search: debouncedQuery || undefined, per_page: 20, type: type || undefined })
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
  }, [debouncedQuery, open, type])

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
    if (id === CREATE_ACCOUNT_VALUE) {
      setOpen(false)
      setQuery('')
      setCreateOpen(true)
      return
    }
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
          className={cn(
            'w-full justify-between font-normal',
            hasError && 'border-destructive ring-1 ring-destructive/30',
          )}
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
              {allowCreate && (
                <CommandItem
                  value={CREATE_ACCOUNT_VALUE}
                  onSelect={() => handleSelect(CREATE_ACCOUNT_VALUE)}
                  className="justify-between text-primary"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="size-4" />
                    Create new account…
                  </span>
                </CommandItem>
              )}
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
                const isHeader = account.is_header
                const headerBlocked = leafOnly && isHeader
                const disabledItem = isExcluded || headerBlocked
                const hint = 'tidak bisa dipakai transaksi'
                return (
                  <CommandItem
                    key={account.id}
                    value={`${account.code} ${account.name} ${account.id}`}
                    onSelect={() => {
                      if (!disabledItem) handleSelect(account.id)
                    }}
                    disabled={disabledItem}
                    className={cn(
                      'justify-between',
                      disabledItem && 'opacity-60',
                    )}
                  >
                    <span className="flex flex-col">
                      <span className={cn(headerBlocked && 'text-muted-foreground')}>
                        {account.code} — {account.name}
                        {isHeader && (
                          <span
                            title="Akun induk = folder grup, hanya untuk mengelompokkan. Transaksi harus pakai akun detail di bawahnya"
                            className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            Induk
                          </span>
                        )}
                      </span>
                      {isExcluded && (
                        <span className="text-xs text-muted-foreground">Current account (cannot be parent)</span>
                      )}
                      {headerBlocked && (
                        <span className="text-xs text-muted-foreground">{hint}</span>
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

      <CreateAccountDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        suggested={type ? { type: type as Account['type'] } : undefined}
        description={createDescription}
        lockType={!!lockCreateType && !!type}
        onCreated={(account) => {
          onValueChange(account.id)
          setCreateOpen(false)
        }}
      />
    </Popover>
  )
}
