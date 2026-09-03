import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { MoreHorizontal, ShieldAlert, UserPlus } from 'lucide-react'
import { api } from '../../../lib/api'
import { useFetch } from '../../../lib/useFetch'
import { useDebounce } from '../../../hooks/useDebounce'
import { useAuth } from '../../../lib/auth'
import { RequireAuth } from '../../../components/RequireAuth'
import { Pagination } from '../../../components/Pagination'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { AdminUserFormDialog } from '../../../components/AdminUserFormDialog'
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
  formatDate,
} from '../../../components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import { Button as UiButton } from '../../../components/ui/button'
import type { Paginated, User, UserAdminStore, UserStatus } from '../../../lib/types'

const EMPTY_PAGE: Paginated<User> = {
  data: [],
  current_page: 1,
  last_page: 1,
  total: 0,
}

export const Route = createFileRoute('/admin/users/')({
  component: AdminUsersPage,
})

const USER_STATUSES: UserStatus[] = ['active', 'suspended', 'terminated']

function AdminOnlyNotice() {
  const { logout } = useAuth()

  return (
    <Card className="mx-auto max-w-lg p-6">
      <div className="flex items-center gap-2 text-destructive">
        <ShieldAlert className="size-5" aria-hidden />
        <h1 className="text-lg font-bold text-foreground">Admin access only</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Your account does not have platform admin access. Ask a platform admin
        to grant it if you need to manage users.
      </p>
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" onClick={logout}>
          Sign out
        </Button>
      </div>
    </Card>
  )
}

function AdminUsersPage() {
  const { user } = useAuth()
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [status, setStatus] = React.useState<UserStatus | ''>('')
  const [dialogUser, setDialogUser] = React.useState<User | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [terminateUser, setTerminateUser] = React.useState<User | null>(null)
  const [actionError, setActionError] = React.useState<unknown>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const isAllowed = !!user?.is_admin

  const { data, error, loading, reload } = useFetch(
    () =>
      isAllowed
        ? api.listAdminUsers({
            page,
            per_page: 15,
            search: debouncedSearch || undefined,
            status: status || undefined,
          })
        : Promise.resolve(EMPTY_PAGE),
    [page, debouncedSearch, status, isAllowed],
  )

  const runUpdate = async (
    id: string,
    payload: Partial<UserAdminStore>,
  ) => {
    setActionError(null)
    setBusyId(id)
    try {
      await api.updateAdminUser(id, payload)
      await reload()
    } catch (err) {
      setActionError(err)
      throw err
    } finally {
      setBusyId(null)
    }
  }

  const openEdit = (target: User) => {
    setDialogUser(target)
    setDialogOpen(true)
  }

  const handleSaved = () => {
    setDialogOpen(false)
    setDialogUser(null)
    reload()
  }

  if (!isAllowed) {
    return (
      <RequireAuth>
        <AdminOnlyNotice />
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <PageHeader
        title="Users"
        subtitle="Manage all platform accounts"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" aria-hidden />
            Add user
          </Button>
        }
      />

      {actionError != null && <div className="mb-4"><ErrorBox error={actionError} /></div>}
      {error != null && <div className="mb-4"><ErrorBox error={error} /></div>}

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Search name or email">
            <Input
              placeholder="Search users…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </Field>
          <Field label="Status">
            <Select
              value={status || undefined}
              onValueChange={(value) => {
                setStatus(value as UserStatus)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {USER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setSearch('')
                setStatus('')
                setPage(1)
              }}
            >
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        {loading && !data && <LoadingBox label="Loading users…" />}
        {data && (
          <>
            {data.data.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No users found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th className="text-right">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((target) => (
                    <TableRow key={target.id}>
                      <Td className="font-medium">{target.name}</Td>
                      <Td className="text-muted-foreground">{target.email}</Td>
                      <Td>
                        {target.is_admin ? (
                          <Badge value="admin" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </Td>
                      <Td><Badge value={target.status ?? 'active'} /></Td>
                      <Td className="text-muted-foreground">{formatDate(target.created_at)}</Td>
                      <Td className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <UiButton
                              variant="ghost"
                              size="icon"
                              aria-label={`Manage ${target.name}`}
                              disabled={busyId === target.id}
                            >
                              <MoreHorizontal className="size-4" aria-hidden />
                            </UiButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => openEdit(target)}>
                              Edit details
                            </DropdownMenuItem>
                            {(target.status === 'active' ||
                              target.status === 'suspended') && (
                              <>
                                <DropdownMenuSeparator />
                                {target.status === 'active' && (
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      runUpdate(target.id, {
                                        status: 'suspended',
                                      })
                                    }
                                  >
                                    Suspend account
                                  </DropdownMenuItem>
                                )}
                                {target.status === 'suspended' && (
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      runUpdate(target.id, {
                                        status: 'active',
                                      })
                                    }
                                  >
                                    Activate account
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => setTerminateUser(target)}
                                >
                                  Terminate account
                                </DropdownMenuItem>
                              </>
                            )}
                            {target.status === 'terminated' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onSelect={() =>
                                    runUpdate(target.id, {
                                      status: 'active',
                                    })
                                  }
                                >
                                  Restore account
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Td>
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

      <AdminUserFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        user={null}
        onSaved={handleSaved}
      />

      <AdminUserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={dialogUser}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={terminateUser !== null}
        onOpenChange={(open) => !open && setTerminateUser(null)}
        title="Terminate account"
        description={
          terminateUser
            ? `Terminate "${terminateUser.name}" (${terminateUser.email})? They will be signed out and blocked from logging in. You can restore the account later.`
            : ''
        }
        confirmLabel="Terminate"
        onConfirm={() =>
          terminateUser
            ? runUpdate(terminateUser.id, { status: 'terminated' })
            : null
        }
      />
    </RequireAuth>
  )
}
