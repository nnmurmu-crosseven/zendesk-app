import type { FC } from 'hono/jsx'
import { Layout } from './Layout.tsx'
import { Header } from './Header.tsx'
import { TaskCard } from './TaskCard.tsx'
import { PatientCard } from './PatientCard.tsx'
import { Documents } from './Documents.tsx'

export const TaskPage: FC<{ data: any }> = ({ data }) => {
  if (!data?.success) {
    return (
      <Layout>
        <div style="color:red">No patient found</div>
      </Layout>
    )
  }

  const payload = data.data ?? data
  const patient = payload?.patient ?? null
  const tasks = payload?.tasks ?? []
  if (!patient) {
    return (
      <Layout>
        <div style="color:red">No patient found</div>
      </Layout>
    )
  }
  const task = tasks[0]

  return (
      <Layout>
        <Header patient={patient} task={task} />

        <div class="card-grid card-grid--two">
          {task ? <TaskCard task={task} /> : null}
          <PatientCard patient={patient} />
        </div>

        {task && (
          <Documents
            documents={
              task.documents
                ? (Object.values(task.documents).flat() as Record<
                    string,
                    any
                  >[])
                : []
            }
          />
        )}
      </Layout>
  )
}
