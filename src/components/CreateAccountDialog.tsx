import * as React from 'react'
import { api } from '../lib/api'
import type { Account, AccountType } from '../lib/types'
import {
  Button,
  ErrorBox,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

export function CreateAccountDialog({
  open,
  onOpenChange,
  suggested,
  description,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  suggested?: { name?: string | null; type?: AccountType | null }
  description?: string
  onCreated: (account: Account) => void
}) {
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<AccountType>('asset')
  const [currency, setCurrency] = React.useState('IDR')
  const [status, setStatus] = React.useState<'active' | 'inactive'>('active')
  const [error, setError] = React.useState<unknown>(null)
  const [creating, setCreating] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setName(suggested?.name ?? '')
      setType(suggested?.type ?? 'asset')
      setCurrency('IDR')
      setStatus('active')
      setError(null)
    }
  }, [open, suggested])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // The dialog is rendered inside the journal form's component tree
    // (via portal), so without this the submit event bubbles to the
    // outer form and would create the journal too.
    e.stopPropagation()
    setError(null)
    setCreating(true)
    try {
      const result = await api.createAccount({
        name,
        type,
        currency,
        status,
      })
      onCreated(result.data)
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new account</DialogTitle>
          <DialogDescription>
            {description ?? 'Create a new account in this organization.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" htmlFor="create_account_name">
            <Input
              id="create_account_name"
              required
              maxLength={255}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Type">
              <Select
                value={type}
                onValueChange={(value) => setType(value as AccountType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">asset</SelectItem>
                  <SelectItem value="liability">liability</SelectItem>
                  <SelectItem value="equity">equity</SelectItem>
                  <SelectItem value="income">income</SelectItem>
                  <SelectItem value="expense">expense</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Currency" htmlFor="create_account_currency">
              <Input
                id="create_account_currency"
                required
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </Field>
            <Field label="Status">
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as 'active' | 'inactive')
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="inactive">inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {error != null && <ErrorBox error={error} />}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}