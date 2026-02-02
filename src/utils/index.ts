
const parseDate = (value: unknown): Date | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value as string)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date
}

export const toISOString = (value: unknown): string | null => {
  const date = parseDate(value)
  return date ? date.toISOString() : null
}

export const calculateAge = (dob?: Date | string | null): number | null => {
  const normalized = parseDate(dob)
  if (!normalized) return null
  const today = new Date()
  let age = today.getUTCFullYear() - normalized.getUTCFullYear()
  const monthDiff = today.getUTCMonth() - normalized.getUTCMonth()
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getUTCDate() < normalized.getUTCDate())
  ) {
    age -= 1
  }
  return age
}

export const trimTrailingSlash = (value?: string | null) =>
  value?.replace(/\/+$/, '') ?? ''
