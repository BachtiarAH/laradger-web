import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { GoalForm } from '../../components/GoalForm'
import { RequireAuth } from '../../components/RequireAuth'
import { Card, PageHeader } from '../../components/ui'

export const Route = createFileRoute('/goals/new')({
  component: NewGoalPage,
})

function NewGoalPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = React.useState(false)

  const handleSubmit = async (payload: Parameters<typeof api.createGoal>[0]) => {
    setSaving(true)
    try {
      const result = await api.createGoal(payload)
      navigate({ to: '/goals/$goalId', params: { goalId: result.data.id } })
    } finally {
      setSaving(false)
    }
  }

  return (
    <RequireAuth>
      <PageHeader
        title="New Financial Goal"
        subtitle="Set up a target savings goal with an optional recurring contribution plan"
      />
      <Card className="p-6">
        <GoalForm
          onSubmit={handleSubmit}
          submitLabel="Create Goal"
          loading={saving}
        />
      </Card>
    </RequireAuth>
  )
}
