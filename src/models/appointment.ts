import { db } from '../db/db.ts'
import { appointments } from '../db/schema.ts'
import { desc, inArray } from 'drizzle-orm'

export type AppointmentRow = {
  id: number
  task_id: number
  start_at: Date | null
  end_at: Date | null
  status: string | null
  link: string | null
}

export async function getLatestAppointmentsByTaskIds(
  taskIds: number[]
): Promise<Map<number, AppointmentRow>> {
  if (!taskIds.length) {
    return new Map()
  }
  const rows = await db
    .select({
      id: appointments.id,
      task_id: appointments.taskId,
      start_at: appointments.startAt,
      end_at: appointments.endAt,
      status: appointments.status,
      link: appointments.link,
    })
    .from(appointments)
    .where(inArray(appointments.taskId, taskIds))
    .orderBy(desc(appointments.startAt))

  const appointmentMap = new Map<number, AppointmentRow>()
  for (const row of rows) {
    if (row.task_id && !appointmentMap.has(row.task_id)) {
      appointmentMap.set(row.task_id, row)
    }
  }
  return appointmentMap
}
