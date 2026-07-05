import { useEffect, useMemo, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { api } from './api'
import { todayISO } from './dateUtils'
import type { Employee, Job, ScheduleState } from './types'
import { DateNav } from './components/DateNav'
import { EmployeeRail } from './components/EmployeeRail'
import { JobBoard } from './components/JobBoard'
import { ConfirmDialog } from './components/ConfirmDialog'

interface PendingConflict {
  jobId: string
  employeeId: string
  employeeName: string
  conflictingJobName: string
}

function App() {
  const [schedule, setSchedule] = useState<ScheduleState | null>(null)
  const [date, setDate] = useState(todayISO())
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null)

  useEffect(() => {
    api
      .getState()
      .then(setSchedule)
      .catch(() => setError('Could not reach the local server. Is it running?'))
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

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

  const employeesByJob = useMemo(() => {
    const map = new Map<string, Employee[]>()
    for (const a of assignmentsForDate) {
      const employee = employeesById.get(a.employeeId)
      if (!employee) continue
      const list = map.get(a.jobId) ?? []
      list.push(employee)
      map.set(a.jobId, list)
    }
    return map
  }, [assignmentsForDate, employeesById])

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

  async function handleAddEmployee(input: { name: string; role: string }) {
    const employee = await api.createEmployee(input)
    setSchedule((s) => (s ? { ...s, employees: [...s.employees, employee] } : s))
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

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { type: string; employeeId: string } | undefined
    if (data?.type === 'employee') setActiveEmployeeId(data.employeeId)
  }

  async function performAssign(jobId: string, employeeId: string) {
    const previousAssignments = schedule!.assignments
    const tempId = `pending-${employeeId}-${jobId}`
    setSchedule((s) =>
      s ? { ...s, assignments: [...s.assignments, { id: tempId, jobId, employeeId }] } : s,
    )
    try {
      const assignment = await api.assign(jobId, employeeId)
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

  function handleDragEnd(event: DragEndEvent) {
    setActiveEmployeeId(null)
    const { active, over } = event
    if (!over) return
    const employeeData = active.data.current as { type: string; employeeId: string } | undefined
    const jobData = over.data.current as { type: string; jobId: string } | undefined
    if (employeeData?.type !== 'employee' || jobData?.type !== 'job') return

    const { employeeId } = employeeData
    const { jobId } = jobData

    const job = schedule!.jobs.find((j) => j.id === jobId)
    if (!job) return
    const currentCrew = schedule!.assignments.filter((a) => a.jobId === jobId).length
    const alreadyHere = schedule!.assignments.some(
      (a) => a.jobId === jobId && a.employeeId === employeeId,
    )
    if (alreadyHere) return
    if (currentCrew >= job.crewNeeded) return

    const conflict = schedule!.assignments.find((a) => {
      if (a.employeeId !== employeeId) return false
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
      })
      return
    }

    void performAssign(jobId, employeeId)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveEmployeeId(null)}
    >
      <div className="flex h-screen flex-col bg-slate-100 dark:bg-slate-950">
        <DateNav date={date} onChange={setDate} />
        <div className="flex min-h-0 flex-1">
          <EmployeeRail
            employees={schedule.employees}
            assignedEmployeeIds={assignedEmployeeIds}
            jobCountByEmployee={jobCountByEmployee}
            onAdd={handleAddEmployee}
            onRemove={handleRemoveEmployee}
          />
          <JobBoard
            date={date}
            jobs={jobsForDate}
            employeesByJob={employeesByJob}
            dragActive={activeEmployeeId !== null}
            onAdd={handleAddJob}
            onRemoveJob={handleRemoveJob}
            onUnassign={handleUnassign}
          />
        </div>
      </div>

      {pendingConflict && (
        <ConfirmDialog
          message={`${pendingConflict.employeeName} is already booked on ${pendingConflict.conflictingJobName}. Do you wish to proceed?`}
          confirmLabel="Proceed"
          onCancel={() => setPendingConflict(null)}
          onConfirm={() => {
            void performAssign(pendingConflict.jobId, pendingConflict.employeeId)
            setPendingConflict(null)
          }}
        />
      )}
    </DndContext>
  )
}

export default App
