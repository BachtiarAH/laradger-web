import * as React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { BASE_URL } from '../lib/api'
import { Button, Card } from './ui'

export function ConnectionDown() {
  return (
    <div className="mx-auto max-w-lg py-12">
      <Card className="p-6 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-5" aria-hidden />
        </div>
        <h1 className="mt-3 text-lg font-bold text-foreground">
          Can't reach the server
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ledgify couldn't connect to the API server. Check that the backend is
          running and try again.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          <code>{BASE_URL}</code>
        </p>
        <Button
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="size-4" aria-hidden />
          Retry
        </Button>
      </Card>
    </div>
  )
}