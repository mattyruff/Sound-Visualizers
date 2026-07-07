import type { Assignment, Employee, Job } from './types'
import { formatDisplay } from './dateUtils'
import { isOff } from './timeOff'

// Plain-text daily status report for managers. The server has an
// equivalent builder (server/report.js) used for scheduled emails —
// keep the two in sync if the format changes.

export function buildReport(
  date: string,
  jobs: Job[],
  assignments: Assignment[],
  employees: Employee[],
): { subject: string; body: string } {
  const jobIds = new Set(jobs.map((j) => j.id))
  const dayAssignments = assignments.filter((a) => jobIds.has(a.jobId))
  const crewCount = (jobId: string) => dayAssignments.filter((a) => a.jobId === jobId).length
  const employeeById = new Map(employees.map((e) => [e.id, e]))

  const unfilled = jobs.filter((j) => crewCount(j.id) < j.crewNeeded)
  const assignedIds = new Set(dayAssignments.map((a) => a.employeeId))
  const offToday = employees.filter((e) => !assignedIds.has(e.id) && isOff(e, date))
  const unassigned = employees.filter((e) => !assignedIds.has(e.id) && !isOff(e, date))
  const unacked = dayAssignments.filter((a) => !a.acknowledged)
  const ackedEmployees = [...assignedIds].filter((id) =>
    dayAssignments.filter((a) => a.employeeId === id).every((a) => a.acknowledged),
  )

  const lines: string[] = []
  lines.push(`EZ Schedule status report — ${formatDisplay(date)}`)
  lines.push('')
  lines.push('SUMMARY')
  lines.push(`- Jobs: ${jobs.length} scheduled, ${unfilled.length} not fully staffed`)
  lines.push(
    `- Crew: ${assignedIds.size} of ${employees.length} employees assigned, ${unassigned.length} unassigned, ${offToday.length} off`,
  )
  lines.push(
    `- Acknowledgments: ${ackedEmployees.length} of ${assignedIds.size} assigned employees fully confirmed`,
  )

  if (unfilled.length > 0) {
    lines.push('')
    lines.push('!! JOBS NOT FULLY STAFFED')
    for (const j of unfilled) {
      const bits = [j.startTime && `at ${j.startTime}`, j.address].filter(Boolean).join(', ')
      lines.push(`- ${j.name}${bits ? ` (${bits})` : ''}: ${crewCount(j.id)}/${j.crewNeeded} filled`)
    }
  }

  if (unacked.length > 0) {
    lines.push('')
    lines.push('!! AWAITING ACKNOWLEDGMENT')
    for (const a of unacked) {
      const employee = employeeById.get(a.employeeId)
      const job = jobs.find((j) => j.id === a.jobId)
      if (!employee || !job) continue
      lines.push(`- ${employee.name} — ${job.name}${employee.phone ? '' : ' (no phone on file)'}`)
    }
  }

  if (unassigned.length > 0) {
    lines.push('')
    lines.push('UNASSIGNED EMPLOYEES')
    for (const e of unassigned) {
      lines.push(`- ${e.name}${e.role ? ` (${e.role})` : ''}`)
    }
  }

  if (offToday.length > 0) {
    lines.push('')
    lines.push('OFF TODAY')
    for (const e of offToday) {
      lines.push(`- ${e.name}${e.role ? ` (${e.role})` : ''}`)
    }
  }

  const healthy = jobs.filter((j) => crewCount(j.id) >= j.crewNeeded)
  if (healthy.length > 0) {
    lines.push('')
    lines.push('FULLY STAFFED')
    for (const j of healthy) {
      const crew = dayAssignments
        .filter((a) => a.jobId === j.id)
        .map((a) => {
          const e = employeeById.get(a.employeeId)
          return e ? `${e.name}${a.acknowledged ? ' [confirmed]' : ''}` : ''
        })
        .filter(Boolean)
        .join(', ')
      lines.push(`- ${j.name}: ${crew}`)
    }
  }

  const alerts = unfilled.length + unacked.length
  const subject = `EZ Schedule ${formatDisplay(date)} — ${
    alerts === 0 ? 'all clear' : `${unfilled.length} unfilled, ${unacked.length} unconfirmed`
  }`
  return { subject, body: lines.join('\n') }
}
