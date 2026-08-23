import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LogOut, ShieldAlert } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { Button, Card } from './ui'

export function AccessDenied() {
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
          <ShieldAlert className="size-5" aria-hidden />
          <h1 className="text-lg font-bold text-foreground">Access denied</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is not a member of this organization. Choose another
          organization to continue.
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