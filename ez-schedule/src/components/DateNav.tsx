import { addDays, formatDisplay, todayISO } from '../dateUtils'

interface Props {
  date: string
  onChange: (date: string) => void
}

export function DateNav({ date, onChange }: Props) {
  const isToday = date === todayISO()

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-3 sm:gap-4 sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(addDays(date, -1))}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Previous day"
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
          onClick={() => onChange(addDays(date, 1))}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Next day"
        >
          ▶
        </button>
      </div>
      <h1 className="order-first w-full text-center text-base font-semibold text-slate-900 sm:order-none sm:w-auto sm:text-lg dark:text-slate-100">
        {formatDisplay(date)}
      </h1>
      <input
        type="date"
        value={date}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      />
    </div>
  )
}
