import { useDroppable } from '@dnd-kit/core'
import type { Employee, Job } from '../types'
import { AssignedChip } from './AssignedChip'

export interface CrewMember {
  employee: Employee
  assignmentId: string
  acknowledged: boolean
}

interface Props {
  job: Job
  crew: CrewMember[]
  dragActive: boolean
  onUnassign: (employeeId: string) => void
  onToggleAcknowledged: (assignmentId: string, next: boolean) => void
  onRemove: () => void
}

export function JobCard({
  job,
  crew,
  dragActive,
  onUnassign,
  onToggleAcknowledged,
  onRemove,
}: Props) {
  const isFull = crew.length >= job.crewNeeded
  const { setNodeRef, isOver } = useDroppable({
    id: `job-${job.id}`,
    data: { type: 'job', jobId: job.id },
    disabled: isFull,
  })

  let ring = 'border-slate-200 dark:border-slate-700'
  if (dragActive) {
    ring = isFull
      ? 'border-slate-200 opacity-40 dark:border-slate-800'
      : isOver
        ? 'border-emerald-500 ring-2 ring-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
        : 'border-emerald-300 ring-1 ring-emerald-200 dark:border-emerald-700'
  }

  return (
    <div
      ref={setNodeRef}
      className={`group flex flex-col gap-3 rounded-xl border-2 bg-white p-4 shadow-sm transition dark:bg-slate-900 ${ring}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{job.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{job.client}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200 sm:invisible sm:group-hover:visible dark:bg-slate-800 dark:text-slate-400"
          title="Delete job"
        >
          Delete
        </button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
        {job.startTime && <span>🕐 {job.startTime}</span>}
        {job.address && <span>📍 {job.address}</span>}
        <span className={isFull ? 'font-medium text-emerald-600 dark:text-emerald-400' : ''}>
          👥 {crew.length}/{job.crewNeeded} filled
        </span>
      </div>

      {job.notes && <p className="text-sm text-slate-500 italic dark:text-slate-400">{job.notes}</p>}

      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-200 p-2 dark:border-slate-700">
        {crew.length === 0 && (
          <span className="px-1 text-sm text-slate-400">Drop an employee here</span>
        )}
        {crew.map(({ employee, assignmentId, acknowledged }) => (
          <AssignedChip
            key={assignmentId}
            employee={employee}
            assignmentId={assignmentId}
            jobId={job.id}
            acknowledged={acknowledged}
            onToggleAcknowledged={() => onToggleAcknowledged(assignmentId, !acknowledged)}
            onUnassign={() => onUnassign(employee.id)}
          />
        ))}
      </div>
    </div>
  )
}
