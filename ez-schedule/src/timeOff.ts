import type { Employee, TimeOffRange } from './types'
import { formatShort } from './dateUtils'

export function isOff(employee: Employee, date: string): boolean {
  return employee.timeOff.some((r) => r.from <= date && date <= (r.to || r.from))
}

export function formatTimeOffRange(range: TimeOffRange): string {
  return range.from === range.to || !range.to
    ? formatShort(range.from)
    : `${formatShort(range.from)} – ${formatShort(range.to)}`
}
