export interface Employee {
  id: string
  name: string
  role: string
  phone: string
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

export interface ScheduleState {
  employees: Employee[]
  jobs: Job[]
  assignments: Assignment[]
}
