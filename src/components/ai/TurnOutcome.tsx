import { Ban, CircleHelp, ShieldCheck } from 'lucide-react'
import type { AiTurnOutcomeKind } from '../../lib/types'
import { cn } from '../../lib/utils'

/**
 * A turn that deliberately proposed nothing.
 *
 * The distinction this draws is the whole point: "I checked and it is already
 * recorded" is a decision the user should trust, "there was nothing to record" is
 * an answer, and "I could not proceed" is the only one that needs them. Rendering
 * all three as an empty result is what made a correct turn look like a failure and
 * sent the user off to ask the assistant about its own answer.
 *
 * `reference` is rendered as the headline when present, because the actionable
 * part of "we did not double-book this" is *which* entry already holds it.
 */
const META: Record<
  AiTurnOutcomeKind,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  already_recorded: {
    label: 'Sudah tercatat',
    icon: <ShieldCheck className="size-4" aria-hidden />,
    tone: 'text-emerald-700 dark:text-emerald-300',
  },
  nothing_to_record: {
    label: 'Tidak ada yang perlu dicatat',
    icon: <Ban className="size-4" aria-hidden />,
    tone: 'text-muted-foreground',
  },
  needs_attention: {
    label: 'Perlu keputusanmu',
    icon: <CircleHelp className="size-4" aria-hidden />,
    tone: 'text-amber-700 dark:text-amber-300',
  },
}

export function TurnOutcome({
  outcome,
  reason,
  reference,
  className,
}: {
  outcome: AiTurnOutcomeKind
  reason: string | null
  reference?: string | null
  className?: string
}) {
  const meta = META[outcome]

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/40 px-3 py-2.5',
        className,
      )}
    >
      <p className={cn('flex items-center gap-1.5 text-xs font-semibold', meta.tone)}>
        {meta.icon}
        {meta.label}
        {reference && (
          <>
            <span className="font-normal text-muted-foreground">·</span>
            <span className="font-mono text-[11px] font-normal text-foreground">
              {reference}
            </span>
          </>
        )}
      </p>
      {reason && (
        <p className="mt-1 text-xs text-foreground">{reason}</p>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Tidak ada draft baru yang dibuat, dan tidak ada yang berubah di pembukuan.
      </p>
    </div>
  )
}
