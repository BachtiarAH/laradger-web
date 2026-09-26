import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { CheckCircle2, KeyRound, Sparkles, Trash2, XCircle } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import type {
  AiProviderName,
  AiSettings,
  AiSettingsStore,
} from '../../lib/types'
import { Button, Card, ErrorBox, Field, Input, PageHeader } from '../../components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'

export const Route = createFileRoute('/settings/ai')({
  component: AiSettingsPage,
})

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok'; message: string }
  | { status: 'failed'; message: string }

function fieldError(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError)) return undefined
  return error.errors?.[field]?.[0]
}

/** Ready-made base URLs for the common OpenAI-compatible servers. */
const COMPATIBLE_PRESETS: { label: string; base_uri: string; endpoint: string }[] = [
  { label: 'Ollama (lokal)', base_uri: 'http://localhost:11434', endpoint: '/v1/chat/completions' },
  { label: 'LM Studio (lokal)', base_uri: 'http://localhost:1234', endpoint: '/v1/chat/completions' },
  { label: 'OpenRouter', base_uri: 'https://openrouter.ai/api/v1', endpoint: '/chat/completions' },
  { label: 'Groq', base_uri: 'https://api.groq.com/openai/v1', endpoint: '/chat/completions' },
  {
    label: 'Google Gemini',
    base_uri: 'https://generativelanguage.googleapis.com/v1beta/openai',
    endpoint: '/chat/completions',
  },
]

const COMPATIBLE_PROVIDER: AiProviderName = 'openai_compatible'

function AiSettingsPage() {
  const [settings, setSettings] = React.useState<AiSettings | null>(null)
  const [provider, setProvider] = React.useState<AiProviderName>('openai')
  const [model, setModel] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [baseUri, setBaseUri] = React.useState('')
  const [endpoint, setEndpoint] = React.useState('')

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [clearing, setClearing] = React.useState(false)
  const [error, setError] = React.useState<unknown>(null)
  const [saved, setSaved] = React.useState(false)
  const [test, setTest] = React.useState<TestState>({ status: 'idle' })

  const hydrate = React.useCallback((data: AiSettings) => {
    setSettings(data)
    setProvider(data.provider)
    setModel(data.model ?? '')
    setBaseUri(data.base_uri ?? '')
    setEndpoint(data.endpoint ?? '')
    setApiKey('')
  }, [])

  React.useEffect(() => {
    let active = true

    api
      .getAiSettings()
      .then((data) => active && hydrate(data))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [hydrate])

  const isCompatible = provider === COMPATIBLE_PROVIDER
  const dirtyKey = apiKey.trim().length > 0
  const selected = settings?.providers.find((p) => p.name === provider)

  // Blank fields are omitted on purpose: the API treats that as "keep what is
  // stored" rather than "clear it".
  const buildPayload = (): AiSettingsStore => {
    const payload: AiSettingsStore = { provider, model: model.trim() || null }
    if (dirtyKey) payload.api_key = apiKey.trim()
    if (isCompatible) {
      if (baseUri.trim()) payload.base_uri = baseUri.trim()
      if (endpoint.trim()) payload.endpoint = endpoint.trim()
    }
    return payload
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    setTest({ status: 'idle' })

    try {
      hydrate(await api.updateAiSettings(buildPayload()))
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTest({ status: 'testing' })
    setError(null)

    try {
      const result = await api.testAiSettings(buildPayload())
      setTest({
        status: 'ok',
        message: `Connected to ${result.model ?? provider} in ${result.latency_ms} ms.`,
      })
    } catch (err) {
      setTest({
        status: 'failed',
        message:
          err instanceof ApiError
            ? (err.errors?.api_key?.[0] ?? err.errors?.base_uri?.[0] ?? err.message)
            : 'The connection test failed.',
      })
    }
  }

  const handleClear = async () => {
    setClearing(true)
    setError(null)
    setSaved(false)
    setTest({ status: 'idle' })

    try {
      hydrate(await api.clearAiSettings())
    } catch (err) {
      setError(err)
    } finally {
      setClearing(false)
    }
  }

  if (loading) {
    return (
      <PageHeader title="AI" subtitle="Mengatur provider dan API key." />
    )
  }

  const hasStoredKey = settings?.source === 'user' && settings.has_key

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI"
        subtitle="Simpan API key provider AI-mu di sini. Key dienkripsi di database dan tidak pernah dikembalikan lewat API."
      />

      {error != null && <ErrorBox error={error} />}

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Provider"
              htmlFor="ai-provider"
              error={fieldError(error, 'provider')}
            >
              <Select
                value={provider}
                onValueChange={(value) => {
                  setProvider(value as AiProviderName)
                  setTest({ status: 'idle' })
                }}
              >
                <SelectTrigger id="ai-provider">
                  <SelectValue placeholder="Pilih provider" />
                </SelectTrigger>
                <SelectContent>
                  {(settings?.providers ?? []).map((item) => (
                    <SelectItem key={item.name} value={item.name}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Model"
              htmlFor="ai-model"
              error={fieldError(error, 'model')}
            >
              <Input
                id="ai-model"
                value={model}
                placeholder={
                  selected?.default_model ??
                  (isCompatible ? 'llama3.1' : 'gpt-4o-mini')
                }
                onChange={(e) => {
                  setModel(e.target.value)
                  setTest({ status: 'idle' })
                }}
              />
            </Field>
          </div>

          {isCompatible && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Preset</p>
                <div className="flex flex-wrap gap-2">
                  {COMPATIBLE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setBaseUri(preset.base_uri)
                        setEndpoint(preset.endpoint)
                        setTest({ status: 'idle' })
                      }}
                      className="rounded-full border border-input px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Base URL"
                  htmlFor="ai-base-uri"
                  error={fieldError(error, 'base_uri')}
                >
                  <Input
                    id="ai-base-uri"
                    value={baseUri}
                    placeholder="http://localhost:11434"
                    spellCheck={false}
                    onChange={(e) => {
                      setBaseUri(e.target.value)
                      setTest({ status: 'idle' })
                    }}
                  />
                </Field>

                <Field
                  label="Endpoint"
                  htmlFor="ai-endpoint"
                  error={fieldError(error, 'endpoint')}
                >
                  <Input
                    id="ai-endpoint"
                    value={endpoint}
                    placeholder="/v1/chat/completions"
                    spellCheck={false}
                    onChange={(e) => {
                      setEndpoint(e.target.value)
                      setTest({ status: 'idle' })
                    }}
                  />
                </Field>
              </div>

              <p className="text-xs text-muted-foreground">
                Dua field ini dirangkai langsung, tanpa disisipkan otomatis.{' '}
                <span className="font-mono text-foreground">
                  {(baseUri.trim() || 'http://localhost:11434') +
                    (endpoint.trim() || '/v1/chat/completions')}
                </span>
              </p>
            </div>
          )}

          <Field
            label="API key"
            htmlFor="ai-key"
            error={fieldError(error, 'api_key')}
          >
            <Input
              id="ai-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              placeholder={
                hasStoredKey
                  ? `Key tersimpan (${settings?.key_hint}) — kosongkan untuk tidak mengubah`
                  : isCompatible
                    ? 'Ollama/vLLM lokal biasanya tidak butuh key, isi “ollama” kalau tetap wajib'
                    : 'sk-…'
              }
              onChange={(e) => {
                setApiKey(e.target.value)
                setTest({ status: 'idle' })
              }}
            />
          </Field>

          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />
            {hasStoredKey ? (
              <>
                Key milikmu tersimpan dan berakhiran{' '}
                <span className="font-mono">{settings?.key_hint}</span>. Biarkan
                kosong lalu Simpan kalau hanya mau ganti model.
              </>
            ) : settings?.source === 'environment' && settings.has_key ? (
              <>
                Belum ada key pribadi. Server sudah punya key untuk provider ini
                (dari environment), jadi AI tetap jalan. Isi di sini kalau mau
                memakai key sendiri.
              </>
            ) : (
              <>
                Tempel key provider untuk mengaktifkan AI. Bisa diuji dulu
                sebelum disimpan.
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={saving}>
              Simpan
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTest}
              loading={test.status === 'testing'}
            >
              <Sparkles className="size-4" aria-hidden />
              Test koneksi
            </Button>
            {hasStoredKey && (
              <Button
                type="button"
                variant="danger"
                onClick={handleClear}
                loading={clearing}
              >
                <Trash2 className="size-4" aria-hidden />
                Hapus key
              </Button>
            )}
          </div>

          {test.status === 'ok' && (
            <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              {test.message}
            </p>
          )}
          {test.status === 'failed' && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="size-4 shrink-0" aria-hidden />
              {test.message}
            </p>
          )}
          {saved && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Pengaturan AI disimpan.
            </p>
          )}
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-foreground">
          Provider terdaftar
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kalau provider gagal, gateway otomatis mencoba provider lain yang
          punya key.
        </p>
        <ul className="mt-4 space-y-2">
          {(settings?.providers ?? []).map((item) => (
            <li
              key={item.name}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <span className="text-sm font-medium">{item.label}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{item.default_model ?? '—'}</span>
                {item.name === COMPATIBLE_PROVIDER && (
                  <span className="font-mono">
                    {settings?.provider === COMPATIBLE_PROVIDER && settings.base_uri
                      ? settings.base_uri + settings.endpoint
                      : '—'}
                  </span>
                )}
                {item.configured ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
                    {item.source === 'user' ? 'key kamu' : 'server'}
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                    belum ada key
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
