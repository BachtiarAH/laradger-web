import * as React from 'react'
import { api } from './api'
import { useAuth } from './auth'

/**
 * How many AI drafts are waiting for a decision.
 *
 * The nudge belongs on the link that leads to them, not on the assistant's
 * floating button: the drafts page is the only place every pending draft is
 * listed, including the ones the queued path produced, so a count anywhere else
 * is a promise the screen behind it cannot keep.
 *
 * Shared rather than owned by the sidebar, because approving a draft happens on
 * the drafts page. Held in the sidebar, the badge could only catch up on its own
 * timer, which is indistinguishable from the number being simply wrong until you
 * reload the page.
 */
type PendingDrafts = { count: number; refresh: () => void }

const PendingDraftsContext = React.createContext<PendingDrafts>({
  count: 0,
  refresh: () => {},
})

export function usePendingDrafts(): PendingDrafts {
  return React.useContext(PendingDraftsContext)
}

/** A nudge, not a live counter. Approving a draft calls refresh() itself. */
const REFRESH_INTERVAL_MS = 60000

export function PendingDraftsProvider({ children }: { children: React.ReactNode }) {
  const { token, user, tenants } = useAuth()
  const ready = Boolean(token) && ((user?.tenants?.length ?? 0) > 0 || tenants.length > 0)
  const [count, setCount] = React.useState(0)

  const refresh = React.useCallback(() => {
    if (!ready) return
    api
      .listAiDrafts('pending')
      .then((all) => setCount(all.length))
      // Supplementary: a failure here must not disturb the navigation.
      .catch(() => undefined)
  }, [ready])

  React.useEffect(() => {
    if (!ready) return
    refresh()
    // Every page load would otherwise cost a request. This only has to catch
    // drafts settled somewhere other than the drafts page.
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [ready, refresh])

  const value = React.useMemo(() => ({ count, refresh }), [count, refresh])

  return (
    <PendingDraftsContext.Provider value={value}>
      {children}
    </PendingDraftsContext.Provider>
  )
}
