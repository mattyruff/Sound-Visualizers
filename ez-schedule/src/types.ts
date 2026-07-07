// inclusive date range an employee is off work; a single day off has
// from === to
export interface TimeOffRange {
  id: string
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
}

export interface Employee {
  id: string
  name: string
  role: string
  phone: string
  timeOff: TimeOffRange[]
}

export interface Job {
  id: string
  date: string // YYYY-MM-DD
  name: string
  client: string
  address: string
  startTime: string
  crewNeeded: number
  notes: string
}

export interface Assignment {
  id: string
  jobId: string
  employeeId: string
  // set once the employee confirms they've seen the assignment (manual
  // toggle by the office, or automatically via SMS reply webhook)
  acknowledged: boolean
}

export interface Settings {
  // manager email addresses that receive the daily status report
  reportEmails: string[]
  // HH:MM 24h local time the scheduled report goes out
  reportTime: string
  reportEnabled: boolean
}

export interface ScheduleState {
  employees: Employee[]
  jobs: Job[]
  assignments: Assignment[]
  settings: Settings
}
