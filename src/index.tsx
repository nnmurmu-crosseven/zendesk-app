import { Hono } from 'hono'
import { handle } from '@hono/node-server/vercel'

import { env } from './env.ts'
import { apiMiddleware } from './middleware/api-auth.ts'
import { TaskPage } from './pages/task/TaskPage.tsx'
import { fetchTaskDetailsByContact } from './taskDetails.ts'

const app = new Hono()

app.get('/assets/*', c => c.notFound())

app.get('/ping', c => {
  return c.json({
    msg: 'ping',
    date: new Date(),
    name: `PMD Zendesk ${env.APP_NAME}`,
  })
})

app.use(apiMiddleware).get('/', async (c) => {
  const email = c.req.query('email')
  const phone = c.req.query('phone')
  const limit = Number(c.req.query('limit') ?? '10')

  const result = await fetchTaskDetailsByContact({ email, phone, limit })
  if (!result.success) {
    return new Response(result.error ?? 'Unable to fetch patient data', {
      status: result.status ?? 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  return c.html(<TaskPage data={result} />)
})

// Important: Export the Vercel handler
export default handle(app)
