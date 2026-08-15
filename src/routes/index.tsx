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
  const { token, user } = useAuth()

  const accounts = useFetch(() => api.listAccounts({ per_page: 1 }), [])
  const journals = useFetch(() => api.listJournals({ per_page: 1 }), [])
  const tags = useFetch(() => api.listTags({ per_page: 1 }), [])
  const budgets = useFetch(() => api.listBudgets({ per_page: 1 }), [])

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