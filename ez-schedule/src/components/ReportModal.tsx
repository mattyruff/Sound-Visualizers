import { useMemo, useState } from 'react'
import type { Assignment, Employee, Job, Settings } from '../types'
import { buildReport } from '../report'
import { api } from '../api'

interface Props {
  date: string
  jobs: Job[]
  assignments: Assignment[]
  employees: Employee[]
  settings: Settings
  onSaveSettings: (settings: Settings) => Promise<void>
  onClose: () => void
}

export function ReportModal({
  date,
  jobs,
  assignments,
  employees,
  settings,
  onSaveSettings,
  onClose,
}: Props) {
  const [emails, setEmails] = useState(settings.reportEmails.join(', '))
  const [time, setTime] = useState(settings.reportTime)
  const [enabled, setEnabled] = useState(settings.reportEnabled)
  const [status, setStatus] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const report = useMemo(
    () => buildReport(date, jobs, assignments, employees),
    [date, jobs, assignments, employees],
  )

  function parsedEmails(): string[] {
    return emails
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter(Boolean)
  }

  async function saveSettings() {
    await onSaveSettings({ reportEmails: parsedEmails(), reportTime: time, reportEnabled: enabled })
    setStatus('Settings saved.')
  }

  async function sendNow() {
    setStatus('Sending…')
    try {
      await onSaveSettings({
        reportEmails: parsedEmails(),
        reportTime: time,
        reportEnabled: enabled,
      })
      const { sentTo } = await api.sendReport(date)
      setStatus(`Report emailed to ${sentTo.join(', ')}.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Sending failed.')
    }
  }

  const mailtoHref = `mailto:${encodeURIComponent(parsedEmails().join(','))}?subject=${encodeURIComponent(report.subject)}&body=${encodeURIComponent(report.body)}`

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Manager status report</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <pre className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed whitespace-pre-wrap text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {report.body}
          </pre>

          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Daily email settings
            </h3>
            <input
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Manager emails, comma-separated"
              className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                Send at
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                Send automatically every day
              </label>
              <button
                type="button"
                onClick={saveSettings}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Save settings
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Automatic sending requires the local server running with SMTP configured (see
              README). "Open in email app" works anywhere.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(report.body).catch(() => {})
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {copied ? 'Copied!' : 'Copy report'}
            </button>
            <a
              href={mailtoHref}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Open in email app
            </a>
            <button
              type="button"
              onClick={sendNow}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Email now
            </button>
          </div>
          {status && (
            <p className="text-right text-xs text-slate-500 dark:text-slate-400">{status}</p>
          )}
        </div>
      </div>
    </div>
  )
}
