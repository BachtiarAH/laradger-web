import * as React from 'react'
import { ApiError } from '../lib/api'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success'

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600',
  secondary:
    'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
}

export function Button({
  variant = 'primary',
  className = '',
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  loading?: boolean
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {props.children}
    </button>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`block w-full rounded-md border-0 px-3 py-1.5 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 ${props.className ?? ''}`}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`block w-full rounded-md border-0 px-3 py-1.5 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 ${props.className ?? ''}`}
    />
  )
}

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
    >
      {children}
    </label>
  )
}

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
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  if (error instanceof ApiError) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        <p className="font-semibold">{error.message}</p>
        {error.errors && Object.keys(error.errors).length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {Object.entries(error.errors).flatMap(([field, messages]) =>
              messages.map((msg) => (
                <li key={`${field}:${msg}`}>
                  <span className="font-medium">{field}:</span> {msg}
                </li>
              )),
            )}
          </ul>
        )}
      </div>
    )
  }
  return (
    <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      {String(error)}
    </div>
  )
}

export function LoadingBox({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
      <Spinner /> {label}
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
      className={`rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

const badgeColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
  posted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  archived: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
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

export function Badge({
  value,
}: {
  value: string
}) {
  const color = badgeColors[value] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {value}
    </span>
  )
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
        {children}
      </table>
    </div>
  )
}

export function Th({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${className}`}
    >
      {children}
    </th>
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
    <td
      className={`whitespace-nowrap px-4 py-3 text-gray-900 dark:text-gray-100 ${className}`}
    >
      {children}
    </td>
  )
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
