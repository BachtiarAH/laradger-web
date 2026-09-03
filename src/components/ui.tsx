import * as React from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { ApiError } from '../lib/api'
import { cn } from '../lib/utils'
import { Button as ShadcnButton } from './ui/button'
import { Input as ShadcnInput } from './ui/input'
import { Label as ShadcnLabel } from './ui/label'
import { Badge as ShadcnBadge } from './ui/badge'
import { Skeleton as ShadcnSkeleton } from './ui/skeleton'
import {
  Table as ShadcnTable,
  TableHead,
  TableCell,
} from './ui/table'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success'

const buttonVariantMap: Record<
  ButtonVariant,
  React.ComponentProps<typeof ShadcnButton>['variant']
> = {
  primary: 'default',
  secondary: 'outline',
  danger: 'destructive',
  success: 'default',
}

export function Button({
  variant = 'primary',
  className = '',
  loading = false,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  loading?: boolean
}) {
  return (
    <ShadcnButton
      {...props}
      variant={buttonVariantMap[variant]}
      className={cn(
        variant === 'success' &&
          'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400',
        className,
      )}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </ShadcnButton>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <Loader2
      className={cn('animate-spin', className)}
      aria-hidden
    />
  )
}

export const Input = ShadcnInput
export const Label = ShadcnLabel

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './ui/select'

export function Field({
  label,
  children,
  error,
  htmlFor,
}: {
  label: string
  children: React.ReactNode
  error?: string
  htmlFor?: string
}) {
  return (
    <div>
      <div className="mb-1">
        <Label htmlFor={htmlFor}>{label}</Label>
      </div>
      {children}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  if (error instanceof ApiError) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{error.message}</AlertTitle>
        {error.errors && Object.keys(error.errors).length > 0 && (
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-5">
              {Object.entries(error.errors).flatMap(([field, messages]) =>
                messages.map((msg) => (
                  <li key={`${field}:${msg}`}>
                    <span className="font-medium">{field}:</span> {msg}
                  </li>
                )),
              )}
            </ul>
          </AlertDescription>
        )}
      </Alert>
    )
  }
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertDescription>{String(error)}</AlertDescription>
    </Alert>
  )
}

export function LoadingBox({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="animate-spin" aria-hidden /> {label}
    </div>
  )
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

const badgeColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  posted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  archived: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  terminated: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
  admin: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200',
  inactive: 'bg-muted text-muted-foreground',
  manual: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  imported: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
  system: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200',
  asset: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200',
  liability: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
  equity: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200',
  income: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  expense: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
  priority: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
  recurring: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  vendor: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  tax: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
  transfer: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200',
}

export function Badge({ value }: { value: string }) {
  const color =
    badgeColors[value] ?? 'bg-muted text-muted-foreground'
  return <ShadcnBadge className={color}>{value}</ShadcnBadge>
}

export function Table({ children }: { children: React.ReactNode }) {
  return <ShadcnTable>{children}</ShadcnTable>
}

export function Th({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <TableHead
      className={cn(
        'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
        className,
      )}
    >
      {children}
    </TableHead>
  )
}

export function Td({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <TableCell
      className={cn('px-4 py-3 text-foreground', className)}
    >
      {children}
    </TableCell>
  )
}

export { TableBody, TableHeader, TableRow } from './ui/table'
export { Skeleton } from './ui/skeleton'

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
