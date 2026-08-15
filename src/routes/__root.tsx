import * as React from 'react'
import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ChevronDown, LogOut, User } from 'lucide-react'
import { AuthProvider, useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { Button } from '../components/ui'
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

const navLinkClass =
  'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
const navLinkActiveClass =
  'rounded-md px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary'

function NavLink({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={navLinkClass}
      activeProps={{ className: navLinkActiveClass }}
    >
      {children}
    </Link>
  )
}

function Navbar() {
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
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-lg font-bold text-primary"
          >
            Ledgify
          </Link>
          {token && (
            <nav className="hidden items-center gap-1 sm:flex">
              <NavLink to="/">Dashboard</NavLink>
              <NavLink to="/accounts">Accounts</NavLink>
              <NavLink to="/journals">Journals</NavLink>
              <NavLink to="/budgets">Budgets</NavLink>
              <NavLink to="/tags">Tags</NavLink>
              <NavLink to="/audit-logs">Audit Logs</NavLink>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          {token ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  <User className="size-4" aria-hidden />
                  {user?.name ?? 'User'}
                  <ChevronDown className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal text-muted-foreground">
                  {user?.email ?? ''}
                </DropdownMenuLabel>
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
            <>
              <Link
                to="/login"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Login
              </Link>
              <Link to="/register">
                <Button>Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
      {token && (
        <nav className="flex items-center gap-1 border-t border-border px-4 py-2 sm:hidden">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/accounts">Accounts</NavLink>
          <NavLink to="/journals">Journals</NavLink>
          <NavLink to="/budgets">Budgets</NavLink>
          <NavLink to="/tags">Tags</NavLink>
          <NavLink to="/audit-logs">Audit Logs</NavLink>
        </nav>
      )}
    </header>
  )
}

function RootComponent() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <Outlet />
        </main>
      </div>
      <TanStackRouterDevtools position="bottom-right" />
    </AuthProvider>
  )
}