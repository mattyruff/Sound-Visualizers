export function todayISO(): string {
  return toISO(new Date())
}

export function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + delta)
  return toISO(date)
}

export function formatDisplay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function weekdayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' })
}

// Monday-start week containing the given date
export function weekStart(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  return addDays(iso, diff)
}

export function weekDates(iso: string): string[] {
  const start = weekStart(iso)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function isWeekend(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return day === 0 || day === 6
}

export function formatRange(startIso: string, endIso: string): string {
  const [sy, sm, sd] = startIso.split('-').map(Number)
  const [ey, em, ed] = endIso.split('-').map(Number)
  const s = new Date(sy, sm - 1, sd)
  const e = new Date(ey, em - 1, ed)
  const sTxt = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const eTxt = e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return `${sTxt} – ${eTxt}`
}
