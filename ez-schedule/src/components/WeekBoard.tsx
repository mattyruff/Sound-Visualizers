import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Job } from '../types'
import type { CrewMember } from './JobCard'
import { initials } from './EmployeeBubble'
import { isWeekend, todayISO, weekdayShort } from '../dateUtils'

function CompactChip({ member, jobId }: { member: CrewMember; jobId: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip-${member.assignmentId}`,
    data: {
      type: 'chip',
      employeeId: member.employee.id,
      fromJobId: jobId,
      fromAssignmentId: member.assignmentId,
    },
  })
  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none' }}
      title={member.employee.name}
      className={`flex cursor-grab items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[11px] font-semibold text-white select-none active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      {initials(member.employee.name)}
      {member.acknowledged && <span className="font-bold text-black">✓</span>}
    </span>
  )
}

function WeekJobCard({
  job,
  crew,
  dragActive,
}: {
  job: Job
  crew: CrewMember[]
  dragActive: boolean
}) {
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
      className={`flex flex-col gap-1 rounded-lg border bg-white p-2 text-xs shadow-sm transition dark:bg-slate-900 ${ring}`}
    >
      <span className="truncate font-semibold text-slate-900 dark:text-slate-100" title={job.name}>
        {job.name}
      </span>
      <span className="flex items-center justify-between text-slate-500 dark:text-slate-400">
        <span>{job.startTime || '—'}</span>
        <span className={isFull ? 'font-medium text-emerald-600 dark:text-emerald-400' : ''}>
          {crew.length}/{job.crewNeeded}
        </span>
      </span>
      {crew.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {crew.map((member) => (
            <CompactChip key={member.assignmentId} member={member} jobId={job.id} />
          ))}
        </span>
      )}
    </div>
  )
}

interface Props {
  dates: string[]
  jobsByDate: Map<string, Job[]>
  crewByJob: Map<string, CrewMember[]>
  dragActive: boolean
  onOpenDay: (date: string) => void
}

export function WeekBoard({ dates, jobsByDate, crewByJob, dragActive, onOpenDay }: Props) {
  const today = todayISO()
  return (
    <section className="flex flex-1 overflow-x-auto p-3 sm:p-4">
      <div className="grid min-w-[840px] flex-1 grid-cols-7 gap-2">
        {dates.map((date) => {
          const jobs = jobsByDate.get(date) ?? []
          const shortStaffed = jobs.filter(
            (j) => (crewByJob.get(j.id)?.length ?? 0) < j.crewNeeded,
          ).length
          return (
            <div
              key={date}
              className={`flex flex-col gap-2 rounded-xl p-2 ${
                isWeekend(date) ? 'bg-slate-200/50 dark:bg-slate-900/60' : 'bg-slate-50 dark:bg-slate-950'
              }`}
            >
              <button
                type="button"
                onClick={() => onOpenDay(date)}
                title="Open day view"
                className={`flex flex-col items-center rounded-lg py-1 hover:bg-white dark:hover:bg-slate-800 ${
                  date === today ? 'bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <span className="text-[11px] uppercase">{weekdayShort(date)}</span>
                <span className="text-sm font-semibold">{Number(date.slice(8))}</span>
                {shortStaffed > 0 && (
                  <span className="mt-0.5 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-amber-950">
                    {shortStaffed} short
                  </span>
                )}
              </button>
              {jobs.map((job) => (
                <WeekJobCard
                  key={job.id}
                  job={job}
                  crew={crewByJob.get(job.id) ?? []}
                  dragActive={dragActive}
                />
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}
