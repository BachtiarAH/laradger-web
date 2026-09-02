import * as React from 'react'
import { getTenant } from '../lib/api'
import { loadGlobalVariables, saveGlobalVariables } from '../lib/globalVariables'
import type { GlobalVariable } from '../lib/dashboardSchema'

export function useGlobalVariables() {
  const tenantSlug = getTenant()?.slug
  const [globals, setGlobals] = React.useState<GlobalVariable[]>(() => loadGlobalVariables())

  React.useEffect(() => {
    setGlobals(loadGlobalVariables())
  }, [tenantSlug])

  const persist = React.useCallback((next: GlobalVariable[]) => {
    setGlobals(next)
    saveGlobalVariables(next)
  }, [])

  const upsert = React.useCallback((gv: GlobalVariable) => {
    const idx = globals.findIndex((g) => g.name === gv.name)
    if (idx >= 0) {
      const next = [...globals]
      next[idx] = gv
      persist(next)
    } else {
      persist([...globals, gv])
    }
  }, [globals, persist])

  const remove = React.useCallback((name: string) => {
    persist(globals.filter((g) => g.name !== name))
  }, [globals, persist])

  return { globals, upsert, remove, setGlobals: persist }
}
