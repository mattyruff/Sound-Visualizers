import { useDraggable } from '@dnd-kit/core'
import type { Employee } from '../types'

interface Props {
  employee: Employee
  assignmentId: string
  jobId: string
  acknowledged: boolean
  onToggleAcknowledged: () => void
  onUnassign: () => void
}

export function AssignedChip({
  employee,
  assignmentId,
  jobId,
  acknowledged,
  onToggleAcknowledged,
  onUnassign,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip-${assignmentId}`,
    data: { type: 'chip', employeeId: employee.id, fromJobId: jobId, fromAssignmentId: assignmentId },
  })

  // chips stay green inside job cards — red is reserved for the rail
  // bubble that signals "this person is taken"
  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none' }}
      className={`flex cursor-grab items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-500 py-1 pr-1 pl-3 text-sm font-medium text-white shadow-sm select-none active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <span className="flex flex-col leading-tight">
        <span>
          {employee.name}
          {acknowledged && (
            <span className="ml-1 font-bold text-black" title="Acknowledged assignment">
              ✓
            </span>
          )}
        </span>
        {employee.role && <span className="text-xs font-normal text-white/80">{employee.role}</span>}
      </span>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onToggleAcknowledged}
        className={`flex h-5 w-5 items-center justify-center self-center rounded-full text-xs leading-none ${
          acknowledged
            ? 'bg-white text-black hover:bg-white/80'
            : 'bg-black/20 text-white/70 hover:bg-black/40'
        }`}
        aria-label={
          acknowledged
            ? `${employee.name} acknowledged — click to clear`
            : `Mark ${employee.name} as acknowledged`
        }
        title={acknowledged ? 'Acknowledged — click to clear' : 'Mark acknowledged'}
      >
        ✓
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onUnassign}
        className="flex h-5 w-5 items-center justify-center self-center rounded-full bg-black/20 text-xs leading-none hover:bg-black/40"
        aria-label={`Unassign ${employee.name}`}
        title="Unassign"
      >
        ×
      </button>
    </span>
  )
}
