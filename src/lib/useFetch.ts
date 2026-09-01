import * as React from 'react'

export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
) {
  const [data, setData] = React.useState<T | null>(null)
  const [error, setError] = React.useState<unknown>(null)
  const [loading, setLoading] = React.useState(true)
  const [version, setVersion] = React.useState(0)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    Promise.resolve()
      .then(() => fetcher())
      .then((result) => {
        if (active) {
          setData(result)
          setError(null)
        }
      })
      .catch((err) => {
        if (active) setError(err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = React.useCallback(() => setVersion((v) => v + 1), [])

  return { data, error, loading, reload }
}
