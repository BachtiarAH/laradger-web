import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import { Pagination } from '../../components/Pagination'
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  LoadingBox,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from '../../components/ui'
import type { Tag, TagType } from '../../lib/types'

export const Route = createFileRoute('/tags/')({
  component: TagsPage,
})

const TAG_TYPES: TagType[] = ['priority', 'recurring', 'vendor', 'tax', 'transfer']

function TagsPage() {
  const [page, setPage] = React.useState(1)
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<TagType>('vendor')
  const [editing, setEditing] = React.useState<Tag | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editType, setEditType] = React.useState<TagType>('vendor')
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<unknown>(null)

  const { data, error: loadError, loading, reload } = useFetch(
    () => api.listTags({ page, per_page: 15 }),
    [page],
  )

  const runAction = async (
    id: string | null,
    action: () => Promise<unknown>,
  ) => {
    setError(null)
    setBusyId(id)
    try {
      await action()
      await reload()
    } catch (err) {
      setError(err)
    } finally {
      setBusyId(null)
    }
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    return runAction('__create__', async () => {
      await api.createTag({ name: name.trim(), type })
      setName('')
      setType('vendor')
    })
  }

  const startEdit = (tag: Tag) => {
    setEditing(tag)
    setEditName(tag.name)
    setEditType(tag.type)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing || !editName.trim()) return
    return runAction(editing.id, async () => {
      await api.updateTag(editing.id, { name: editName.trim(), type: editType })
      setEditing(null)
    })
  }

  const handleDelete = (tag: Tag) => {
    if (!window.confirm(`Delete tag "${tag.name}"?`)) return
    return runAction(tag.id, async () => {
      await api.deleteTag(tag.id)
      setEditing(null)
    })
  }

  return (
    <RequireAuth>
      <PageHeader title="Tags" subtitle="Tag definitions" />

      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}
      {loadError != null && <div className="mb-4"><ErrorBox error={loadError} /></div>}

      <Card className="mb-4 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Create tag
        </h2>
        <form onSubmit={handleCreate} className="flex max-w-lg items-end gap-3">
          <div className="flex-1">
            <Field label="Name">
              <Input
                value={name}
                required
                maxLength={255}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          </div>
          <div className="w-40">
            <Field label="Type">
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as TagType)}
              >
                {TAG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="submit" loading={busyId === '__create__'}>
            Create
          </Button>
        </form>
      </Card>

      <Card>
        {loading && <LoadingBox label="Loading tags…" />}
        {!loading && data && (
          <>
            {data.data.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No tags yet.</p>
            ) : (
              <Table>
                <thead className="border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <Th>Name</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data.data.map((tag) => (
                    <tr key={tag.id}>
                      {editing?.id === tag.id ? (
                        <>
                          <td className="px-4 py-3">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as TagType)}
                            >
                              {TAG_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="secondary"
                                className="!px-2 !py-1 text-xs"
                                onClick={() => setEditing(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="!px-2 !py-1 text-xs"
                                loading={busyId === tag.id}
                                onClick={handleSaveEdit}
                              >
                                Save
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <Td>{tag.name}</Td>
                          <Td><Badge value={tag.type} /></Td>
                          <Td className="text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                onClick={() => startEdit(tag)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={busyId === tag.id}
                                className="text-sm text-red-600 hover:text-red-500 disabled:opacity-50"
                                onClick={() => handleDelete(tag)}
                              >
                                Delete
                              </button>
                            </div>
                          </Td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              <Pagination
                page={data.current_page}
                lastPage={data.last_page}
                total={data.total}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>
    </RequireAuth>
  )
}
