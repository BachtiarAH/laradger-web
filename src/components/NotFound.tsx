import { FileQuestion } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button, Card } from './ui'

type NotFoundProps = {
  title?: string
  description?: string
  backTo?: string
  backLabel?: string
}

export function NotFound({
  title = 'Not found',
  description = "The requested resource could not be found. It may have been deleted or you don't have access to it.",
  backTo,
  backLabel = 'Back',
}: NotFoundProps) {
  return (
    <div className="mx-auto max-w-lg py-12">
      <Card className="p-8 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileQuestion className="size-5" aria-hidden />
        </div>
        <h1 className="mt-3 text-lg font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {backTo && (
          <Link to={backTo} className="mt-4 inline-block">
            <Button variant="secondary">{backLabel}</Button>
          </Link>
        )}
      </Card>
    </div>
  )
}
