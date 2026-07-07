import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { api } from './api'
import { formatDisplay, todayISO, weekDates } from './dateUtils'
import type { Employee, Job, ScheduleState, Settings } from './types'
import { DateNav, type ViewMode } from './components/DateNav'
import { EmployeeRail, type EmployeeInput } from './components/EmployeeRail'
import { JobBoard } from './components/JobBoard'
import { WeekBoard } from './components/WeekBoard'
import { ConfirmDialog } from './components/ConfirmDialog'
import { TextCrewModal } from './components/TextCrewModal'
import { AddDaysModal } from './components/AddDaysModal'
import { ReportModal } from './components/ReportModal'
import { initials } from './components/EmployeeBubble'
import type { CrewMember } from './components/JobCard'

interface PendingConflict {
  jobId: string
  employeeId: string
  employeeName: string
  conflictingJobName: string
  // set when the drop came from a chip inside another job — confirming
  // moves the employee instead of adding a second booking
  moveFromAssignmentId?: string
}

interface ActiveDrag {
  employeeId: string
  fromChip: boolean
}

type DragData =
  | { type: 'employee'; employeeId: string }
  | { type: 'chip'; employeeId: string; fromJobId: string; fromAssignmentId: string }

function App() {
  const [schedule, setSchedule] = useState<ScheduleState | null>(null)
  const [date, setDate] = useState(todayISO())
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null)
  const [showTextCrew, setShowTextCrew] = useState(false)
  const [view, setView] = useState<ViewMode>('day')
  const [addDaysJob, setAddDaysJob] = useState<Job | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [deleteJobTarget, setDeleteJobTarget] = useState<Job | null>(null)

  useEffect(() => {
    api
      .getState()
      .then(setSchedule)
      .catch(() => setError('Could not reach the local server. Is it running?'))
  }, [])

  // mouse drags start after a small movement; touch drags start after a
  // short press-and-hold so the lists still scroll normally with a swipe
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 8 } }),
  )

  const jobsForDate = useMemo(
    () => (schedule ? schedule.jobs.filter((j) => j.date === date) : []),
    [schedule, date],
  )

  const assignmentsForDate = useMemo(() => {
    if (!schedule) return []
    const jobIds = new Set(jobsForDate.map((j) => j.id))
    return schedule.assignments.filter((a) => jobIds.has(a.jobId))
  }, [schedule, jobsForDate])

  const employeesById = useMemo(() => {
    const map = new Map<string, Employee>()
    schedule?.employees.forEach((e) => map.set(e.id, e))
    return map
  }, [schedule])

  // crew per job across ALL jobs, so both the day board and the week
  // calendar can read from it
  const crewByJob = useMemo(() => {
    const map = new Map<string, CrewMember[]>()
    if (!schedule) return map
    for (const a of schedule.assignments) {
      const employee = employeesById.get(a.employeeId)
      if (!employee) continue
      const list = map.get(a.jobId) ?? []
      list.push({ employee, assignmentId: a.id, acknowledged: a.acknowledged })
      map.set(a.jobId, list)
    }
    return map
  }, [schedule, employeesById])

  const weekDatesList = useMemo(() => weekDates(date), [date])

  const jobsByDate = useMemo(() => {
    const map = new Map<string, Job[]>()
    if (!schedule) return map
    const wanted = new Set(weekDatesList)
    for (const job of schedule.jobs) {
      if (!wanted.has(job.date)) continue
      const list = map.get(job.date) ?? []
      list.push(job)
      map.set(job.date, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
    return map
  }, [schedule, weekDatesList])

  const assignedEmployeeIds = useMemo(
    () => new Set(assignmentsForDate.map((a) => a.employeeId)),
    [assignmentsForDate],
  )

  const jobCountByEmployee = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of assignmentsForDate) {
      map.set(a.employeeId, (map.get(a.employeeId) ?? 0) + 1)
    }
    return map
  }, [assignmentsForDate])

  // employees whose every assignment for the day is acknowledged get the
  // black checkmark in the rail
  const acknowledgedEmployeeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const id of assignedEmployeeIds) {
      const mine = assignmentsForDate.filter((a) => a.employeeId === id)
      if (mine.length > 0 && mine.every((a) => a.acknowledged)) ids.add(id)
    }
    return ids
  }, [assignedEmployeeIds, assignmentsForDate])

  // day-status ribbon numbers
  const dayStatus = useMemo(() => {
    const shortStaffed = jobsForDate.filter(
      (j) => (crewByJob.get(j.id)?.length ?? 0) < j.crewNeeded,
    ).length
    const unassigned = schedule ? schedule.employees.length - assignedEmployeeIds.size : 0
    return {
      shortStaffed,
      unassigned,
      acked: acknowledgedEmployeeIds.size,
      assigned: assignedEmployeeIds.size,
    }
  }, [jobsForDate, crewByJob, schedule, assignedEmployeeIds, acknowledgedEmployeeIds])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="max-w-md text-center text-slate-500 dark:text-slate-400">{error}</p>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-400">Loading schedule…</p>
      </div>
    )
  }

  async function handleAddEmployee(input: EmployeeInput) {
    const employee = await api.createEmployee(input)
    setSchedule((s) => (s ? { ...s, employees: [...s.employees, employee] } : s))
  }

  async function handleUpdateEmployee(id: string, input: EmployeeInput) {
    const employee = await api.updateEmployee(id, input)
    setSchedule((s) =>
      s ? { ...s, employees: s.employees.map((e) => (e.id === id ? employee : e)) } : s,
    )
  }

  async function handleRemoveEmployee(id: string) {
    await api.deleteEmployee(id)
    setSchedule((s) =>
      s
        ? {
            ...s,
            employees: s.employees.filter((e) => e.id !== id),
            assignments: s.assignments.filter((a) => a.employeeId !== id),
          }
        : s,
    )
  }

  async function handleAddJob(input: Omit<Job, 'id'>) {
    const job = await api.createJob(input)
    setSchedule((s) => (s ? { ...s, jobs: [...s.jobs, job] } : s))
  }

  async function handleSaveSettings(input: Settings) {
    const settings = await api.updateSettings(input)
    setSchedule((s) => (s ? { ...s, settings } : s))
  }

  async function handleUpdateJob(id: string, input: Omit<Job, 'id'>) {
    const job = await api.updateJob(id, input)
    setSchedule((s) => (s ? { ...s, jobs: s.jobs.map((j) => (j.id === id ? job : j)) } : s))
  }

  async function handleAddDays(dates: string[], includeCrew: boolean) {
    if (!addDaysJob) return
    const jobId = addDaysJob.id
    setAddDaysJob(null)
    const { jobs, assignments } = await api.duplicateJob(jobId, dates, includeCrew)
    setSchedule((s) =>
      s
        ? {
            ...s,
            jobs: [...s.jobs, ...jobs],
            assignments: [...s.assignments, ...assignments],
          }
        : s,
    )
  }

  async function handleRemoveJob(id: string) {
    await api.deleteJob(id)
    setSchedule((s) =>
      s
        ? {
            ...s,
            jobs: s.jobs.filter((j) => j.id !== id),
            assignments: s.assignments.filter((a) => a.jobId !== id),
          }
        : s,
    )
  }

  async function handleUnassign(jobId: string, employeeId: string) {
    const assignment = schedule!.assignments.find(
      (a) => a.jobId === jobId && a.employeeId === employeeId,
    )
    if (!assignment) return
    setSchedule((s) =>
      s ? { ...s, assignments: s.assignments.filter((a) => a.id !== assignment.id) } : s,
    )
    await api.unassign(assignment.id).catch(() => {
      // put it back if the server rejected the unassign
      setSchedule((s) => (s ? { ...s, assignments: [...s.assignments, assignment] } : s))
    })
  }

  async function toggleAcknowledged(assignmentId: string, next: boolean) {
    setSchedule((s) =>
      s
        ? {
            ...s,
            assignments: s.assignments.map((a) =>
              a.id === assignmentId ? { ...a, acknowledged: next } : a,
            ),
          }
        : s,
    )
    await api.setAcknowledged(assignmentId, next).catch(() => {
      setSchedule((s) =>
        s
          ? {
              ...s,
              assignments: s.assignments.map((a) =>
                a.id === assignmentId ? { ...a, acknowledged: !next } : a,
              ),
            }
          : s,
      )
    })
  }

  async function performAssign(jobId: string, employeeId: string, moveFromAssignmentId?: string) {
    const previousAssignments = schedule!.assignments
    const tempId = `pending-${employeeId}-${jobId}`
    setSchedule((s) =>
      s
        ? {
            ...s,
            assignments: [
              ...s.assignments.filter((a) => a.id !== moveFromAssignmentId),
              { id: tempId, jobId, employeeId, acknowledged: false },
            ],
          }
        : s,
    )
    try {
      const assignment = await api.assign(jobId, employeeId)
      if (moveFromAssignmentId) await api.unassign(moveFromAssignmentId)
      setSchedule((s) =>
        s
          ? {
              ...s,
              assignments: s.assignments.map((a) => (a.id === tempId ? assignment : a)),
            }
          : s,
      )
    } catch {
      setSchedule((s) => (s ? { ...s, assignments: previousAssignments } : s))
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData | undefined
    if (!data) return
    setActiveDrag({ employeeId: data.employeeId, fromChip: data.type === 'chip' })
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null)
    const { active, over } = event
    if (!over) return
    const data = active.data.current as DragData | undefined
    const jobData = over.data.current as { type: string; jobId: string } | undefined
    if (!data || jobData?.type !== 'job') return

    const { employeeId } = data
    const jobId = jobData.jobId
    const job = schedule!.jobs.find((j) => j.id === jobId)
    if (!job) return

    const moveFromAssignmentId = data.type === 'chip' ? data.fromAssignmentId : undefined
    if (data.type === 'chip' && data.fromJobId === jobId) return

    const alreadyOnTarget = schedule!.assignments.some(
      (a) => a.jobId === jobId && a.employeeId === employeeId,
    )
    if (alreadyOnTarget) {
      // dropping a chip onto a job the employee is already on: treat as a
      // move and just clear the source assignment
      if (moveFromAssignmentId) {
        const source = schedule!.assignments.find((a) => a.id === moveFromAssignmentId)
        if (source) void handleUnassign(source.jobId, employeeId)
      }
      return
    }

    const currentCrew = schedule!.assignments.filter((a) => a.jobId === jobId).length
    if (currentCrew >= job.crewNeeded) return

    // warn when the employee would still be booked on another same-day job
    // (excluding the job they're being moved away from)
    const conflict = schedule!.assignments.find((a) => {
      if (a.employeeId !== employeeId) return false
      if (a.id === moveFromAssignmentId) return false
      const otherJob = schedule!.jobs.find((j) => j.id === a.jobId)
      return !!otherJob && otherJob.date === job.date && otherJob.id !== job.id
    })

    if (conflict) {
      const conflictingJob = schedule!.jobs.find((j) => j.id === conflict.jobId)
      const employee = schedule!.employees.find((e) => e.id === employeeId)
      setPendingConflict({
        jobId,
        employeeId,
        employeeName: employee?.name ?? 'This employee',
        conflictingJobName: conflictingJob?.name ?? 'another job',
        moveFromAssignmentId,
      })
      return
    }

    void performAssign(jobId, employeeId, moveFromAssignmentId)
  }

  const activeEmployee = activeDrag ? employeesById.get(activeDrag.employeeId) : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="flex h-screen flex-col bg-slate-100 dark:bg-slate-950">
        <DateNav date={date} view={view} onChange={setDate} onViewChange={setView} />
        {view === 'day' && (jobsForDate.length > 0 || schedule.employees.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 sm:px-6 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <span className={dayStatus.shortStaffed > 0 ? 'font-medium text-amber-600 dark:text-amber-400' : ''}>
              {dayStatus.shortStaffed > 0
                ? `⚠ ${dayStatus.shortStaffed} job${dayStatus.shortStaffed === 1 ? '' : 's'} short-staffed`
                : '✓ All jobs fully staffed'}
            </span>
            <span>
              {dayStatus.unassigned} employee{dayStatus.unassigned === 1 ? '' : 's'} unassigned
            </span>
            {dayStatus.assigned > 0 && (
              <span
                className={
                  dayStatus.acked === dayStatus.assigned
                    ? 'font-medium text-emerald-600 dark:text-emerald-400'
                    : ''
                }
              >
                {dayStatus.acked}/{dayStatus.assigned} acknowledged
              </span>
            )}
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <EmployeeRail
            employees={schedule.employees}
            assignedEmployeeIds={assignedEmployeeIds}
            acknowledgedEmployeeIds={acknowledgedEmployeeIds}
            jobCountByEmployee={jobCountByEmployee}
            onAdd={handleAddEmployee}
            onUpdate={handleUpdateEmployee}
            onRemove={handleRemoveEmployee}
          />
          {view === 'day' ? (
            <JobBoard
              date={date}
              jobs={jobsForDate}
              crewByJob={crewByJob}
              dragActive={activeDrag !== null}
              onAdd={handleAddJob}
              onUpdateJob={handleUpdateJob}
              onRemoveJob={(id) => {
                const job = schedule.jobs.find((j) => j.id === id)
                if (job) setDeleteJobTarget(job)
              }}
              onUnassign={handleUnassign}
              onToggleAcknowledged={toggleAcknowledged}
              onAddDays={setAddDaysJob}
              onTextCrew={() => setShowTextCrew(true)}
              onOpenReport={() => setShowReport(true)}
            />
          ) : (
            <WeekBoard
              dates={weekDatesList}
              jobsByDate={jobsByDate}
              crewByJob={crewByJob}
              dragActive={activeDrag !== null}
              onOpenDay={(d) => {
                setDate(d)
                setView('day')
              }}
            />
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeEmployee && (
          <div
            className={`flex items-center gap-3 rounded-full border px-3 py-2 text-white shadow-xl ${
              !activeDrag?.fromChip && assignedEmployeeIds.has(activeEmployee.id)
                ? 'border-red-600 bg-red-500'
                : 'border-emerald-600 bg-emerald-500'
            }`}
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
              {initials(activeEmployee.name)}
            </span>
            <span className="text-sm font-medium whitespace-nowrap">{activeEmployee.name}</span>
          </div>
        )}
      </DragOverlay>

      {addDaysJob && (
        <AddDaysModal
          job={addDaysJob}
          existingDates={
            new Set(
              schedule.jobs
                .filter((j) => j.name === addDaysJob.name && j.id !== addDaysJob.id)
                .map((j) => j.date),
            )
          }
          onConfirm={handleAddDays}
          onClose={() => setAddDaysJob(null)}
        />
      )}

      {showReport && (
        <ReportModal
          date={date}
          jobs={jobsForDate}
          assignments={assignmentsForDate}
          employees={schedule.employees}
          settings={schedule.settings}
          onSaveSettings={handleSaveSettings}
          onClose={() => setShowReport(false)}
        />
      )}

      {showTextCrew && (
        <TextCrewModal
          date={date}
          jobs={jobsForDate}
          assignments={assignmentsForDate}
          employees={schedule.employees}
          onToggleAcknowledged={toggleAcknowledged}
          onClose={() => setShowTextCrew(false)}
        />
      )}

      {deleteJobTarget && (
        <ConfirmDialog
          message={`Delete ${deleteJobTarget.name} (${formatDisplay(deleteJobTarget.date)})?`}
          confirmLabel="Yes"
          danger
          onCancel={() => setDeleteJobTarget(null)}
          onConfirm={() => {
            void handleRemoveJob(deleteJobTarget.id)
            setDeleteJobTarget(null)
          }}
        />
      )}

      {pendingConflict && (
        <ConfirmDialog
          message={`${pendingConflict.employeeName} is already booked on ${pendingConflict.conflictingJobName}. Do you wish to proceed?`}
          confirmLabel="Proceed"
          onCancel={() => setPendingConflict(null)}
          onConfirm={() => {
            void performAssign(
              pendingConflict.jobId,
              pendingConflict.employeeId,
              pendingConflict.moveFromAssignmentId,
            )
            setPendingConflict(null)
          }}
        />
      )}
    </DndContext>
  )
}

export default App
