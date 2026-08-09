export function Pagination({
  page,
  lastPage,
  total,
  onPageChange,
}: {
  page: number
  lastPage: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (lastPage <= 1) return null

  const pages: number[] = []
  const start = Math.max(1, Math.min(page - 2, lastPage - 4))
  const end = Math.min(lastPage, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)

  const linkClass =
    'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium'
  const activeClass = 'bg-indigo-600 text-white'
  const inactiveClass =
    'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
  const disabledClass = 'cursor-not-allowed text-gray-400'

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">
        {total} total
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={`${linkClass} ${page <= 1 ? disabledClass : inactiveClass}`}
        >
          ‹
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`${linkClass} ${p === page ? activeClass : inactiveClass}`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          className={`${linkClass} ${page >= lastPage ? disabledClass : inactiveClass}`}
        >
          ›
        </button>
      </div>
    </div>
  )
}
