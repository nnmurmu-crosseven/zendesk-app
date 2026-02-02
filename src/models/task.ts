import { db } from '../db/db.ts'
import { Tasks } from '../db/schema.ts'
import { desc, eq } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type TaskRecord = InferSelectModel<typeof Tasks>

export async function getTasksForPatient(
  patientId: number,
  limit = 10
): Promise<TaskRecord[]> {
  return db
    .select()
    .from(Tasks)
    .where(eq(Tasks.patientId, patientId))
    .orderBy(desc(Tasks.createdAt))
    .limit(limit)
}
