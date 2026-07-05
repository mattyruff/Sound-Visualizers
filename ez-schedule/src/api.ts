import type { Assignment, Employee, Job, ScheduleState } from './types'

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
  getState: () => request<ScheduleState>('/state'),

  createEmployee: (input: { name: string; role: string }) =>
    request<Employee>('/employees', { method: 'POST', body: JSON.stringify(input) }),

  deleteEmployee: (id: string) => request<void>(`/employees/${id}`, { method: 'DELETE' }),

  createJob: (input: Omit<Job, 'id'>) =>
    request<Job>('/jobs', { method: 'POST', body: JSON.stringify(input) }),

  deleteJob: (id: string) => request<void>(`/jobs/${id}`, { method: 'DELETE' }),

  assign: (jobId: string, employeeId: string) =>
    request<Assignment>('/assignments', {
      method: 'POST',
      body: JSON.stringify({ jobId, employeeId }),
    }),

  unassign: (assignmentId: string) =>
    request<void>(`/assignments/${assignmentId}`, { method: 'DELETE' }),
}
