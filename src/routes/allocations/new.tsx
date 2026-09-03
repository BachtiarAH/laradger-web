import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { AllocationForm } from '../../components/AllocationForm'
import { RequireAuth } from '../../components/RequireAuth'
import { Card, PageHeader } from '../../components/ui'

export const Route = createFileRoute('/allocations/new')({
  component: NewAllocationPage,
})

function NewAllocationPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = React.useState(false)

  const handleSubmit = async (payload: Parameters<typeof api.createAllocation>[0]) => {
    setSaving(true)
    try {
      const result = await api.createAllocation(payload)
      navigate({ to: '/allocations/$allocationId', params: { allocationId: result.data.id } })
    } finally {
      setSaving(false)
    }
  }

  return (
    <RequireAuth>
      <PageHeader
        title="New allocation"
        subtitle="Define a purpose, then allocate money from asset accounts on its detail page"
      />
      <Card className="p-6">
        <AllocationForm
          onSubmit={handleSubmit}
          submitLabel="Create allocation"
          loading={saving}
        />
      </Card>
    </RequireAuth>
  )
}
