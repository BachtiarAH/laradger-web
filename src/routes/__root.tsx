import * as React from 'react'
import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AuthProvider, useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { Button } from '../components/ui'

export const Route = createRootRoute({
  component: RootComponent,
})

const navLinkClass =
  'rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
const navLinkActiveClass =
  'rounded-md px-3 py-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200'

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
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            Ledgify
          </Link>
          {token && (
            <nav className="hidden items-center gap-1 sm:flex">
              <NavLink to="/">Dashboard</NavLink>
              <NavLink to="/accounts">Accounts</NavLink>
              <NavLink to="/journals">Journals</NavLink>
              <NavLink to="/tags">Tags</NavLink>
              <NavLink to="/audit-logs">Audit Logs</NavLink>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          {token ? (
            <>
              <span className="hidden text-sm text-gray-500 sm:block dark:text-gray-400">
                {user?.name ?? 'User'}
              </span>
              <Button variant="secondary" onClick={handleLogout} loading={loggingOut}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
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
        <nav className="flex items-center gap-1 border-t border-gray-200 px-4 py-2 sm:hidden dark:border-gray-800">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/accounts">Accounts</NavLink>
          <NavLink to="/journals">Journals</NavLink>
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
