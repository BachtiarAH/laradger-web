import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { api, clearTenant, clearToken, getTenant, getToken, onUnauthorized, setTenant, setToken } from './api'
import type { Tenant, User } from './types'

const USER_KEY = 'ledgify.user'
const TENANTS_KEY = 'ledgify.tenants'

type LoginOptions = {
  tenants?: Tenant[]
  tenant?: Tenant
}

type AuthContextValue = {
  token: string | null
  user: User | null
  tenants: Tenant[]
  tenant: Tenant | null
  login: (token: string, user: User, options?: LoginOptions) => void
  logout: () => void
  switchTenant: (tenant: Tenant) => void
  refreshTenants: () => Promise<Tenant[]>
  createTenant: (payload: { name: string; slug?: string }) => Promise<Tenant>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function readStoredTenants(): Tenant[] {
  try {
    const raw = localStorage.getItem(TENANTS_KEY)
    return raw ? (JSON.parse(raw) as Tenant[]) : []
  } catch {
    return []
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [token, setAuthToken] = React.useState<string | null>(() => getToken())
  const [user, setUser] = React.useState<User | null>(() => readStoredUser())
  const [tenants, setTenants] = React.useState<Tenant[]>(() => readStoredTenants())
  const [tenant, setActiveTenant] = React.useState<Tenant | null>(() => getTenant())

  const login = React.useCallback(
    (nextToken: string, nextUser: User, options: LoginOptions = {}) => {
      const nextTenants =
        options.tenants ??
        nextUser.tenants ??
        readStoredTenants()
      const nextTenant =
        options.tenant ??
        nextTenants[0] ??
        getTenant()

      setToken(nextToken)
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      localStorage.setItem(TENANTS_KEY, JSON.stringify(nextTenants))
      if (nextTenant) setTenant(nextTenant)

      setAuthToken(nextToken)
      setUser(nextUser)
      setTenants(nextTenants)
      setActiveTenant(nextTenant)
    },
    [],
  )

  const logout = React.useCallback(() => {
    clearToken()
    clearTenant()
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TENANTS_KEY)
    setAuthToken(null)
    setUser(null)
    setTenants([])
    setActiveTenant(null)
  }, [])

  const switchTenant = React.useCallback((nextTenant: Tenant) => {
    setTenant(nextTenant)
    setActiveTenant(nextTenant)
    window.location.assign('/')
  }, [])

  const refreshTenants = React.useCallback(async (): Promise<Tenant[]> => {
    const next = await api.listTenants()
    setTenants(next)
    localStorage.setItem(TENANTS_KEY, JSON.stringify(next))
    return next
  }, [])

  const createTenant = React.useCallback(
    async (payload: { name: string; slug?: string }) => {
      const created = await api.createTenant(payload)
      const next = await refreshTenants()
      switchTenant(next.find((t) => t.slug === created.slug) ?? created)
      return created
    },
    [refreshTenants, switchTenant],
  )

  React.useEffect(() => {
    return onUnauthorized(() => {
      logout()
      navigate({ to: '/login' })
    })
  }, [logout, navigate])

  const value = React.useMemo(
    () => ({
      token,
      user,
      tenants,
      tenant,
      login,
      logout,
      switchTenant,
      refreshTenants,
      createTenant,
    }),
    [
      token,
      user,
      tenants,
      tenant,
      login,
      logout,
      switchTenant,
      refreshTenants,
      createTenant,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}