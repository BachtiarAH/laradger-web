import { Navigate } from '@tanstack/react-router'
import * as React from 'react'
import { useAuth } from '../lib/auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" />
  return <>{children}</>
}
