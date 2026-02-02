import { db } from '../db/db.ts'
import { patientIntakeForms } from '../db/schema.ts'
import { desc, inArray } from 'drizzle-orm'

export type IntakeFormRow = {
  task_id: number
  status: string | null
  last_step: string | null
  tag: string | null
  completed_at: Date | null
  created_at: Date | null
}

export async function getLatestIntakesByTaskIds(
  taskIds: number[]
): Promise<Map<number, IntakeFormRow>> {
  if (!taskIds.length) {
    return new Map()
  }
  const rows = await db
    .select({
      task_id: patientIntakeForms.taskId,
      status: patientIntakeForms.status,
      last_step: patientIntakeForms.lastStep,
      tag: patientIntakeForms.tag,
      completed_at: patientIntakeForms.completedAt,
      created_at: patientIntakeForms.createdAt,
    })
    .from(patientIntakeForms)
    .where(inArray(patientIntakeForms.taskId, taskIds))
    .orderBy(desc(patientIntakeForms.createdAt))

  const intakeMap = new Map<number, IntakeFormRow>()
  for (const row of rows) {
    if (!intakeMap.has(row.task_id)) {
      intakeMap.set(row.task_id, row)
    }
  }
  return intakeMap
}
