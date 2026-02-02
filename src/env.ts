import 'dotenv/config'

const appUrl = process.env.APP_URL ?? ''

export const env = {
  PORT: Number(process.env.PORT || 3002),
  DATABASE_URL: process.env.DATABASE_URL!,
  ZENDESK_API_KEY: process.env.ZENDESK_API_KEY!,
  EXTENSION_TASK_API_KEY:
    process.env.EXTENSION_TASK_API_KEY ?? process.env.ZENDESK_API_KEY!,
  APP_URL: appUrl,
  APP_NAME: process.env.APP_NAME ?? 'Zendesk App',
}
