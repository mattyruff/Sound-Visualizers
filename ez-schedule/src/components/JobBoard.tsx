import { useState } from 'react'
import type { Job } from '../types'
import { JobCard, type CrewMember } from './JobCard'

interface Props {
  date: string
  jobs: Job[]
  crewByJob: Map<string, CrewMember[]>
  dragActive: boolean
  onAdd: (input: Omit<Job, 'id'>) => void
  onUpdateJob: (id: string, input: Omit<Job, 'id'>) => void
  onRemoveJob: (id: string) => void
  onUnassign: (jobId: string, employeeId: string) => void
  onToggleAcknowledged: (assignmentId: string, next: boolean) => void
  onAddDays: (job: Job) => void
  onTextCrew: () => void
  onOpenReport: () => void
}

// crewNeeded stays a string while typing so clearing the field to type a
// new number doesn't get force-reset; it's clamped to 1-20 on submit
interface JobForm {
  date: string
  name: string
  client: string
  address: string
  startTime: string
  crewNeeded: string
  notes: string
}

export function JobBoard({
  date,
  jobs,
  crewByJob,
  dragActive,
  onAdd,
  onUpdateJob,
  onRemoveJob,
  onUnassign,
  onToggleAcknowledged,
  onAddDays,
  onTextCrew,
  onOpenReport,
}: Props) {
  // null = closed, '' = adding, otherwise the id of the job being edited
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<JobForm | null>(null)

  const formOpen = editingId !== null && form !== null

  function openAdd() {
    setForm({ date, name: '', client: '', address: '', startTime: '', crewNeeded: '1', notes: '' })
    setEditingId('')
  }

  function openEdit(job: Job) {
    setForm({
      date: job.date,
      name: job.name,
      client: job.client,
      address: job.address,
      startTime: job.startTime,
      crewNeeded: String(job.crewNeeded),
      notes: job.notes,
    })
    setEditingId(job.id)
  }

  function closeForm() {
    setEditingId(null)
    setForm(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form || !form.name.trim()) return
    const crewNeeded = Math.min(20, Math.max(1, Math.round(Number(form.crewNeeded)) || 1))
    const payload = { ...form, crewNeeded }
    if (editingId) {
      onUpdateJob(editingId, payload)
    } else {
      onAdd(payload)
    }
    closeForm()
  }

  return (
    <section className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Jobs
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenReport}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            📧 Report
          </button>
          <button
            type="button"
            onClick={onTextCrew}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            💬 Text crew
          </button>
          <button
            type="button"
            onClick={() => (formOpen ? closeForm() : openAdd())}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {formOpen ? 'Cancel' : '+ Add job'}
          </button>
        </div>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Job name"
            className="col-span-2 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            value={form.client}
            onChange={(e) => setForm({ ...form, client: e.target.value })}
            placeholder="Client"
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Address"
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            On Job Time
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="rounded border border-slate-300 px-2 py-1 text-sm font-normal text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Crew Count (1–20)
            <input
              type="number"
              min={1}
              max={20}
              step={1}
              inputMode="numeric"
              value={form.crewNeeded}
              onChange={(e) => setForm({ ...form, crewNeeded: e.target.value })}
              placeholder="1"
              className="rounded border border-slate-300 px-2 py-1 text-sm font-normal text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          {editingId !== '' && (
            <label className="col-span-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              Date
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <span>(change to move this job to another day)</span>
            </label>
          )}
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes (optional — included in crew texts)"
            className="col-span-2 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            type="submit"
            className="col-span-2 rounded bg-emerald-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {editingId ? 'Save changes' : 'Add job'}
          </button>
        </form>
      )}

      {jobs.length === 0 ? (
        <p className="text-sm text-slate-400">No jobs scheduled for this day yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              crew={crewByJob.get(job.id) ?? []}
              dragActive={dragActive}
              onUnassign={(employeeId) => onUnassign(job.id, employeeId)}
              onToggleAcknowledged={onToggleAcknowledged}
              onEdit={() => openEdit(job)}
              onAddDays={() => onAddDays(job)}
              onRemove={() => onRemoveJob(job.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
