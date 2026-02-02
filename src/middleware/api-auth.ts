import type { Context, Next } from 'hono'

export const apiMiddleware = async (_: Context, next: Next) => {
  console.log('middleware 2 start')
  await next()
  console.log('middleware 2 end')
}
