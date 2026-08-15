import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { BudgetForm } from '../../components/BudgetForm'
import { RequireAuth } from '../../components/RequireAuth'
import { Card, PageHeader } from '../../components/ui'

export const Route = createFileRoute('/budgets/new')({
  component: NewBudgetPage,
})

function NewBudgetPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = React.useState(false)

  const handleSubmit = async (payload: Parameters<typeof api.createBudget>[0]) => {
    setSaving(true)
    try {
      const result = await api.createBudget(payload)
      navigate({ to: '/budgets/$budgetId', params: { budgetId: result.data.id } })
    } finally {
      setSaving(false)
    }
  }

  return (
    <RequireAuth>
      <PageHeader title="New budget" subtitle="Set a spending budget with linked accounts and tags" />
      <Card className="p-6">
        <BudgetForm
          onSubmit={handleSubmit}
          submitLabel="Create budget"
          loading={saving}
        />
      </Card>
    </RequireAuth>
  )
}