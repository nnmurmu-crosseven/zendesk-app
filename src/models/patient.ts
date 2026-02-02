import { db } from '../db/db.ts'
import { patients } from '../db/schema.ts'
import { desc, eq, or } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

export type PatientRecord = InferSelectModel<typeof patients>

export async function findPatientByContact({
  email,
  phone,
}: {
  email?: string | null
  phone?: string | null
}): Promise<PatientRecord | null> {
  const normalizedEmail = email?.trim()
  const normalizedPhone = phone?.trim()
  if (!normalizedEmail && !normalizedPhone) {
    return null
  }
  let whereClause
  if (normalizedEmail && normalizedPhone) {
    whereClause = or(
      eq(patients.email, normalizedEmail),
      eq(patients.phone, normalizedPhone)
    )
  } else if (normalizedEmail) {
    whereClause = eq(patients.email, normalizedEmail)
  } else if (normalizedPhone) {
    whereClause = eq(patients.phone, normalizedPhone)
  } else {
    return null
  }
  const [patient] = await db
    .select()
    .from(patients)
    .where(whereClause)
    .orderBy(desc(patients.createdAt))
    .limit(1)
  return patient ?? null
}
