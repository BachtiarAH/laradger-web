import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui'

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
  if (total <= 0) return null

  const canPrev = page > 1
  const canNext = page < lastPage

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">
        Page {page} of {lastPage} · {total} items
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Prev
        </Button>
        <Button
          type="button"
          variant={canNext ? 'primary' : 'secondary'}
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}