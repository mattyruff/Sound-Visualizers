import { addDays, formatDisplay, formatRange, todayISO, weekDates } from '../dateUtils'

export type ViewMode = 'day' | 'week'

interface Props {
  date: string
  view: ViewMode
  onChange: (date: string) => void
  onViewChange: (view: ViewMode) => void
}

export function DateNav({ date, view, onChange, onViewChange }: Props) {
  const isToday = date === todayISO()
  const step = view === 'week' ? 7 : 1
  const week = weekDates(date)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-3 sm:gap-4 sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(addDays(date, -step))}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label={view === 'week' ? 'Previous week' : 'Previous day'}
        >
          ◀
        </button>
        <button
          type="button"
          onClick={() => onChange(todayISO())}
          disabled={isToday}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => onChange(addDays(date, step))}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label={view === 'week' ? 'Next week' : 'Next day'}
        >
          ▶
        </button>
      </div>

      <h1 className="order-first w-full text-center text-base font-semibold text-slate-900 sm:order-none sm:w-auto sm:text-lg dark:text-slate-100">
        {view === 'week' ? formatRange(week[0], week[6]) : formatDisplay(date)}
      </h1>

      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-full border border-slate-300 text-xs font-medium dark:border-slate-700">
          <button
            type="button"
            onClick={() => onViewChange('day')}
            className={`px-3 py-1.5 ${
              view === 'day'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => onViewChange('week')}
            className={`px-3 py-1.5 ${
              view === 'week'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Week
          </button>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        />
      </div>
    </div>
  )
}
