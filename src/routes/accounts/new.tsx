import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { AccountForm } from '../../components/AccountForm'
import { RequireAuth } from '../../components/RequireAuth'
import { Card, PageHeader } from '../../components/ui'

export const Route = createFileRoute('/accounts/new')({
  component: NewAccountPage,
})

function NewAccountPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = React.useState(false)

  const handleSubmit = async (payload: Parameters<typeof api.createAccount>[0]) => {
    setSaving(true)
    try {
      const result = await api.createAccount(payload)
      navigate({ to: '/accounts/$accountId', params: { accountId: result.data.id } })
    } finally {
      setSaving(false)
    }
  }

  return (
    <RequireAuth>
      <PageHeader title="New account" subtitle="Add a chart of accounts entry" />
      <Card className="p-6">
        <AccountForm onSubmit={handleSubmit} submitLabel="Create account" loading={saving} />
      </Card>
    </RequireAuth>
  )
}
