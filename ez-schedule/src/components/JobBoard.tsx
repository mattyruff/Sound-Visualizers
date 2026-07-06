import { useState } from 'react'
import type { Job } from '../types'
import { JobCard, type CrewMember } from './JobCard'

interface Props {
  date: string
  jobs: Job[]
  crewByJob: Map<string, CrewMember[]>
  dragActive: boolean
  onAdd: (input: Omit<Job, 'id'>) => void
  onRemoveJob: (id: string) => void
  onUnassign: (jobId: string, employeeId: string) => void
  onTextCrew: () => void
}

const emptyForm = { name: '', client: '', address: '', startTime: '', crewNeeded: 1, notes: '' }

export function JobBoard({
  date,
  jobs,
  crewByJob,
  dragActive,
  onAdd,
  onRemoveJob,
  onUnassign,
  onTextCrew,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    onAdd({ ...form, date })
    setForm(emptyForm)
    setShowForm(false)
  }

  return (
    <section className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Jobs
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onTextCrew}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            💬 Text crew
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {showForm ? 'Cancel' : '+ Add job'}
          </button>
        </div>
      </div>

      {showForm && (
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
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            type="number"
            min={1}
            value={form.crewNeeded}
            onChange={(e) => setForm({ ...form, crewNeeded: Number(e.target.value) || 1 })}
            placeholder="Crew needed"
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes (optional)"
            className="col-span-2 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            type="submit"
            className="col-span-2 rounded bg-emerald-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add job
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
              onRemove={() => onRemoveJob(job.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
