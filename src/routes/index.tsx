import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { useAuth } from '../lib/auth'
import { Card, LoadingBox, ErrorBox } from '../components/ui'

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
      className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700"
    >
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
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

  if (!token) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Ledgify
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
          A double-entry ledger client. Log in or register to manage the chart
          of accounts, journals, and audit logs.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/login">
            <button
              type="button"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Login
            </button>
          </Link>
          <Link to="/register">
            <button
              type="button"
              className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
            >
              Register
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of the ledger.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <StatCard label="Tags" value={tags.data?.total} to="/tags" />
      </div>

      {accounts.error != null && (
        <div className="mt-6">
          <ErrorBox error={accounts.error} />
        </div>
      )}
      {(accounts.loading || journals.loading || tags.loading) && (
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
