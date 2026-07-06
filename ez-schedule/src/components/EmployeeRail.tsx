import { useState } from 'react'
import type { Employee } from '../types'
import { EmployeeBubble } from './EmployeeBubble'

export interface EmployeeInput {
  name: string
  role: string
  phone: string
}

interface Props {
  employees: Employee[]
  assignedEmployeeIds: Set<string>
  acknowledgedEmployeeIds: Set<string>
  jobCountByEmployee: Map<string, number>
  onAdd: (input: EmployeeInput) => void
  onUpdate: (id: string, input: EmployeeInput) => void
  onRemove: (id: string) => void
}

const emptyForm: EmployeeInput = { name: '', role: '', phone: '' }

export function EmployeeRail({
  employees,
  assignedEmployeeIds,
  acknowledgedEmployeeIds,
  jobCountByEmployee,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null) // null = closed, '' = adding
  const [form, setForm] = useState<EmployeeInput>(emptyForm)

  const formOpen = editingId !== null

  function openAdd() {
    setForm(emptyForm)
    setEditingId('')
  }

  function openEdit(employee: Employee) {
    setForm({ name: employee.name, role: employee.role, phone: employee.phone })
    setEditingId(employee.id)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editingId) {
      onUpdate(editingId, form)
    } else {
      onAdd(form)
    }
    setForm(emptyForm)
    setEditingId(null)
  }

  const available = employees.filter((e) => !assignedEmployeeIds.has(e.id))
  const assigned = employees.filter((e) => assignedEmployeeIds.has(e.id))

  return (
    <aside className="flex w-full flex-none flex-col gap-3 border-b border-slate-200 bg-slate-50 p-3 sm:w-72 sm:gap-4 sm:border-r sm:border-b-0 sm:p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Employees
        </h2>
        <button
          type="button"
          onClick={() => (formOpen ? setEditingId(null) : openAdd())}
          className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {formOpen ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="Role (optional)"
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Phone (optional)"
            className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            type="submit"
            className="rounded bg-emerald-600 px-2 py-1 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {editingId ? 'Save changes' : 'Add employee'}
          </button>
        </form>
      )}

      <div className="flex flex-row gap-2 overflow-x-auto pb-1 sm:flex-1 sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:pb-0">
        {employees.length === 0 && (
          <p className="text-sm text-slate-400">No employees yet — add your first one above.</p>
        )}
        {available.map((employee) => (
          <EmployeeBubble
            key={employee.id}
            employee={employee}
            isAssigned={false}
            acknowledged={false}
            jobCount={0}
            onEdit={() => openEdit(employee)}
            onRemove={() => onRemove(employee.id)}
          />
        ))}
        {assigned.length > 0 && available.length > 0 && (
          <div className="mx-1 border-l border-slate-200 sm:mx-0 sm:my-1 sm:border-t sm:border-l-0 dark:border-slate-800" />
        )}
        {assigned.map((employee) => (
          <EmployeeBubble
            key={employee.id}
            employee={employee}
            isAssigned={true}
            acknowledged={acknowledgedEmployeeIds.has(employee.id)}
            jobCount={jobCountByEmployee.get(employee.id) ?? 1}
            onEdit={() => openEdit(employee)}
            onRemove={() => onRemove(employee.id)}
          />
        ))}
      </div>
    </aside>
  )
}
