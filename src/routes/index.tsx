import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { useAuth } from '../lib/auth'
import { Button, Card, LoadingBox, ErrorBox } from '../components/ui'

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
  const { token, user, tenant, tenants, switchTenant } = useAuth()

  const shouldFetch = !!token && !!tenant
  const accounts = useFetch(
    () => (shouldFetch ? api.listAccounts({ per_page: 1 }) : Promise.resolve({ data: [], current_page: 1, last_page: 1, total: 0 })),
    [shouldFetch],
  )
  const journals = useFetch(
    () => (shouldFetch ? api.listJournals({ per_page: 1 }) : Promise.resolve({ data: [], current_page: 1, last_page: 1, total: 0 })),
    [shouldFetch],
  )
  const tags = useFetch(
    () => (shouldFetch ? api.listTags({ per_page: 1 }) : Promise.resolve({ data: [], current_page: 1, last_page: 1, total: 0 })),
    [shouldFetch],
  )
  const budgets = useFetch(
    () => (shouldFetch ? api.listBudgets({ per_page: 1 }) : Promise.resolve({ data: [], current_page: 1, last_page: 1, total: 0 })),
    [shouldFetch],
  )

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
        {tenants.length > 0 ? (
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
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No organizations found. Create one from the sidebar or re-login to
            sync.
          </p>
        )}
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of the ledger.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Accounts"
          value={accounts.data?.total}
          to="/accounts"
        />
        <StatCard
          label="Journals"
          value={journals.data?.total}
          to="/journals"
        />
        <StatCard label="Budgets" value={budgets.data?.total} to="/budgets" />
        <StatCard label="Tags" value={tags.data?.total} to="/tags" />
      </div>

      {accounts.error != null && (
        <div className="mt-6">
          <ErrorBox error={accounts.error} />
        </div>
      )}
      {(accounts.loading ||
        journals.loading ||
        budgets.loading ||
        tags.loading) && (
        <Card className="mt-6 p-4">
          <LoadingBox label="Loading overview…" />
        </Card>
      )}
    </div>
  )
}

function HomeComponent() {
  return <Dashboard />
}