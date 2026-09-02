import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'
import { useAuth } from '../lib/auth'
import { Button, Card } from '../components/ui'
import OverviewPage from './overview'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function StatCard({
  label,
  value,
  to,
}: {
  label: string
  value?: number
  to: string
}) {
  return (
    <Link
      to={to}
      className="block rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition hover:ring-primary"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold text-foreground">
        {value ?? '—'}
      </p>
    </Link>
  )
}

function Dashboard() {
  const { token, tenant } = useAuth()

  if (!token) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-4xl font-bold text-foreground">
          Ledgify
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A double-entry ledger client. Log in or register to manage the chart
          of accounts, journals, and audit logs.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/login">
            <Button>Login</Button>
          </Link>
          <Link to="/register">
            <Button variant="secondary">Register</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <Card className="mx-auto max-w-lg p-6">
        <h1 className="text-lg font-bold text-foreground">
          Select organization
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You are logged in but no organization is selected. This happens when
          you open Ledgify on a new domain (localStorage is per-origin) — e.g.
          switching from workers.dev to bachtiarah.my.id.
        </p>
      </Card>
    )
  }

  return <OverviewPage />
}

function HomeComponent() {
  return <Dashboard />
}