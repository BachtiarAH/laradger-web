import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { clearToken, getToken, onUnauthorized, setToken } from './api'
import type { User } from './types'

const USER_KEY = 'ledgify.user'

type AuthContextValue = {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [token, setAuthToken] = React.useState<string | null>(() => getToken())
  const [user, setUser] = React.useState<User | null>(() => readStoredUser())

  const login = React.useCallback((nextToken: string, nextUser: User) => {
    setToken(nextToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setAuthToken(nextToken)
    setUser(nextUser)
  }, [])

  const logout = React.useCallback(() => {
    clearToken()
    localStorage.removeItem(USER_KEY)
    setAuthToken(null)
    setUser(null)
  }, [])

  React.useEffect(() => {
    return onUnauthorized(() => {
      logout()
      navigate({ to: '/login' })
    })
  }, [logout, navigate])

  const value = React.useMemo(
    () => ({ token, user, login, logout }),
    [token, user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
