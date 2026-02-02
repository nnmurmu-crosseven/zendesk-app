export const TaskCard = ({ task }: { task: Record<string, any> }) => {
  const taskTypeLabel = [task.taskType, task.taskTag].filter(Boolean).join(" • ")
  const aiLabel = task.aiStatus ?? "Unknown"
  const doctorName = [task.doctor?.firstName, task.doctor?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim()

  const requiresAppointment = Boolean(task.requiresAppointment)

  const normalizedStatus = task.status ?? "Unknown"
  const missedAppt =
    normalizedStatus.toLowerCase().includes("missed") ||
    normalizedStatus.toLowerCase().includes("no show")

  return (
    <div class="card task-card">
      <div class="card-header">
        <span class="tag-pill">{taskTypeLabel || "Task"}</span>
        <span
          class={`flow-pill flow-pill--${requiresAppointment ? "sync" : "async"}`}
        >
          {requiresAppointment ? "Sync" : "Async"}
        </span>
      </div>

      <div class="card-content">
        <div class="task-grid">
          <div>
            <div class="label">Status</div>
            <div class="value">{normalizedStatus}</div>
          </div>
          <div class="text-right">
            <div class="label">Doctor</div>
            <div class="value">
              {doctorName ? `Dr. ${doctorName}` : "Unassigned"}
            </div>
          </div>
        </div>

        <div class="alert-grid">
          <div>
            <div class="label">AI Status</div>
            <span class="badge ai-badge">{aiLabel}</span>
          </div>
          <div class="text-right">
            <div class="label">Missed Appt</div>
            <div class="alert-val">{missedAppt ? "Yes" : "No"}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
