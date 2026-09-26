import * as React from 'react'
import { usePrivacy } from './privacy'

/** Rendered in place of a real amount while privacy mode is on. */
export const AMOUNT_MASK = '•••••'

const EMPTY = '—'

/**
 * Format an amount as Indonesian Rupiah, e.g. `Rp 1.500.000`.
 */
export function formatIDR(value: string | number | null | undefined): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return EMPTY
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num)
}

/**
 * Format an amount in compact notation, e.g. `Rp 1,5 jt`.
 */
export function formatCompactIDR(value: string | number | null | undefined): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return EMPTY
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num)
}

type Money = {
  /** True while privacy mode is hiding real values. */
  hidden: boolean
  idr: (value: string | number | null | undefined) => string
  compactIdr: (value: string | number | null | undefined) => string
}

/**
 * Money formatters that respect privacy mode. Every currency amount rendered on
 * the dashboard should go through these so a single toggle masks the whole page
 * — including values embedded in labels and inside tooltips.
 */
export function useMoney(): Money {
  const { amountsHidden } = usePrivacy()

  return React.useMemo(
    () => ({
      hidden: amountsHidden,
      idr: (value) => (amountsHidden ? AMOUNT_MASK : formatIDR(value)),
      compactIdr: (value) => (amountsHidden ? AMOUNT_MASK : formatCompactIDR(value)),
    }),
    [amountsHidden],
  )
}
