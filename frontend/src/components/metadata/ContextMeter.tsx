import { Meter, Tooltip } from '@heroui/react'
import { formatTokens, contextColor } from '../../utils'

interface ContextMeterProps {
  contextTokens: number
  maxContextTokens: number
}

export function ContextMeter({ contextTokens, maxContextTokens }: ContextMeterProps) {
  const pct = maxContextTokens > 0
    ? Math.round((contextTokens / maxContextTokens) * 100)
    : 0

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div className="cursor-default min-w-[100px] max-w-[140px]">
          <Meter
            value={pct}
            minValue={0}
            maxValue={100}
            color={contextColor(contextTokens, maxContextTokens)}
            className="w-full"
          >
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-sm font-mono text-[var(--text-secondary)]">
                {formatTokens(contextTokens)} / {formatTokens(maxContextTokens)}
              </span>
              {maxContextTokens > 0 && (
                <Meter.Output className="text-sm font-mono text-[var(--text-secondary)] opacity-70" />
              )}
            </div>
            <Meter.Track className="h-1 bg-white/10 rounded-full">
              <Meter.Fill className="rounded-full" />
            </Meter.Track>
          </Meter>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Tooltip.Arrow />
        Context: {formatTokens(contextTokens)} / {formatTokens(maxContextTokens)} ({pct}%)
      </Tooltip.Content>
    </Tooltip>
  )
}
