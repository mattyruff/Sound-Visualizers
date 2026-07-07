import { useMemo, useState } from 'react'
import type { Assignment, Employee, Job } from '../types'
import { formatDisplay } from '../dateUtils'
import { api } from '../api'

interface Props {
  date: string
  jobs: Job[]
  assignments: Assignment[]
  employees: Employee[]
  onToggleAcknowledged: (assignmentId: string, next: boolean) => void
  onClose: () => void
}

interface CrewMessage {
  employee: Employee
  body: string
  assignmentIds: string[]
  acknowledged: boolean
}

function composeMessage(employee: Employee, jobs: Job[], date: string): string {
  const lines = jobs.map((j) => {
    const parts = [j.name]
    if (j.startTime) parts.push(`at ${j.startTime}`)
    if (j.address) parts.push(`— ${j.address}`)
    if (j.notes) parts.push(`(Note: ${j.notes})`)
    return parts.join(' ')
  })
  const first = employee.name.split(' ')[0]
  return `Hi ${first}, your assignment${jobs.length > 1 ? 's' : ''} for ${formatDisplay(date)}: ${lines.join('; ')}`
}

export function TextCrewModal({
  date,
  jobs,
  assignments,
  employees,
  onToggleAcknowledged,
  onClose,
}: Props) {
  const [sendStatus, setSendStatus] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const messages = useMemo<CrewMessage[]>(() => {
    const byEmployee = new Map<string, { jobs: Job[]; assignments: Assignment[] }>()
    for (const a of assignments) {
      const job = jobs.find((j) => j.id === a.jobId)
      if (!job) continue
      const entry = byEmployee.get(a.employeeId) ?? { jobs: [], assignments: [] }
      entry.jobs.push(job)
      entry.assignments.push(a)
      byEmployee.set(a.employeeId, entry)
    }
    return [...byEmployee.entries()]
      .map(([employeeId, entry]) => {
        const employee = employees.find((e) => e.id === employeeId)
        if (!employee) return null
        return {
          employee,
          body: composeMessage(employee, entry.jobs, date),
          assignmentIds: entry.assignments.map((a) => a.id),
          acknowledged: entry.assignments.every((a) => a.acknowledged),
        }
      })
      .filter((m): m is CrewMessage => m !== null)
      .sort((a, b) => a.employee.name.localeCompare(b.employee.name))
  }, [assignments, jobs, employees, date])

  const ackedCount = messages.filter((m) => m.acknowledged).length

  const missingPhones = messages.filter((m) => !m.employee.phone).length

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  async function sendAll() {
    const sendable = messages.filter((m) => m.employee.phone)
    if (sendable.length === 0) {
      setSendStatus('No employees with phone numbers to text.')
      return
    }
    setSendStatus('Sending…')
    try {
      const { results } = await api.sendTexts(
        sendable.map((m) => ({ to: m.employee.phone, body: m.body })),
      )
      const sent = results.filter((r) => r.ok).length
      setSendStatus(`Sent ${sent}/${results.length} messages.`)
    } catch (err) {
      setSendStatus(err instanceof Error ? err.message : 'Sending failed.')
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Text crew — {formatDisplay(date)}
            </h2>
            {messages.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {ackedCount}/{messages.length} acknowledged
              </p>
            )}
          </div>
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
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nobody is assigned to a job on this day yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {messages.map(({ employee, body, assignmentIds, acknowledged }) => (
                <li
                  key={employee.id}
                  className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {employee.name}
                      {acknowledged && (
                        <span className="ml-1 font-bold text-black dark:text-white" title="Acknowledged">
                          ✓
                        </span>
                      )}
                      {employee.phone ? (
                        <span className="ml-2 font-normal text-slate-400">{employee.phone}</span>
                      ) : (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                          no phone on file
                        </span>
                      )}
                    </span>
                    <span className="flex flex-none gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          assignmentIds.forEach((id) => onToggleAcknowledged(id, !acknowledged))
                        }
                        className={`rounded px-2 py-1 text-xs ${
                          acknowledged
                            ? 'bg-slate-900 font-medium text-white dark:bg-white dark:text-slate-900'
                            : 'border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                        title={acknowledged ? 'Click to clear acknowledgment' : 'Mark acknowledged'}
                      >
                        {acknowledged ? '✓ Acknowledged' : 'Awaiting reply'}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(body, employee.id)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {copied === employee.id ? 'Copied!' : 'Copy'}
                      </button>
                      {employee.phone && (
                        <a
                          href={`sms:${employee.phone}?body=${encodeURIComponent(body)}`}
                          className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          Text
                        </a>
                      )}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {messages.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
            {missingPhones > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {missingPhones} {missingPhones === 1 ? 'person has' : 'people have'} no phone number
                — edit them (✎) in the employee list to add one.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  copyText(messages.map((m) => `${m.employee.name}: ${m.body}`).join('\n\n'), 'all')
                }
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {copied === 'all' ? 'Copied!' : 'Copy all'}
              </button>
              <button
                type="button"
                onClick={sendAll}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Send all
              </button>
            </div>
            {sendStatus && (
              <p className="text-right text-xs text-slate-500 dark:text-slate-400">{sendStatus}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
