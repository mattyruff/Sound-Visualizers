import { useState } from 'react'
import type { Employee, TimeOffRange } from '../types'
import { EmployeeBubble } from './EmployeeBubble'
import { formatTimeOffRange } from '../timeOff'

export interface EmployeeInput {
  name: string
  role: string
  phone: string
  timeOff: TimeOffRange[]
}

interface Props {
  employees: Employee[]
  assignedEmployeeIds: Set<string>
  offEmployeeIds: Set<string>
  acknowledgedEmployeeIds: Set<string>
  jobCountByEmployee: Map<string, number>
  onAdd: (input: EmployeeInput) => void
  onUpdate: (id: string, input: EmployeeInput) => void
  onRemove: (id: string) => void
}

const emptyForm: EmployeeInput = { name: '', role: '', phone: '', timeOff: [] }

export function EmployeeRail({
  employees,
  assignedEmployeeIds,
  offEmployeeIds,
  acknowledgedEmployeeIds,
  jobCountByEmployee,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null) // null = closed, '' = adding
  const [form, setForm] = useState<EmployeeInput>(emptyForm)
  const [offFrom, setOffFrom] = useState('')
  const [offTo, setOffTo] = useState('')

  const formOpen = editingId !== null

  function openAdd() {
    setForm(emptyForm)
    setOffFrom('')
    setOffTo('')
    setEditingId('')
  }

  function openEdit(employee: Employee) {
    setForm({
      name: employee.name,
      role: employee.role,
      phone: employee.phone,
      timeOff: employee.timeOff,
    })
    setOffFrom('')
    setOffTo('')
    setEditingId(employee.id)
  }

  function addTimeOff() {
    if (!offFrom) return
    const to = offTo && offTo >= offFrom ? offTo : offFrom
    const range: TimeOffRange = { id: crypto.randomUUID(), from: offFrom, to }
    setForm((f) => ({ ...f, timeOff: [...f.timeOff, range] }))
    setOffFrom('')
    setOffTo('')
  }

  function removeTimeOff(id: string) {
    setForm((f) => ({ ...f, timeOff: f.timeOff.filter((r) => r.id !== id) }))
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

  const isOffHere = (e: Employee) => offEmployeeIds.has(e.id)
  const available = employees.filter((e) => !assignedEmployeeIds.has(e.id) && !isOffHere(e))
  const assigned = employees.filter((e) => assignedEmployeeIds.has(e.id))
  const off = employees.filter((e) => !assignedEmployeeIds.has(e.id) && isOffHere(e))

  const groups: { list: Employee[]; isAssigned: boolean; isOff: boolean }[] = [
    { list: available, isAssigned: false, isOff: false },
    { list: assigned, isAssigned: true, isOff: false },
    { list: off, isAssigned: false, isOff: true },
  ].filter((g) => g.list.length > 0)

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

          <div className="flex flex-col gap-1.5 rounded border border-slate-200 p-2 dark:border-slate-700">
            <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Days off
            </span>
            {form.timeOff.length > 0 && (
              <span className="flex flex-wrap gap-1">
                {form.timeOff.map((range) => (
                  <span
                    key={range.id}
                    className="flex items-center gap-1 rounded-full bg-slate-200 py-0.5 pr-1 pl-2 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                  >
                    {formatTimeOffRange(range)}
                    <button
                      type="button"
                      onClick={() => removeTimeOff(range.id)}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-black/15 text-[10px] leading-none hover:bg-black/30"
                      aria-label={`Remove day off ${formatTimeOffRange(range)}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </span>
            )}
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={offFrom}
                onChange={(e) => setOffFrom(e.target.value)}
                aria-label="Day off from"
                className="min-w-0 flex-1 rounded border border-slate-300 px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={offTo}
                onChange={(e) => setOffTo(e.target.value)}
                aria-label="Day off to (optional)"
                className="min-w-0 flex-1 rounded border border-slate-300 px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={addTimeOff}
                disabled={!offFrom}
                className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-40 dark:bg-slate-200 dark:text-slate-900"
              >
                Add
              </button>
            </div>
            <span className="text-[10px] text-slate-400">
              Single day: leave "to" empty. Save changes to apply.
            </span>
          </div>

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
        {groups.map((group, i) => (
          <div key={i} className="contents">
            {i > 0 && (
              <div className="mx-1 border-l border-slate-200 sm:mx-0 sm:my-1 sm:border-t sm:border-l-0 dark:border-slate-800" />
            )}
            {group.list.map((employee) => (
              <EmployeeBubble
                key={employee.id}
                employee={employee}
                isAssigned={group.isAssigned}
                isOff={isOffHere(employee)}
                acknowledged={acknowledgedEmployeeIds.has(employee.id)}
                jobCount={jobCountByEmployee.get(employee.id) ?? 0}
                onEdit={() => openEdit(employee)}
                onRemove={() => onRemove(employee.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}
