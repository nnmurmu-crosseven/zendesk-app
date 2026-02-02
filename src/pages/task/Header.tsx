export const Header = ({
  patient,
  task,
}: {
  patient: Record<string, any>
  task?: Record<string, any> | null
}) => {
  const fullName = [patient.first_name, patient.last_name]
    .filter(Boolean)
    .join(" ")
  const taskCode = task?.code ? `#${task.code}` : "TASK"

  return (
    <div class="header">
      <h1 class="h-name">{fullName}</h1>
      <div class="h-meta">
        <span>{patient.age ?? "-"} Yrs</span>
        <span class="separator">|</span>
        <span>{patient.state ?? "Unknown"}</span>
        <span class="separator">|</span>
        <span class="id-badge">{taskCode}</span>
      </div>
    </div>
  )
}
