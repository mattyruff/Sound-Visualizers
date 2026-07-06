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

  createEmployee: (input: { name: string; role: string; phone: string }): Promise<Employee> =>
    useLocal
      ? localStore.createEmployee(input)
      : request<Employee>('/employees', { method: 'POST', body: JSON.stringify(input) }),

  updateEmployee: (
    id: string,
    input: { name: string; role: string; phone: string },
  ): Promise<Employee> =>
    useLocal
      ? localStore.updateEmployee(id, input)
      : request<Employee>(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  deleteEmployee: (id: string): Promise<void> =>
    useLocal
      ? localStore.deleteEmployee(id)
      : request<void>(`/employees/${id}`, { method: 'DELETE' }),

  // mass-text via the local server's Twilio integration; unavailable in
  // the static (localStorage) build where there's no server to send from
  sendTexts: (messages: { to: string; body: string }[]): Promise<{ results: { to: string; ok: boolean }[] }> =>
    useLocal
      ? Promise.reject(
          new Error(
            'Automatic sending needs the local server (npm run dev) with Twilio configured. Use the per-person Text buttons or Copy instead.',
          ),
        )
      : request('/notify', { method: 'POST', body: JSON.stringify({ messages }) }),

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

  setAcknowledged: (assignmentId: string, acknowledged: boolean): Promise<Assignment> =>
    useLocal
      ? localStore.setAcknowledged(assignmentId, acknowledged)
      : request<Assignment>(`/assignments/${assignmentId}`, {
          method: 'PATCH',
          body: JSON.stringify({ acknowledged }),
        }),
}
