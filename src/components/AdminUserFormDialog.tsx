import * as React from 'react'
import { api } from '../lib/api'
import type { User } from '../lib/types'
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

export function AdminUserFormDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When null the dialog creates a new account instead. */
  user: User | null
  onSaved: (user: User) => void
}) {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isAdmin, setIsAdmin] = React.useState<'true' | 'false'>('false')
  const [error, setError] = React.useState<unknown>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setName(user?.name ?? '')
      setEmail(user?.email ?? '')
      setPassword('')
      setIsAdmin(user?.is_admin ? 'true' : 'false')
      setError(null)
    }
  }, [open, user])

  const creating = user === null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const isAdminValue = isAdmin === 'true'
      if (creating) {
        const result = await api.createAdminUser({
          name: name.trim(),
          email: email.trim(),
          password,
          is_admin: isAdminValue,
        })
        onSaved(result.data)
      } else {
        const result = await api.updateAdminUser(user.id, {
          name: name.trim(),
          email: email.trim(),
          ...(password.trim() ? { password } : {}),
        })
        onSaved(result.data)
      }
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{creating ? 'Add user' : `Edit ${user?.name ?? 'user'}`}</DialogTitle>
          <DialogDescription>
            {creating
              ? 'Create a new account. Share the initial password with the user so they can log in. Platform admins are dedicated staff accounts.'
              : 'Update account details. Leave the password blank to keep the current one.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" htmlFor="admin_user_name">
            <Input
              id="admin_user_name"
              required
              maxLength={255}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="admin_user_email">
            <Input
              id="admin_user_email"
              type="email"
              required
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={creating ? 'Initial password' : 'New password'} htmlFor="admin_user_password">
            <Input
              id="admin_user_password"
              type="password"
              required={creating}
              minLength={8}
              placeholder={creating ? undefined : 'Leave blank to keep current'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {creating && (
            <Field label="Platform admin">
              <Select
                value={isAdmin}
                onValueChange={(value) => setIsAdmin(value as 'true' | 'false')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">No</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          {error != null && <ErrorBox error={error} />}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {creating ? 'Add user' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
