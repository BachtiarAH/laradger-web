import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button, Card, ErrorBox, Field, Input } from '../components/ui'

export const Route = createFileRoute('/register')({
  component: RegisterComponent,
})

function RegisterComponent() {
  const navigate = useNavigate()
  const { login, token } = useAuth()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [passwordConfirmation, setPasswordConfirmation] = React.useState('')
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
      const result = await api.register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
      login(result.token, result.user, {
        tenants: result.user.tenants,
        tenant: result.tenant,
      })
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
        <h1 className="text-xl font-bold text-foreground">
          Create an account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register to get a token for the Ledgify API.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Name" htmlFor="name">
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm password" htmlFor="password_confirmation">
            <Input
              id="password_confirmation"
              type="password"
              required
              minLength={8}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
            />
          </Field>
          {error != null && <ErrorBox error={error} />}
          <Button type="submit" className="w-full" loading={loading}>
            Register
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  )
}