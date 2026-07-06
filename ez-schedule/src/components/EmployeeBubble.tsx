import { useDraggable } from '@dnd-kit/core'
import type { Employee } from '../types'

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

interface Props {
  employee: Employee
  isAssigned: boolean
  jobCount: number
  onRemove: () => void
}

export function EmployeeBubble({ employee, isAssigned, jobCount, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `employee-${employee.id}`,
    data: { type: 'employee', employeeId: employee.id },
  })

  // the dragged "copy" is rendered by the DragOverlay in App; the original
  // bubble stays in place, dimmed, while the clone follows the pointer/finger
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none' }}
      className={`group relative flex max-w-60 flex-none cursor-grab items-center gap-3 rounded-full border px-3 py-2 shadow-sm transition select-none active:cursor-grabbing sm:max-w-none ${
        isDragging ? 'opacity-40' : ''
      } ${
        isAssigned
          ? 'border-red-600 bg-red-500 text-white'
          : 'border-emerald-600 bg-emerald-500 text-white'
      }`}
    >
      <span className="relative flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
        {initials(employee.name)}
        {jobCount > 1 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-amber-950"
            title={`Booked on ${jobCount} jobs today`}
          >
            {jobCount}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{employee.name}</span>
        {employee.role && (
          <span className="block truncate text-xs text-white/80">{employee.role}</span>
        )}
      </span>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className="invisible flex h-5 w-5 flex-none items-center justify-center rounded-full bg-black/20 text-xs leading-none hover:bg-black/40 group-hover:visible"
        aria-label={`Remove ${employee.name}`}
        title="Remove employee"
      >
        ×
      </button>
    </div>
  )
}
