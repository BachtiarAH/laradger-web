import * as React from 'react'
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { Button, Field, Input, ErrorBox } from '../components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { cn } from '../lib/utils'

export function TenantSwitcher({ className }: { className?: string }) {
  const { tenants, tenant, switchTenant, createTenant } = useAuth()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [error, setError] = React.useState<unknown>(null)
  const [creating, setCreating] = React.useState(false)

  if (!tenant) return null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCreating(true)
    try {
      await createTenant({ name, slug: slug || undefined })
      setName('')
      setSlug('')
      setCreateOpen(false)
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className={cn('w-full justify-between', className)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Building2 className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{tenant.name}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Switch organization</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tenants.length === 0 ? (
            <div className="px-1.5 py-1 text-sm text-muted-foreground">
              No other organizations found.
            </div>
          ) : (
            tenants.map((t) => {
              const active = t.slug === tenant.slug
              return (
                <DropdownMenuItem
                  key={t.id}
                  disabled={active}
                  onSelect={() => switchTenant(t)}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{t.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.slug}
                      {t.role ? ` · ${t.role}` : ''}
                    </span>
                  </span>
                  {active && <Check className="size-4" aria-hidden />}
                </DropdownMenuItem>
              )
            })
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              Create a new accounting book and switch to it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Name" htmlFor="org_name">
              <Input
                id="org_name"
                required
                maxLength={255}
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Slug (optional)" htmlFor="org_slug">
              <Input
                id="org_slug"
                placeholder="e.g. acme-corp"
                pattern="^[a-z0-9-]+$"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </Field>
            {error != null && <ErrorBox error={error} />}
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={creating}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}