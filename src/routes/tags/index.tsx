import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { RequireAuth } from '../../components/RequireAuth'
import { Pagination } from '../../components/Pagination'
import { ConfirmDialog } from '../../components/ConfirmDialog'
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableHeader,
  TableRow,
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
  const [confirmTag, setConfirmTag] = React.useState<Tag | null>(null)
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
      throw err
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

  const handleDelete = async (tag: Tag) => {
    setError(null)
    try {
      await api.deleteTag(tag.id)
      setEditing(null)
      await reload()
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return (
    <RequireAuth>
      <PageHeader title="Tags" subtitle="Tag definitions" />

      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}
      {loadError != null && <div className="mb-4"><ErrorBox error={loadError} /></div>}

      <Card className="mb-4 p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
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
                onValueChange={(value) => setType(value as TagType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
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
              <p className="p-6 text-sm text-muted-foreground">No tags yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Name</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((tag) => (
                    <TableRow
                      key={tag.id}
                      className={editing?.id === tag.id ? '' : 'cursor-pointer'}
                      onClick={(e) => {
                        if (editing?.id === tag.id) return
                        const target = e.target as HTMLElement
                        if (target.closest('a, button, input, select')) return
                        startEdit(tag)
                      }}
                    >
                      {editing?.id === tag.id ? (
                        <>
                          <Td>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </Td>
                          <Td>
                            <Select
                              value={editType}
                              onValueChange={(value) =>
                                setEditType(value as TagType)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TAG_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Td>
                          <Td className="text-right">
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
                          </Td>
                        </>
                      ) : (
                        <>
                          <Td>{tag.name}</Td>
                          <Td><Badge value={tag.type} /></Td>
                          <Td className="text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                className="text-sm text-primary hover:underline"
                                onClick={() => startEdit(tag)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-sm text-destructive hover:underline"
                                onClick={() => setConfirmTag(tag)}
                              >
                                Delete
                              </button>
                            </div>
                          </Td>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="border-t border-border px-4 py-3">
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

      <ConfirmDialog
        open={confirmTag !== null}
        onOpenChange={(open) => !open && setConfirmTag(null)}
        title="Delete tag"
        description={
          confirmTag ? `Delete tag "${confirmTag.name}"? This action cannot be undone.` : ''
        }
        confirmLabel="Delete"
        onConfirm={() => confirmTag && handleDelete(confirmTag)}
      />
    </RequireAuth>
  )
}