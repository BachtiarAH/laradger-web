import { globalVariableArraySchema, type GlobalVariable } from './dashboardSchema'
import { getTenant } from './api'

function globalVarKey(): string {
  const tenant = getTenant()
  const slug = tenant?.slug ?? 'no-tenant'
  try {
    const userRaw = localStorage.getItem('ledgify.user')
    const user = userRaw ? JSON.parse(userRaw) as { id: string } : null
    if (user?.id) return `ledgify.globalVars.${slug}.${user.id}`
  } catch { /* ignore */ }
  return `ledgify.globalVars.${slug}`
}

export function loadGlobalVariables(): GlobalVariable[] {
  try {
    const raw = localStorage.getItem(globalVarKey())
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const res = globalVariableArraySchema.safeParse(parsed)
    if (res.success) return res.data
    return []
  } catch {
    return []
  }
}

export function saveGlobalVariables(vars: GlobalVariable[]): void {
  try {
    const validated = globalVariableArraySchema.parse(vars)
    localStorage.setItem(globalVarKey(), JSON.stringify(validated))
  } catch { /* ignore */ }
}

export function globalVarMap(): Map<string, number> {
  const map = new Map<string, number>()
  for (const gv of loadGlobalVariables()) map.set(gv.name, gv.value)
  return map
}
