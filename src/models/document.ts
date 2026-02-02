import { db } from '../db/db.ts'
import { Documents } from '../db/schema.ts'
import { and, eq, inArray } from 'drizzle-orm'

export const DOCUMENT_CATEGORY_TYPES: Record<string, string[]> = {
  permit: ['Placard', 'Parking Permit'],
  prescription: ['Prescription'],
  coverLetter: ['Cover Letter'],
  envelope: ['Envelope'],
  physicianCertificate: ['Physician Credentials'],
}

export type SanitizedDocument = {
  id: number
  name: string
  type: string
  subType: string | null
  tag: string | null
  url: string
  fileType: string
  taskId: number | null
  doctorId: number | null
}

export type DocumentCategoryKey =
  | 'permit'
  | 'prescription'
  | 'coverLetter'
  | 'envelope'
  | 'physicianCertificate'

export type DocumentBuckets = Record<
  DocumentCategoryKey | 'other',
  SanitizedDocument[]
>

export function buildDocumentBuckets(
  documents: SanitizedDocument[]
): DocumentBuckets {
  const buckets: DocumentBuckets = {
    permit: [],
    prescription: [],
    coverLetter: [],
    envelope: [],
    physicianCertificate: [],
    other: [],
  }
  const bucketKeys: DocumentCategoryKey[] = [
    'permit',
    'prescription',
    'coverLetter',
    'envelope',
    'physicianCertificate',
  ]

  for (const document of documents) {
    const normalizedType = document.type?.toLowerCase().trim() ?? ''
    const bucketKey = bucketKeys.find((key) =>
      DOCUMENT_CATEGORY_TYPES[key].some(
        (candidate) => candidate.toLowerCase().trim() === normalizedType
      )
    )

    if (bucketKey) {
      buckets[bucketKey].push(document)
    } else {
      buckets.other.push(document)
    }
  }

  return buckets
}

export async function getDocumentsForTasks(
  taskIds: number[],
  patientId: number | null,
  doctorIds: number[]
): Promise<SanitizedDocument[]> {
  if (!taskIds.length || patientId == null) {
    return []
  }

  const conditions = [
    inArray(Documents.taskId, taskIds),
    eq(Documents.patientId, patientId),
  ]

  if (doctorIds.length) {
    conditions.push(inArray(Documents.doctorId, doctorIds))
  }

  const rows = await db
    .select({
      id: Documents.id,
      name: Documents.name,
      type: Documents.type,
      sub_type: Documents.subType,
      tag: Documents.tag,
      url: Documents.url,
      file_type: Documents.fileType,
      task_id: Documents.taskId,
      doctor_id: Documents.doctorId,
    })
    .from(Documents)
    .where(and(...conditions))

  return rows.map(serializeDocument)
}

type DocumentRow = {
  id: number
  name: string
  type: string
  sub_type: string | null
  tag: string | null
  url: string
  file_type: string
  task_id: number | null
  doctor_id: number | null
}

function serializeDocument(row: DocumentRow): SanitizedDocument {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    subType: row.sub_type ?? null,
    tag: row.tag ?? null,
    url: row.url,
    fileType: row.file_type,
    taskId: row.task_id ?? null,
    doctorId: row.doctor_id ?? null,
  }
}
