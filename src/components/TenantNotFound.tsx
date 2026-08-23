import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Building2, LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { Button, Card } from './ui'

export function TenantNotFound() {
  const { tenants, switchTenant, logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="mx-auto max-w-lg py-12">
      <Card className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <Building2 className="size-5" aria-hidden />
          <h1 className="text-lg font-bold text-foreground">Tenant not found</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          The organization you were using no longer exists or you no longer have
          access to it. Choose another organization to continue.
        </p>
        {tenants.length > 0 && (
          <div className="mt-4 space-y-2">
            {tenants.map((t) => (
              <Button
                key={t.id}
                variant="secondary"
                className="w-full justify-start"
                onClick={() => switchTenant(t)}
              >
                <span className="truncate">{t.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {t.slug}
                </span>
              </Button>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={handleSignOut}>
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  )
}