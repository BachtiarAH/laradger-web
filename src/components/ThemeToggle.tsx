import { Moon, Sun } from 'lucide-react'
import { DropdownMenuItem } from './ui/dropdown-menu'
import { useTheme } from '../lib/useTheme'

export function ThemeToggle({
  onSelect,
}: {
  onSelect?: () => void
}) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <DropdownMenuItem onSelect={() => { toggle(); onSelect?.() }}>
      {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      {isDark ? 'Light mode' : 'Dark mode'}
    </DropdownMenuItem>
  )
}