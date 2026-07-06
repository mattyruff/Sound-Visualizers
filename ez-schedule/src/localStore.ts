import { nanoid } from 'nanoid'
import { todayISO } from './dateUtils'
import type { Assignment, Employee, Job, ScheduleState } from './types'

// Browser-storage backend used when the local Express server isn't
// reachable (e.g. the static GitHub Pages build). Same contract as the
// REST API in api.ts.

const LS_KEY = 'ez-schedule-data'

function seedData(): ScheduleState {
  const today = todayISO()
  return {
    employees: [
      { id: nanoid(), name: 'Alex Rivera', role: 'Electrician' },
      { id: nanoid(), name: 'Sam Chen', role: 'Driver' },
      { id: nanoid(), name: 'Jordan Blake', role: 'Laborer' },
      { id: nanoid(), name: 'Casey Nguyen', role: 'Foreman' },
      { id: nanoid(), name: 'Morgan Diaz', role: 'Laborer' },
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
  }
}

function load(): ScheduleState {
  const raw = localStorage.getItem(LS_KEY)
  if (!raw) {
    const state = seedData()
    save(state)
    return state
  }
  return JSON.parse(raw) as ScheduleState
}

function save(state: ScheduleState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state))
}

export const localStore = {
  async getState(): Promise<ScheduleState> {
    return load()
  },

  async createEmployee(input: { name: string; role: string }): Promise<Employee> {
    const state = load()
    const employee: Employee = { id: nanoid(), name: input.name.trim(), role: input.role.trim() }
    state.employees.push(employee)
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
      crewNeeded: Math.max(1, Number(input.crewNeeded) || 1),
    }
    state.jobs.push(job)
    save(state)
    return job
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
    const assignment: Assignment = { id: nanoid(), jobId, employeeId }
    state.assignments.push(assignment)
    save(state)
    return assignment
  },

  async unassign(assignmentId: string): Promise<void> {
    const state = load()
    state.assignments = state.assignments.filter((a) => a.id !== assignmentId)
    save(state)
  },
}
