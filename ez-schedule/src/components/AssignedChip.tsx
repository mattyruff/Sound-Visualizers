import type { Employee } from '../types'

interface Props {
  employee: Employee
  onUnassign: () => void
}

export function AssignedChip({ employee, onUnassign }: Props) {
  return (
    <span className="group flex items-center gap-1.5 rounded-full border border-red-600 bg-red-500 py-1 pr-1 pl-3 text-sm font-medium text-white shadow-sm">
      {employee.name}
      <button
        type="button"
        onClick={onUnassign}
        className="flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-xs leading-none hover:bg-black/40"
        aria-label={`Unassign ${employee.name}`}
        title="Unassign"
      >
        ×
      </button>
    </span>
  )
}
