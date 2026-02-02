import { env } from './env.ts'
import { trimTrailingSlash, toISOString, calculateAge } from './utils/index.ts'
import { findPatientByContact } from './models/patient.ts'
import { getTasksForPatient } from './models/task.ts'
import { getDoctorsByIds } from './models/doctor.ts'
import {
  buildDocumentBuckets,
  getDocumentsForTasks,
  SanitizedDocument,
} from './models/document.ts'
import { getLatestIntakesByTaskIds } from './models/intake.ts'
import { getLatestAppointmentsByTaskIds } from './models/appointment.ts'

const MIN_LIMIT = 1
const MAX_LIMIT = 25

type TaskDetailsSuccess = {
  patient: Record<string, unknown>
  tasks: Record<string, unknown>[]
  links: {
    patientPortal: {
      login: null
      medicalRecord: null
      driversLicense: null
      consent: null
      profile: null
    }
    carePortalPatient: string | null
  }
}

export type TaskDetailsResult =
  | {
      success: true
      data: TaskDetailsSuccess
    }
  | {
      success: false
      error: string
      status?: number
    }

function clampLimit(value: number): number {
  if (Number.isNaN(value)) {
    return MIN_LIMIT
  }
  return Math.min(Math.max(value, MIN_LIMIT), MAX_LIMIT)
}

export async function fetchTaskDetailsByContact({
  email,
  phone,
  limit = 10,
}: {
  email?: string | null
  phone?: string | null
  limit?: number
}): Promise<TaskDetailsResult> {
  if (!email && !phone) {
    return {
      success: false,
      error: 'Email or phone is required to fetch task details',
      status: 400,
    }
  }

  try {
    const enforcedLimit = clampLimit(limit)
    const patientRecord = await findPatientByContact({ email, phone })
    if (!patientRecord) {
      return {
        success: false,
        error: 'Patient not found for the provided criteria',
        status: 404,
      }
    }

    const tasksResult = await getTasksForPatient(patientRecord.id, enforcedLimit)
    if (!tasksResult.length) {
      return {
        success: false,
        error: 'No tasks found for the given criteria',
        status: 404,
      }
    }

    const taskIds = tasksResult.map((task) => task.id)
    const fallbackTaskId = taskIds[0] ?? null
    const doctorIds = Array.from(
      new Set(
        tasksResult
          .map((task) => task.doctorId)
          .filter(
            (id): id is number => typeof id === 'number' && !Number.isNaN(id)
          )
      )
    )

    const doctorById = await getDoctorsByIds(doctorIds)
    const intakeMap = await getLatestIntakesByTaskIds(taskIds)
    const appointmentMap = await getLatestAppointmentsByTaskIds(taskIds)
    const sanitizedDocuments = await getDocumentsForTasks(
      taskIds,
      patientRecord.id,
      doctorIds
    )

    const documentsByTask = sanitizedDocuments.reduce<
      Record<number, SanitizedDocument[]>
    >((acc, doc) => {
      const targetTaskId = doc.taskId ?? fallbackTaskId
      if (!targetTaskId) {
        return acc
      }
      if (!acc[targetTaskId]) {
        acc[targetTaskId] = []
      }
      acc[targetTaskId].push(doc)
      return acc
    }, {})

    const carePortalBase = trimTrailingSlash(env.APP_URL)

    const tasksWithDetails = tasksResult.map((task) => {
      const intakeRecord = intakeMap.get(task.id) ?? null
      const intakeStatus =
        intakeRecord?.status ??
        (intakeRecord?.completed_at
          ? 'completed'
          : intakeRecord
          ? 'pending'
          : null)
      const docBuckets = buildDocumentBuckets(documentsByTask[task.id] ?? [])
      const appointmentRecord = appointmentMap.get(task.id) ?? null
      const doctorRecord =
        typeof task.doctorId === 'number' && !Number.isNaN(task.doctorId)
          ? doctorById.get(task.doctorId) ?? null
          : null
      const doctorInfo = {
        id: doctorRecord?.id ?? task.doctorId ?? null,
        firstName: doctorRecord?.firstName ?? null,
        middleName: doctorRecord?.middleName ?? null,
        lastName: doctorRecord?.lastName ?? null,
        phoneNumber: doctorRecord?.phoneNumber ?? null,
        profilePicture: doctorRecord?.profilePicture ?? null,
        credentials: doctorRecord?.credentials ?? null,
        npiNumber: doctorRecord?.npiNumber ?? null,
        state: doctorRecord?.state ?? null,
        city: doctorRecord?.city ?? null,
        country: doctorRecord?.country ?? null,
        timezone: doctorRecord?.timezone ?? null,
        isActive: doctorRecord?.isActive ?? null,
      }
      const doctorNameParts = [
        doctorRecord?.firstName,
        doctorRecord?.middleName,
        doctorRecord?.lastName,
      ].filter(Boolean)
      const doctorName = doctorNameParts.length
        ? doctorNameParts.join(' ')
        : null

      const appointment = appointmentRecord
        ? {
            startAt: toISOString(appointmentRecord.start_at),
            endAt: toISOString(appointmentRecord.end_at),
            status: appointmentRecord.status ?? null,
            link: appointmentRecord.link ?? null,
          }
        : null

      return {
        taskId: task.id,
        code: task.code,
        taskType: task.type ?? null,
        taskTag: task.tag ?? null,
        doctorId: task.doctorId ?? null,
        doctor: doctorInfo,
        doctor_name: doctorName ?? null,
        requiresAppointment: Boolean(task.requiresAppointment),
        startDate: toISOString(task.startDate),
        status: task.status,
        completed: Boolean(
          task.completedDate || task.status?.toLowerCase() === 'completed'
        ),
        paymentStatus: task.paymentStatus ?? null,
        paymentAmount: task.amount ?? task.totalAmount ?? null,
        totalAmount: task.totalAmount ?? null,
        providerReviewed: Boolean(task.providerIsReviewed),
        providerReview: {
          isReviewed: Boolean(task.providerIsReviewed),
          declineReason: task.providerDeclineReason ?? null,
          declineNotes: task.providerDeclineNotes ?? null,
        },
        adminReview: {
          isReviewed: Boolean(task.isReviewed),
          reviewedAt: toISOString(task.reviewedAt),
          reviewedBy: task.reviewedBy ?? null,
          declineReason: task.adminDeclineReason ?? null,
          declineNotes: task.adminDeclineNotes ?? null,
        },
        declineReason:
          task.providerDeclineReason ?? task.adminDeclineReason ?? null,
        labels: task.labels ?? [],
        createdAt: toISOString(task.createdAt),
        dueDate: toISOString(task.dueDate),
        isAssigned: Boolean(task.isAssigned),
        intakeStatus,
        intake: {
          status: intakeStatus,
          submitted: Boolean(intakeRecord),
          isCompleted: Boolean(intakeRecord?.completed_at),
          lastStep: intakeRecord?.last_step ?? null,
          tag: intakeRecord?.tag ?? null,
          completedAt: toISOString(intakeRecord?.completed_at),
          createdAt: toISOString(intakeRecord?.created_at),
        },
        appointment,
        appointmentStartTime: toISOString(appointmentRecord?.start_at),
        postProcessing: {
          required: Boolean(task.requiresPostProcessing),
          completedAt: toISOString(task.completedPostProcessingAt),
        },
        aiStatus: task.aiMedicalAnalysisStatus ?? null,
        aiStatusGeneratedAt: toISOString(task.aiMedicalAnalysisGeneratedAt),
        medicalContext: task.aiMedicalAnalysisResult ?? null,
      trackingParams: task.tracking_params ?? null,
        links: {
          carePortalTask:
            carePortalBase && task.id
              ? `${carePortalBase}/admin/tasks/${task.id}`
              : null,
        },
        documents: {
          permit: docBuckets.permit,
          prescription: docBuckets.prescription,
          coverLetter: docBuckets.coverLetter,
          envelope: docBuckets.envelope,
          physicianCertificate: docBuckets.physicianCertificate,
          other: docBuckets.other,
        },
      }
    })

    const patientDob =
      patientRecord.dob instanceof Date
        ? patientRecord.dob
        : patientRecord.dob
        ? new Date(patientRecord.dob)
        : null

    const normalizedPatient = {
      ...patientRecord,
      dob: toISOString(patientDob),
      age: calculateAge(patientDob),
      first_name:
        (patientRecord as Record<string, unknown>).first_name ??
        patientRecord.firstName ??
        null,
      last_name:
        (patientRecord as Record<string, unknown>).last_name ??
        patientRecord.lastName ??
        null,
      phone: (patientRecord as Record<string, unknown>).phone ?? null,
      email: patientRecord.email ?? null,
      city: (patientRecord as Record<string, unknown>).city ?? null,
      state: (patientRecord as Record<string, unknown>).state ?? null,
    }

    const patientLink = patientRecord.id
      ? `${carePortalBase}/admin/patients/${patientRecord.id}/edit`
      : null

    return {
      success: true,
      data: {
        patient: normalizedPatient,
        tasks: tasksWithDetails,
        links: {
          patientPortal: {
            login: null,
            medicalRecord: null,
            driversLicense: null,
            consent: null,
            profile: null,
          },
          carePortalPatient: patientLink,
        },
      },
    }
  } catch (error) {
    console.error('Error fetching task details:', error)
    return {
      success: false,
      error: 'Unexpected server error',
      status: 500,
    }
  }
}
