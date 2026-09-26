import { Eye, EyeOff } from 'lucide-react'
import { DropdownMenuItem } from './ui/dropdown-menu'
import { usePrivacy } from '../lib/privacy'

export function PrivacyToggle({
  onSelect,
}: {
  onSelect?: () => void
}) {
  const { amountsHidden, toggleAmounts } = usePrivacy()

  return (
    <DropdownMenuItem
      onSelect={() => {
        toggleAmounts()
        onSelect?.()
      }}
    >
      {amountsHidden ? (
        <Eye className="size-4" aria-hidden />
      ) : (
        <EyeOff className="size-4" aria-hidden />
      )}
      {amountsHidden ? 'Show amounts' : 'Hide amounts'}
    </DropdownMenuItem>
  )
}
