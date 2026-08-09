import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button, Card, ErrorBox, Field, Input, Label } from '../components/ui'

export const Route = createFileRoute('/login')({
  component: LoginComponent,
})

function LoginComponent() {
  const navigate = useNavigate()
  const { login, token } = useAuth()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [deviceName, setDeviceName] = React.useState('Ledgify Web')
  const [error, setError] = React.useState<unknown>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (token) navigate({ to: '/' })
  }, [token, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await api.login({ email, password, device_name: deviceName })
      login(result.token, result.user)
      navigate({ to: '/' })
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-md">
      <Card className="p-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Log in
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter your credentials to access the ledger.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Device name" htmlFor="device_name">
            <Input
              id="device_name"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
            />
          </Field>
          {error != null && <ErrorBox error={error} />}
          <Button type="submit" className="w-full" loading={loading}>
            Log in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No account yet?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            Register
          </Link>
        </p>
      </Card>
    </div>
  )
}
