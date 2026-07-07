import { nanoid } from 'nanoid'
import { todayISO } from './dateUtils'
import type { Assignment, Employee, Job, ScheduleState, Settings, TimeOffRange } from './types'

// Browser-storage backend used when the local Express server isn't
// reachable (e.g. the static GitHub Pages build). Same contract as the
// REST API in api.ts.

const LS_KEY = 'ez-schedule-data'

function seedData(): ScheduleState {
  const today = todayISO()
  return {
    employees: [
      { id: nanoid(), name: 'Alex Rivera', role: 'Electrician', phone: '', timeOff: [] },
      { id: nanoid(), name: 'Sam Chen', role: 'Driver', phone: '', timeOff: [] },
      { id: nanoid(), name: 'Jordan Blake', role: 'Laborer', phone: '', timeOff: [] },
      { id: nanoid(), name: 'Casey Nguyen', role: 'Foreman', phone: '', timeOff: [] },
      { id: nanoid(), name: 'Morgan Diaz', role: 'Laborer', phone: '', timeOff: [] },
    ],
    jobs: [
      {
        id: nanoid(),
        date: today,
        name: 'Riverside Remodel',
        client: 'Thompson Residence',
        address: '412 Riverside Dr',
        startTime: '08:00',
        crewNeeded: 2,
        notes: '',
      },
      {
        id: nanoid(),
        date: today,
        name: 'Oak St Rewire',
        client: 'Oak St Office',
        address: '88 Oak St',
        startTime: '09:30',
        crewNeeded: 1,
        notes: '',
      },
      {
        id: nanoid(),
        date: today,
        name: 'Warehouse Delivery',
        client: 'Northgate Logistics',
        address: '1200 Industrial Pkwy',
        startTime: '07:00',
        crewNeeded: 1,
        notes: '',
      },
    ],
    assignments: [],
    settings: defaultSettings(),
  }
}

function defaultSettings(): Settings {
  return { reportEmails: [], reportTime: '17:00', reportEnabled: false }
}

function load(): ScheduleState {
  const raw = localStorage.getItem(LS_KEY)
  if (!raw) {
    const state = seedData()
    save(state)
    return state
  }
  const state = JSON.parse(raw) as ScheduleState
  // migrate records saved before newer fields existed
  for (const e of state.employees) {
    if (e.phone === undefined) e.phone = ''
    if (!Array.isArray(e.timeOff)) e.timeOff = []
  }
  for (const a of state.assignments) {
    if (a.acknowledged === undefined) a.acknowledged = false
  }
  if (!state.settings) state.settings = defaultSettings()
  return state
}

function save(state: ScheduleState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state))
}

export const localStore = {
  async getState(): Promise<ScheduleState> {
    return load()
  },

  async createEmployee(input: {
    name: string
    role: string
    phone: string
    timeOff: TimeOffRange[]
  }): Promise<Employee> {
    const state = load()
    const employee: Employee = {
      id: nanoid(),
      name: input.name.trim(),
      role: input.role.trim(),
      phone: input.phone.trim(),
      timeOff: input.timeOff,
    }
    state.employees.push(employee)
    save(state)
    return employee
  },

  async updateEmployee(
    id: string,
    input: { name: string; role: string; phone: string; timeOff: TimeOffRange[] },
  ): Promise<Employee> {
    const state = load()
    const employee = state.employees.find((e) => e.id === id)
    if (!employee) throw new Error('employee not found')
    employee.name = input.name.trim()
    employee.role = input.role.trim()
    employee.phone = input.phone.trim()
    employee.timeOff = input.timeOff
    save(state)
    return employee
  },

  async deleteEmployee(id: string): Promise<void> {
    const state = load()
    state.employees = state.employees.filter((e) => e.id !== id)
    state.assignments = state.assignments.filter((a) => a.employeeId !== id)
    save(state)
  },

  async createJob(input: Omit<Job, 'id'>): Promise<Job> {
    const state = load()
    const job: Job = {
      ...input,
      id: nanoid(),
      name: input.name.trim(),
      crewNeeded: Math.min(20, Math.max(1, Number(input.crewNeeded) || 1)),
    }
    state.jobs.push(job)
    save(state)
    return job
  },

  async updateJob(id: string, input: Omit<Job, 'id'>): Promise<Job> {
    const state = load()
    const job = state.jobs.find((j) => j.id === id)
    if (!job) throw new Error('job not found')
    Object.assign(job, {
      ...input,
      name: input.name.trim(),
      crewNeeded: Math.min(20, Math.max(1, Number(input.crewNeeded) || 1)),
    })
    save(state)
    return job
  },

  async duplicateJob(
    id: string,
    dates: string[],
    includeCrew: boolean,
  ): Promise<{ jobs: Job[]; assignments: Assignment[] }> {
    const state = load()
    const source = state.jobs.find((j) => j.id === id)
    if (!source) throw new Error('job not found')
    const crew = includeCrew
      ? state.assignments.filter((a) => a.jobId === id).map((a) => a.employeeId)
      : []
    const jobs: Job[] = []
    const assignments: Assignment[] = []
    for (const date of dates) {
      const job: Job = { ...source, id: nanoid(), date }
      state.jobs.push(job)
      jobs.push(job)
      for (const employeeId of crew) {
        const assignment: Assignment = {
          id: nanoid(),
          jobId: job.id,
          employeeId,
          acknowledged: false,
        }
        state.assignments.push(assignment)
        assignments.push(assignment)
      }
    }
    save(state)
    return { jobs, assignments }
  },

  async deleteJob(id: string): Promise<void> {
    const state = load()
    state.jobs = state.jobs.filter((j) => j.id !== id)
    state.assignments = state.assignments.filter((a) => a.jobId !== id)
    save(state)
  },

  async assign(jobId: string, employeeId: string): Promise<Assignment> {
    const state = load()
    const job = state.jobs.find((j) => j.id === jobId)
    if (!job) throw new Error('job not found')
    const existing = state.assignments.find(
      (a) => a.jobId === jobId && a.employeeId === employeeId,
    )
    if (existing) return existing
    const currentCrew = state.assignments.filter((a) => a.jobId === jobId).length
    if (currentCrew >= job.crewNeeded) throw new Error('job is fully staffed')
    const assignment: Assignment = { id: nanoid(), jobId, employeeId, acknowledged: false }
    state.assignments.push(assignment)
    save(state)
    return assignment
  },

  async setAcknowledged(assignmentId: string, acknowledged: boolean): Promise<Assignment> {
    const state = load()
    const assignment = state.assignments.find((a) => a.id === assignmentId)
    if (!assignment) throw new Error('assignment not found')
    assignment.acknowledged = acknowledged
    save(state)
    return assignment
  },

  async updateSettings(input: Settings): Promise<Settings> {
    const state = load()
    state.settings = {
      reportEmails: input.reportEmails.map((e) => e.trim()).filter(Boolean),
      reportTime: input.reportTime,
      reportEnabled: input.reportEnabled,
    }
    save(state)
    return state.settings
  },

  async unassign(assignmentId: string): Promise<void> {
    const state = load()
    state.assignments = state.assignments.filter((a) => a.id !== assignmentId)
    save(state)
  },
}
