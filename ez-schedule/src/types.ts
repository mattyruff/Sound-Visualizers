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
}

export interface ScheduleState {
  employees: Employee[]
  jobs: Job[]
  assignments: Assignment[]
}
