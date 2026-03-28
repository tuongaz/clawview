import type { CommandDetail, ErrorDetail } from '../../types'

export interface Bucket {
  label: string
  commands: CommandDetail[]
}

interface BucketOptions {
  includeInterrupted?: boolean
}

function computeInterval(timestamps: string[]): { useHourly: boolean } {
  if (timestamps.length < 2) return { useHourly: true }
  const startTime = new Date(timestamps[0]).getTime()
  const endTime = new Date(timestamps[timestamps.length - 1]).getTime()
  const totalDays = (endTime - startTime) / (24 * 60 * 60 * 1000)
  return { useHourly: totalDays < 10 }
}

function getBucketKey(ts: string, useHourly: boolean): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  if (useHourly) {
    const h = String(Math.floor(d.getHours() / 4) * 4).padStart(2, '0')
    return `${y}-${m}-${day}-${h}`
  }
  return `${y}-${m}-${day}`
}

function formatLabel(key: string, useHourly: boolean): string {
  if (useHourly) {
    const [y, mo, d, h] = key.split('-').map(Number)
    return new Date(y, mo - 1, d, h).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      hour12: true,
    })
  }
  const [y, mo, d] = key.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Bucket command_details by dynamic time intervals.
 * < 10 days span → 4-hour buckets, >= 10 days → daily buckets.
 * Returns at most 60 buckets (last 60 if more).
 */
export function bucketCommands(
  commands: CommandDetail[],
  options?: BucketOptions,
): Bucket[] {
  const sorted = commands
    .filter((c) => c.timestamp && (options?.includeInterrupted || !c.interrupted))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  if (sorted.length === 0) return []

  const { useHourly } = computeInterval(sorted.map((c) => c.timestamp))

  const map = new Map<string, CommandDetail[]>()
  for (const cmd of sorted) {
    const key = getBucketKey(cmd.timestamp, useHourly)
    const arr = map.get(key)
    if (arr) arr.push(cmd)
    else map.set(key, [cmd])
  }

  const keys = Array.from(map.keys()).sort()
  const limited = keys.slice(-60)

  return limited.map((key) => ({
    label: formatLabel(key, useHourly),
    commands: map.get(key)!,
  }))
}

export interface ErrorBucket {
  label: string
  commandCount: number
  errorCount: number
}

/**
 * Bucket commands and errors together by dynamic time intervals.
 * Uses command timestamps to define the timeline, then counts errors per bucket.
 */
export function bucketCommandsAndErrors(
  commands: CommandDetail[],
  errors: ErrorDetail[],
): ErrorBucket[] {
  const sorted = commands
    .filter((c) => c.timestamp)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  if (sorted.length === 0) return []

  const { useHourly } = computeInterval(sorted.map((c) => c.timestamp))

  const cmdMap = new Map<string, number>()
  for (const cmd of sorted) {
    const key = getBucketKey(cmd.timestamp, useHourly)
    cmdMap.set(key, (cmdMap.get(key) ?? 0) + 1)
  }

  const errMap = new Map<string, number>()
  for (const err of errors) {
    if (!err.timestamp) continue
    const key = getBucketKey(err.timestamp, useHourly)
    errMap.set(key, (errMap.get(key) ?? 0) + 1)
  }

  // Merge all bucket keys from both commands and errors
  const allKeys = new Set([...cmdMap.keys(), ...errMap.keys()])
  const keys = Array.from(allKeys).sort()
  const limited = keys.slice(-60)

  return limited.map((key) => ({
    label: formatLabel(key, useHourly),
    commandCount: cmdMap.get(key) ?? 0,
    errorCount: errMap.get(key) ?? 0,
  }))
}
