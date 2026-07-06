import type { Assignment, Employee, Job, ScheduleState } from './types'
import { localStore } from './localStore'

// The app talks to the local Express server when it's running (npm run dev)
// and transparently falls back to browser localStorage when it isn't —
// which is how the static GitHub Pages build works.

let useLocal = false

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  async getState(): Promise<ScheduleState> {
    if (useLocal) return localStore.getState()
    try {
      return await request<ScheduleState>('/state')
    } catch {
      useLocal = true
      return localStore.getState()
    }
  },

  createEmployee: (input: { name: string; role: string }): Promise<Employee> =>
    useLocal
      ? localStore.createEmployee(input)
      : request<Employee>('/employees', { method: 'POST', body: JSON.stringify(input) }),

  deleteEmployee: (id: string): Promise<void> =>
    useLocal
      ? localStore.deleteEmployee(id)
      : request<void>(`/employees/${id}`, { method: 'DELETE' }),

  createJob: (input: Omit<Job, 'id'>): Promise<Job> =>
    useLocal
      ? localStore.createJob(input)
      : request<Job>('/jobs', { method: 'POST', body: JSON.stringify(input) }),

  deleteJob: (id: string): Promise<void> =>
    useLocal ? localStore.deleteJob(id) : request<void>(`/jobs/${id}`, { method: 'DELETE' }),

  assign: (jobId: string, employeeId: string): Promise<Assignment> =>
    useLocal
      ? localStore.assign(jobId, employeeId)
      : request<Assignment>('/assignments', {
          method: 'POST',
          body: JSON.stringify({ jobId, employeeId }),
        }),

  unassign: (assignmentId: string): Promise<void> =>
    useLocal
      ? localStore.unassign(assignmentId)
      : request<void>(`/assignments/${assignmentId}`, { method: 'DELETE' }),
}
