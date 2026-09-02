import * as React from 'react'
import { X } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import type { Tag, TagType } from '../lib/types'
import { Badge, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui'

const TAG_TYPES: TagType[] = ['priority', 'recurring', 'vendor', 'tax', 'transfer']

type TagInputProps = {
  tags: Tag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onTagCreated?: (tag: Tag) => void
  placeholder?: string
  disabled?: boolean
}

export function TagInput({ tags, selectedIds, onChange, onTagCreated, placeholder = 'Cari atau ketik tag baru…', disabled }: TagInputProps) {
  const [input, setInput] = React.useState('')
  const [type, setType] = React.useState<TagType>('vendor')
  const [creating, setCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = React.useState(false)

  const trimmed = input.trim()
  const normalized = trimmed.toLowerCase()

  const exact = React.useMemo(() => tags.find((t) => t.name.toLowerCase() === normalized), [tags, normalized])
  const isAlreadySelected = exact ? selectedIds.includes(exact.id) : false

  const suggestions = React.useMemo(() => {
    if (!normalized) return []
    return tags
      .filter((t) => !selectedIds.includes(t.id) && t.name.toLowerCase().includes(normalized))
      .slice(0, 6)
  }, [tags, selectedIds, normalized])

  const selectedTags = React.useMemo(() => tags.filter((t) => selectedIds.includes(t.id)), [tags, selectedIds])

  const addId = (id: string) => {
    if (selectedIds.includes(id)) return
    onChange([...selectedIds, id])
  }

  const removeId = (id: string) => {
    onChange(selectedIds.filter((v) => v !== id))
  }

  const handleSelectSuggestion = (tag: Tag) => {
    addId(tag.id)
    setInput('')
    setShowSuggestions(false)
    setError(null)
  }

  const handleCreate = async () => {
    if (!trimmed) return
    if (exact) {
      if (!isAlreadySelected) addId(exact.id)
      setInput('')
      setShowSuggestions(false)
      setError(null)
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = await api.createTag({ name: trimmed, type })
      const newTag = res.data
      onTagCreated?.(newTag)
      // also auto-select: parent may have merged via onTagCreated, but ensure selection
      onChange([...selectedIds, newTag.id])
      setInput('')
      setShowSuggestions(false)
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const msg = Object.values(err.errors).flat().join(', ')
        setError(msg || err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Gagal membuat tag.')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleCreate()
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className="space-y-2">
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-muted/50 px-3 py-1 text-sm"
            >
              {tag.name} <Badge value={tag.type} />
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${tag.name}`}
                  onClick={() => removeId(tag.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setShowSuggestions(true)
              setError(null)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || creating}
            maxLength={255}
          />
          {showSuggestions && trimmed && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-popover shadow-md">
              {suggestions.length > 0 ? (
                suggestions.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(tag)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span>{tag.name}</span>
                    <span className="ml-2"><Badge value={tag.type} /></span>
                  </button>
                ))
              ) : null}
              <div className="border-t border-border">
                {exact ? (
                  isAlreadySelected ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Tag &ldquo;{trimmed}&rdquo; sudah dipilih.</div>
                  ) : (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void handleCreate()}
                      className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-muted"
                    >
                      Pilih tag &ldquo;{trimmed}&rdquo;
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void handleCreate()}
                    className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-muted"
                  >
                    + Buat tag baru &ldquo;{trimmed}&rdquo; ({type})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <Select value={type} onValueChange={(v) => setType(v as TagType)}>
          <SelectTrigger className="w-[140px]" disabled={disabled}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAG_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="secondary" onClick={() => void handleCreate()} loading={creating} disabled={!trimmed || disabled}>
          Tambah
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Ketik untuk mencari tag, pilih dari saran, atau tekan Enter / Tambah untuk membuat tag baru.</p>
    </div>
  )
}
