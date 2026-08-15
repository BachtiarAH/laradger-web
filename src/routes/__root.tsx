import * as React from 'react'
import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import {
  Building2,
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  PiggyBank,
  Tags,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { AuthProvider, useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { Button } from '../components/ui'
import { Button as UiButton } from '../components/ui/button'
import { TenantSwitcher } from '../components/TenantSwitcher'
import { ThemeToggle } from '../components/ThemeToggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'

export const Route = createRootRoute({
  component: RootComponent,
})

const navItems: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/journals', label: 'Journals', icon: NotebookPen },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/tags', label: 'Tags', icon: Tags },
  { to: '/audit-logs', label: 'Audit Logs', icon: History },
]

function SidebarNavLink({
  to,
  label,
  icon: Icon,
  onNavigate,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onNavigate?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      activeProps={{ className: 'bg-primary/10 font-semibold text-primary' }}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </Link>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { token, user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await api.logout()
    } catch {
      // ignore; the token is cleared locally regardless
    } finally {
      logout()
      setLoggingOut(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2 text-lg font-bold text-primary">
          <Building2 className="size-5" aria-hidden />
          Ledgify
        </Link>
      </div>

      {token && (
        <div className="border-b border-border px-3 py-3">
          <TenantSwitcher />
        </div>
      )}

      {token && (
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <SidebarNavLink
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      )}

      <div className="border-t border-border p-3">
        {token ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <UiButton
                variant="ghost"
                className="w-full justify-start gap-2"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-left">
                  {user?.name ?? 'User'}
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
              </UiButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-60">
              <DropdownMenuLabel className="truncate">
                {user?.email ?? ''}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ThemeToggle />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={handleLogout}
                disabled={loggingOut}
              >
                <LogOut className="size-4" aria-hidden />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              to="/login"
              className="rounded-md px-3 py-1.5 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Login
            </Link>
            <Link to="/register" onClick={onNavigate}>
              <Button className="w-full">Register</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function RootComponent() {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const closeMobile = React.useCallback(() => setMobileOpen(false), [])

  return (
    <AuthProvider>
      <div className="min-h-screen lg:flex">
        <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
          <div className="sticky top-0 h-screen">
            <SidebarContent />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
            <UiButton
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" aria-hidden />
            </UiButton>
            <Link to="/" className="text-lg font-bold text-primary">
              Ledgify
            </Link>
          </header>

          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={closeMobile}
                aria-hidden
              />
              <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-background shadow-xl">
                <button
                  className="absolute right-2 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={closeMobile}
                  aria-label="Close menu"
                >
                  <X className="size-5" aria-hidden />
                </button>
                <SidebarContent onNavigate={closeMobile} />
              </div>
            </div>
          )}

          <main className="px-4 py-8 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <TanStackRouterDevtools position="bottom-right" />
    </AuthProvider>
  )
}