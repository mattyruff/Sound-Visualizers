import { useMemo, useState } from 'react'
import type { Job } from '../types'
import { addDays, formatShort, isWeekend, weekdayShort } from '../dateUtils'

interface Props {
  job: Job
  // dates (other than the job's own) that already have a job with the
  // same name, so we can mark them as covered
  existingDates: Set<string>
  onConfirm: (dates: string[], includeCrew: boolean) => void
  onClose: () => void
}

export function AddDaysModal({ job, existingDates, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [includeCrew, setIncludeCrew] = useState(true)

  // the two weeks following the job's date
  const candidates = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(job.date, i + 1)),
    [job.date],
  )

  function toggle(date: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function selectRestOfWorkWeek() {
    // remaining weekdays in the 6 days after the job's date (through the
    // end of its calendar week or the next weekday run)
    setSelected(() => {
      const next = new Set<string>()
      for (let i = 1; i <= 6; i++) {
        const d = addDays(job.date, i)
        if (isWeekend(d)) break
        if (!existingDates.has(d)) next.add(d)
      }
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Add “{job.name}” to more days
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Currently on {formatShort(job.date)}. Pick the extra days to copy it to.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <button
          type="button"
          onClick={selectRestOfWorkWeek}
          className="mt-3 rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Rest of the work week
        </button>

        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {candidates.map((date) => {
            const taken = existingDates.has(date)
            const on = selected.has(date)
            return (
              <button
                key={date}
                type="button"
                disabled={taken}
                onClick={() => toggle(date)}
                title={taken ? `${job.name} already exists on ${formatShort(date)}` : formatShort(date)}
                className={`flex flex-col items-center rounded-lg border px-1 py-1.5 text-xs transition ${
                  taken
                    ? 'cursor-not-allowed border-slate-200 text-slate-300 line-through dark:border-slate-800 dark:text-slate-600'
                    : on
                      ? 'border-emerald-600 bg-emerald-500 font-semibold text-white'
                      : isWeekend(date)
                        ? 'border-slate-200 bg-slate-50 text-slate-400 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500'
                        : 'border-slate-300 text-slate-600 hover:border-emerald-400 dark:border-slate-600 dark:text-slate-300'
                }`}
              >
                <span>{weekdayShort(date)}</span>
                <span className="font-medium">{date.slice(8)}</span>
              </button>
            )
          })}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={includeCrew}
            onChange={(e) => setIncludeCrew(e.target.checked)}
          />
          Copy assigned crew too (they'll need to re-acknowledge)
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => onConfirm([...selected].sort(), includeCrew)}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Add to {selected.size || 'no'} day{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}
