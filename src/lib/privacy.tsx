import * as React from 'react'

const STORAGE_KEY = 'ledgify.hide-amounts'

type PrivacyContextValue = {
  /** When true, currency amounts render as a mask instead of their real value. */
  amountsHidden: boolean
  setAmountsHidden: (hidden: boolean) => void
  toggleAmounts: () => void
}

const PrivacyContext = React.createContext<PrivacyContextValue | null>(null)

function readStoredFlag(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // Ignore storage errors (private mode, disabled storage) — default to visible.
    return false
  }
}

/**
 * Privacy mode for the dashboard: hides currency amounts so the screen is safe
 * to show in public. The flag is a local, per-browser preference — like the
 * theme and widget layout, it is never sent to the server.
 */
export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [amountsHidden, setAmountsHidden] = React.useState(readStoredFlag)

  React.useEffect(() => {
    try {
      if (amountsHidden) {
        localStorage.setItem(STORAGE_KEY, '1')
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Ignore storage errors — the toggle still works for this session.
    }
  }, [amountsHidden])

  const setAmountsHiddenAndStore = React.useCallback((hidden: boolean) => {
    setAmountsHidden(hidden)
  }, [])

  const toggleAmounts = React.useCallback(() => {
    setAmountsHidden((current) => !current)
  }, [])

  const value = React.useMemo(
    () => ({
      amountsHidden,
      setAmountsHidden: setAmountsHiddenAndStore,
      toggleAmounts,
    }),
    [amountsHidden, setAmountsHiddenAndStore, toggleAmounts],
  )

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
}

export function usePrivacy(): PrivacyContextValue {
  const context = React.useContext(PrivacyContext)

  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider.')
  }

  return context
}
