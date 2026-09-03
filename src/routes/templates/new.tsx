import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { TemplateForm } from '../../components/TemplateForm'
import { RequireAuth } from '../../components/RequireAuth'
import { Card, PageHeader } from '../../components/ui'

export const Route = createFileRoute('/templates/new')({
  component: NewTemplatePage,
})

function NewTemplatePage() {
  const navigate = useNavigate()
  const [saving, setSaving] = React.useState(false)

  const handleSubmit = async (payload: Parameters<typeof api.createJournalTemplate>[0]) => {
    setSaving(true)
    try {
      const result = await api.createJournalTemplate(payload)
      navigate({ to: '/templates/$templateId', params: { templateId: result.data.id } })
    } finally {
      setSaving(false)
    }
  }

  return (
    <RequireAuth>
      <PageHeader
        title="New template"
        subtitle="Buat template jurnal berulang (harian/mingguan/bulanan)"
        actions={
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate({ to: '/templates' })}
          >
            Back
          </button>
        }
      />
      <Card className="p-6">
        <TemplateForm
          onSubmit={handleSubmit}
          submitLabel="Create template"
          loading={saving}
        />
      </Card>
    </RequireAuth>
  )
}
