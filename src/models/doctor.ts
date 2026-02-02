import { db } from '../db/db.ts'
import { Doctors } from '../db/schema.ts'
import { inArray } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type DoctorRecord = InferSelectModel<typeof Doctors>

export async function getDoctorsByIds(
  ids: number[]
): Promise<Map<number, DoctorRecord>> {
  if (!ids.length) {
    return new Map()
  }
  const rows = await db
    .select()
    .from(Doctors)
    .where(inArray(Doctors.id, ids))
  return new Map(rows.map((row) => [row.id, row]))
}
